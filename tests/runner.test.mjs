import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, validate, plan, inspect, PROVIDERS } from '../runner.mjs';

const proofs = ['docs/proofs/steve-jobs-to-lisa.json', 'docs/proofs/marshall-mathers-to-hailie.json'];

test('check reports key names only, never values', async () => {
  const secret = 'sk-test-value-that-must-not-leak';
  process.env.CARTESIA_API_KEY = secret;
  try {
    const result = await check();
    assert.equal(result.readyForFreeWork, true);
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.deepEqual(result.providerKeys.map(k => k.env), PROVIDERS.map(p => p.env));
    assert.equal(result.providerKeys.find(k => k.env === 'CARTESIA_API_KEY').present, true);
  } finally { delete process.env.CARTESIA_API_KEY; }
});

test('both proof inputs validate and plan into four 15-second beats without paid calls', async () => {
  for (const proof of proofs) {
    assert.equal((await validate(proof)).valid, true, proof);
    const p = await plan(proof);
    assert.equal(p.beats.length, 4);
    assert.deepEqual(p.beats.map(b => b.window), [[0, 15], [15, 30], [30, 45], [45, 60]]);
    assert.ok(p.beats.every(b => b.words <= 38), 'each draft beat fits a 15s window at natural pace (~2.5 words/s)');
    assert.equal(p.paidCalls.approvalRequired, true);
  }
  const [a, b] = await Promise.all(proofs.map(proof => plan(proof)));
  assert.notEqual(a.inputDigest, b.inputDigest);
});

test('invalid input is rejected before planning', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mps-invalid-'));
  try {
    const bad = JSON.parse(await readFile(proofs[0], 'utf8'));
    bad.audio.voiceCapture.durationSeconds = 5;
    const file = join(dir, 'bad.json');
    await (await import('node:fs/promises')).writeFile(file, JSON.stringify(bad));
    assert.equal((await validate(file)).valid, false);
    await assert.rejects(plan(file), /Invalid inputs/);
  } finally { await rm(dir, { recursive: true }); }
});

test('inspect writes the Repo Builder technical-media-inspection schema', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mps-inspect-'));
  try {
    const media = join(dir, 'tiny.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=30:d=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', media]);
    const report = await inspect(media, join(dir, 'report.json'));
    assert.equal(report.kind, 'technical-media-inspection');
    assert.equal(report.review.status, 'not-assessed');
    assert.equal(report.media.width, 160);
    assert.equal(report.media.hasAudio, true);
    await assert.rejects(inspect(media, join(dir, 'report.json')), /already exists/);
  } finally { await rm(dir, { recursive: true }); }
});
