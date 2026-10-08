// Paid provider calls for My Pixar Story (keyframe images + narration; AI video clips are produced
// separately with explicit approval and imported through `manifest`). There is no AI video call in this file. Keys come from process.env only and are never logged.
// Every call goes through a SpendLedger: estimate -> budget check -> intent written -> call -> job id saved -> result.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Published list prices used for estimates (re-check before quoting; billing is the provider's truth). */
export const RATES = {
  museImageUsd: 0.01, // Meta Muse Image 1.0, $0.01/image (dev.meta.ai/models/muse-image)
  cartesiaUsdPerChar: 0.00005, // Cartesia Sonic ~1 credit/char; Pro plan $5/100k credits => $0.05 per 1k chars
};
export const MUSE_URL = 'https://api.meta.ai/v1/images/generations';
export const CARTESIA_URL = 'https://api.cartesia.ai/tts/bytes';
export const CARTESIA_VERSION = '2025-04-16';

export function key(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set. Export it in your shell (never commit it) and re-run.`);
  return value;
}
const redact = (text, secret) => String(text).split(secret).join('[REDACTED]').slice(0, 600);

export class SpendLedger {
  constructor(path, maxUsd) { this.path = path; this.maxUsd = maxUsd; this.entries = []; }
  static async open(path, maxUsd) {
    if (!(maxUsd > 0)) throw new Error('Paid generation needs an explicit --max-usd approved by the user.');
    const ledger = new SpendLedger(path, maxUsd);
    try { ledger.entries = JSON.parse(await readFile(path, 'utf8')).entries ?? []; } catch {}
    return ledger;
  }
  get committedUsd() { return this.entries.filter(e => e.status !== 'failed-unbilled').reduce((s, e) => s + e.estimateUsd, 0); }
  async save() { await mkdir(dirname(this.path), { recursive: true }); await writeFile(this.path, JSON.stringify({ schemaVersion: 1, maxUsd: this.maxUsd, committedEstimateUsd: Number(this.committedUsd.toFixed(4)), rates: RATES, entries: this.entries }, null, 2)); }
  async begin(op) {
    const projected = this.committedUsd + op.estimateUsd;
    if (projected > this.maxUsd + 1e-9) throw new Error(`Budget stop: ${op.operation} (~$${op.estimateUsd.toFixed(3)}) would bring spend to ~$${projected.toFixed(3)}, over the approved $${this.maxUsd}.`);
    const attempts = this.entries.filter(e => e.step === op.step).length;
    if (attempts >= 3) throw new Error(`Attempt limit: ${op.step} already tried 3 times.`);
    const entry = { ...op, attempt: attempts + 1, status: 'started', startedAt: new Date().toISOString() };
    this.entries.push(entry); await this.save(); return entry;
  }
  async end(entry, patch) { Object.assign(entry, patch, { finishedAt: new Date().toISOString() }); await this.save(); return entry; }
  /** Returns a finished entry for this step so reruns reuse paid outputs instead of paying again. */
  done(step) { return this.entries.find(e => e.step === step && e.status === 'succeeded'); }
}

export async function museImage(ledger, { step, prompt, out }) {
  const previous = ledger.done(step); if (previous) return previous;
  const secret = key('META_API_KEY');
  const entry = await ledger.begin({ step, provider: 'Meta Muse', model: 'muse-image-1.0', operation: 'keyframe image (n=1)', estimateUsd: RATES.museImageUsd, promptSha256: sha(prompt) });
  try {
    const response = await fetch(MUSE_URL, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'muse-image-1.0', n: 1, size: '1344x768', prompt }), signal: AbortSignal.timeout(240000), redirect: 'error' });
    const requestId = response.headers.get('x-request-id');
    if (!response.ok) { await ledger.end(entry, { status: 'failed-unbilled', jobId: requestId, error: `HTTP ${response.status}: ${redact(await response.text(), secret)}` }); throw new Error(`Muse HTTP ${response.status} (see ledger)`); }
    const result = await response.json();
    const first = result.data?.[0];
    let bytes = first?.b64_json ? Buffer.from(first.b64_json, 'base64') : null;
    if (!bytes && first?.url) { const img = await fetch(first.url, { signal: AbortSignal.timeout(120000) }); if (img.ok) bytes = Buffer.from(await img.arrayBuffer()); }
    if (!bytes) { await ledger.end(entry, { status: 'failed-billed', jobId: requestId, error: 'No image in response' }); throw new Error('Muse returned no image.'); }
    await mkdir(dirname(out), { recursive: true }); await writeFile(out, bytes);
    const png = out.replace(/\.[a-z]+$/, '.png');
    await exec('ffmpeg', ['-v', 'error', '-y', '-i', out, png]);
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', png]);
    const { width, height } = JSON.parse(stdout).streams[0];
    return ledger.end(entry, { status: 'succeeded', jobId: requestId, output: { file: png, sha256: sha(await readFile(png)), width, height } });
  } catch (error) { if (entry.status === 'started') await ledger.end(entry, { status: 'failed-unknown', error: error.message }); throw error; }
}

export async function cartesiaVoice(voiceId) {
  const secret = key('CARTESIA_API_KEY');
  const response = await fetch(`https://api.cartesia.ai/voices/${voiceId}`, { headers: { 'X-API-Key': secret, 'Cartesia-Version': CARTESIA_VERSION } });
  if (!response.ok) throw new Error(`Cartesia voice lookup HTTP ${response.status}`);
  const voice = await response.json();
  return { id: voice.id, name: voice.name, isPublic: voice.is_public, description: voice.description };
}

export async function cartesiaSpeech(ledger, { step, text, voiceId, model, out }) {
  const previous = ledger.done(step); if (previous) return previous;
  const secret = key('CARTESIA_API_KEY');
  const entry = await ledger.begin({ step, provider: 'Cartesia', model, operation: `narration (${text.length} chars)`, estimateUsd: Number((text.length * RATES.cartesiaUsdPerChar).toFixed(5)), voiceId, textSha256: sha(text) });
  try {
    const response = await fetch(CARTESIA_URL, { method: 'POST', headers: { 'X-API-Key': secret, 'Cartesia-Version': CARTESIA_VERSION, 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: model, transcript: text, voice: { mode: 'id', id: voiceId }, language: 'en', output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 44100 } }), signal: AbortSignal.timeout(120000), redirect: 'error' });
    const requestId = response.headers.get('x-request-id') ?? response.headers.get('cartesia-request-id');
    if (!response.ok) { await ledger.end(entry, { status: 'failed-unbilled', jobId: requestId, error: `HTTP ${response.status}: ${redact(await response.text(), secret)}` }); throw new Error(`Cartesia HTTP ${response.status} (see ledger)`); }
    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(out), { recursive: true }); await writeFile(out, bytes);
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]);
    return ledger.end(entry, { status: 'succeeded', jobId: requestId, output: { file: out, sha256: sha(bytes), durationSeconds: Number(stdout.trim()) } });
  } catch (error) { if (entry.status === 'started') await ledger.end(entry, { status: 'failed-unknown', error: error.message }); throw error; }
}
