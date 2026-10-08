#!/usr/bin/env node
// My Pixar Story — official runner. Read SKILL.md first; never rebuild the renderer.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMedia, narrationWindow, probe } from './runtime/media.mjs';
import { render as renderFilm, inspectFilm, assertFilmInspection } from './runtime/assemble.mjs';
import { prepareComposition, renderComposition, verifyRenderer, digest } from './runtime/remotion.mjs';
import { SpendLedger, RATES, museImage, cartesiaVoice, cartesiaSpeech } from './runtime/providers.mjs';

const exec = promisify(execFile);
const kit = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(kit, 'package.json'), 'utf8'));
const exists = path => access(path).then(() => true, () => false);
const sha256File = path => new Promise((ok, fail) => { const h = createHash('sha256'); createReadStream(path).on('data', d => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', fail); });

/** Provider key names only; values are never read into output. */
export const PROVIDERS = [
  { env: 'CARTESIA_API_KEY', provider: 'Cartesia Sonic', use: '4 narration windows (stock voice or consented clone of the maker)', required: true },
  { env: 'META_API_KEY', provider: 'Meta Muse Image 1.0', use: 'character sheets, backgrounds, keyframes', required: true },
  { env: 'REPLICATE_API_TOKEN', provider: 'Replicate (Seedance 2.0 Mini 480p, studio default; optional image fallback)', use: 'image-to-video clips', required: 'video (one of)' },
  { env: 'SEADANCE_API_KEY', provider: 'SeaDance direct API (used by app providers.ts generateSceneVideoClip)', use: 'image-to-video clips', required: 'video (one of)' },
  { env: 'GEMINI_API_KEY', provider: 'Google Gemini', use: 'optional automated media review / Gemini Omni animation', required: false },
  { env: 'ELEVENLABS_API_KEY', provider: 'ElevenLabs', use: 'optional music and sound effects (off by default)', required: false },
];
const BEAT_SCENES = [0, 2, 3, 4]; // early life, leap, the recipient's story, what I want you to know

async function loadApp() {
  const { register } = await import('tsx/esm/api');
  register();
  const validate = await import('./app/features/formats/my-pixar-story/validate.ts');
  const screenplay = await import('./app/features/formats/my-pixar-story/screenplay.ts');
  return { ...validate, ...screenplay };
}

async function tool(name) {
  try { const { stdout } = await exec(name, ['-version']); return stdout.split('\n')[0]; } catch { return null; }
}

export async function check() {
  const node = Number(process.versions.node.split('.')[0]) >= 22;
  const ffmpeg = await tool('ffmpeg'), ffprobe = await tool('ffprobe');
  let renderer = 'missing (run: npm run build:renderer)';
  if (await exists(join(kit, 'build/remotion/renderer-manifest.json'))) {
    try { const r = await verifyRenderer(); renderer = `ok (remotion ${r.manifest.remotionVersion}, ${r.manifest.files.length} files)`; } catch (e) { renderer = `invalid: ${e.message}`; }
  }
  const keys = PROVIDERS.map(p => ({ ...p, present: Boolean(process.env[p.env]?.trim()) }));
  const missingRequired = keys.filter(k => k.required === true && !k.present).map(k => k.env);
  const video = keys.filter(k => k.required === 'video (one of)');
  if (!video.some(k => k.present)) missingRequired.push(video.map(k => k.env).join(' or '));
  return {
    format: 'my-pixar-story', version: pkg.version,
    localTools: { node: node ? process.version : `need >=22 (have ${process.version})`, ffmpeg: ffmpeg ?? 'MISSING', ffprobe: ffprobe ?? 'MISSING', renderer },
    providerKeys: keys.map(k => ({ env: k.env, provider: k.provider, use: k.use, required: k.required, present: k.present })),
    readyForFreeWork: node && Boolean(ffmpeg && ffprobe),
    readyForPaidGeneration: node && Boolean(ffmpeg && ffprobe) && missingRequired.length === 0,
    missingRequiredKeys: missingRequired,
    note: 'Key values are never printed. Paid generation always needs explicit user approval first (requirements.json paidApprovalRequired).',
  };
}

async function readInput(path) {
  if (!path) throw new Error('Missing --input <inputs.json>');
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

export async function validate(inputPath) {
  const { validateMyPixarStoryInputs } = await loadApp();
  const inputs = await readInput(inputPath);
  return { input: inputPath, ...validateMyPixarStoryInputs(inputs) };
}

export async function plan(inputPath, runDir) {
  const app = await loadApp();
  const inputs = await readInput(inputPath);
  const validation = app.validateMyPixarStoryInputs(inputs);
  if (!validation.valid) throw new Error(`Invalid inputs: ${validation.errors.join(' ')}`);
  const storyboard = app.compileStoryboard(inputs);
  const scripts = app.compileNarrationScripts(inputs);
  const beats = BEAT_SCENES.map((scene, i) => ({
    beat: i + 1, window: [i * 15, (i + 1) * 15], sourceScene: scene + 1, title: storyboard.scenes[scene].beatTitle,
    draftNarration: scripts[scene], words: scripts[scene].split(/\s+/).length,
    keyframePrompt: storyboard.scenes[scene].keyframeImagePrompt, videoPrompt: storyboard.scenes[scene].seaDanceVideoPrompt,
  }));
  const result = {
    schemaVersion: 1, format: 'my-pixar-story', version: pkg.version, inputDigest: digest(inputs),
    film: { durationSeconds: 60, beats: 4, width: 1920, height: 1080, fps: 30 },
    beats,
    draftNote: 'Deterministic draft only. The operating agent rewrites each beat in the maker\'s voice per crew/leo/SKILL.md (grounded-v1: no invented facts) before any paid call.',
    paidCalls: {
      approvalRequired: true,
      minimum: [
        { provider: 'Cartesia', operation: 'optional: voice clone from the maker\'s consented >=10s sample (otherwise a public stock voice, no call)', calls: '0-1' },
        { provider: 'Cartesia', operation: 'narration windows (<=15s each, natural rate)', calls: 4 },
        { provider: 'Meta Muse', operation: 'character candidates + sheet per on-screen person', calls: '4 per character' },
        { provider: 'Meta Muse', operation: 'one full-quality keyframe per shot (never a storyboard crop)', calls: '>=4' },
        { provider: 'Replicate Seedance 2.0 Mini 480p', operation: 'image-to-video clip per shot', calls: '>=4' },
      ],
      rateSources: 'Meta Muse ~$0.01/image is the only rate recorded in this repo. Look up current Cartesia and Replicate pricing before quoting a total; never guess.',
      attemptLimit: 3,
    },
  };
  if (runDir) {
    const dir = resolve(runDir); await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));
    await writeFile(join(dir, 'plan.json'), JSON.stringify(result, null, 2));
    result.files = [join(dir, 'storyboard.json'), join(dir, 'plan.json')];
  }
  return result;
}

/** Imports finished clips/narration into a run and writes the official film manifest. */
export async function manifest({ runDir, clips, narration, music, durations }) {
  const dir = resolve(runDir); await mkdir(dir, { recursive: true });
  const clipPaths = clips.split(',').map(p => resolve(p.trim()));
  const voicePaths = narration.split(',').map(p => resolve(p.trim()));
  if (voicePaths.length !== 4) throw new Error('Provide exactly 4 narration files (one per 15-second beat).');
  const lengths = durations ? durations.split(',').map(Number) : clipPaths.map(() => 60 / clipPaths.length);
  if (lengths.length !== clipPaths.length || lengths.some(d => !(d > 0) || Math.abs(d * 30 - Math.round(d * 30)) > 1e-9)) throw new Error('Clip durations must be positive and on the 30fps grid.');
  if (Math.round(lengths.reduce((a, b) => a + b, 0) * 30) !== 1800) throw new Error('Clip durations must sum to exactly 60 seconds.');
  const files = [];
  for (const [i, path] of clipPaths.entries()) {
    const file = await importMedia(path, dir);
    if (!(file.durationSeconds >= lengths[i] - 1 / 30)) throw new Error(`Clip ${basename(path)} is ${file.durationSeconds}s; needs ${lengths[i]}s. Never speed up or loop silently.`);
    files.push(file);
  }
  const windows = [];
  for (const [i, path] of voicePaths.entries()) {
    const file = await importMedia(path, dir);
    if (file.durationSeconds > 15) throw new Error(`Narration beat ${i + 1} is ${file.durationSeconds.toFixed(2)}s; it must fit its 15s window at natural pace (rewrite or edit, never speed up).`);
    windows.push((await narrationWindow(file, dir, join(dir, `narration-window-${i + 1}.wav`))).file);
  }
  const film = {
    projectId: basename(dir),
    clips: files.map((file, i) => ({ id: `clip-${i + 1}`, durationSeconds: lengths[i], file })),
    narration: windows, music: music ? await importMedia(resolve(music), dir) : null, effects: [],
    edit: { clips: files.map((_, i) => ({ clipId: `clip-${i + 1}`, sourceOffsetSeconds: 0 })), narrationGainDb: 0, musicGainDb: -18, duckMusic: Boolean(music), effectGainDb: 0, musicFadeInSeconds: 1, musicFadeOutSeconds: 2 },
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(film, null, 2));
  return { manifest: join(dir, 'manifest.json'), manifestDigest: digest(film) };
}

export async function render(manifestPath, runDir) {
  const film = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  const dir = resolve(runDir ?? dirname(resolve(manifestPath)));
  const assembly = join(dir, 'assembly', digest(film));
  console.error(`[wiggly] live progress: ${join(assembly, 'progress.html')}  (embed: <agent-embed url="file://${join(assembly, 'progress.html')}" height="260" title="My Pixar Story render">)`);
  const result = await renderFilm(film, dir);
  return { film: result.files[0].path, progressHtml: join(assembly, 'progress.html'), contactSheet: result.contactSheet.path, inspection: result.inspection, next: 'Run inspect, watch and listen to the film, then finalize. Open it with: node runner.mjs open --input <film>' };
}

/** Technical inspection in the Wiggly Repo Builder schema (metadata only; not a creative pass). */
export async function inspect(mediaPath, outputPath) {
  const media = resolve(mediaPath);
  if (outputPath && await exists(resolve(outputPath))) throw new Error('Inspection output already exists; choose a new path.');
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', media]);
  const probed = JSON.parse(stdout);
  const measured = await probe(media);
  const { size } = await import('node:fs/promises').then(fs => fs.stat(media));
  const report = {
    schemaVersion: 1, kind: 'technical-media-inspection',
    media: { file: basename(media), sha256: await sha256File(media), sizeBytes: size, durationSeconds: measured.durationSeconds, width: measured.width, height: measured.height, fps: measured.fps, hasAudio: measured.hasAudio },
    streams: probed.streams.map(s => ({ index: s.index, codecType: s.codec_type, codec: s.codec_name, ...(s.codec_type === 'video' ? { width: s.width, height: s.height, frameRate: s.avg_frame_rate, pixelFormat: s.pix_fmt } : { sampleRate: Number(s.sample_rate), channels: s.channels }), durationSeconds: Number(s.duration) })),
    review: { status: 'not-assessed', limitations: ['Metadata and checksums do not verify motion, content, audio perception, or creative quality. Direct review remains required.'] },
  };
  if (outputPath) { await mkdir(dirname(resolve(outputPath)), { recursive: true }); await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); }
  return report;
}

export async function finalize({ runDir, film, inspection, reviewer, note }) {
  if (!reviewer?.trim() || !note?.trim()) throw new Error('Finalize needs --reviewer and --note from a person who actually watched and listened to the film.');
  const filmPath = resolve(film), report = JSON.parse(await readFile(resolve(inspection), 'utf8'));
  if (report.media?.sha256 !== await sha256File(filmPath)) throw new Error('Inspection does not match the film bytes; re-run inspect.');
  const measured = await inspectFilm(await importMedia(filmPath, resolve(runDir)));
  assertFilmInspection(measured);
  const receipt = { schemaVersion: 1, kind: 'my-pixar-story-finalized', version: pkg.version, film: { file: filmPath, sha256: report.media.sha256 }, technicalGate: measured, review: { reviewer, note, recordedAt: new Date().toISOString() } };
  await writeFile(join(resolve(runDir), 'finalized.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  return receipt;
}

export async function open(input) {
  const file = resolve(input);
  if (!await exists(file)) throw new Error(`No such file: ${file}`);
  if (process.platform === 'darwin') {
    await exec('osascript', ['-e', 'if application "QuickTime Player" is running then tell application "QuickTime Player" to close every document saving no']).catch(() => {});
    await exec('open', ['-a', 'QuickTime Player', file]);
  } else if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', file], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [file], { detached: true, stdio: 'ignore' }).unref();
  }
  return { opened: file };
}

async function voiceTrack(text, path) {
  if (await exists('/usr/bin/say')) {
    const aiff = `${path}.aiff`;
    await exec('say', ['-o', aiff, text]);
    await exec('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', path]);
    await rm(aiff);
    return 'macOS say (system voice placeholder; not a clone)';
  }
  await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=6', '-af', 'volume=0.3', path]);
  return 'FFmpeg sine tone (no speech engine available)';
}

const BEAT_COLORS = [['0x3b2a14', '0xffb238'], ['0x0e2a3b', '0x38c6ff'], ['0x3b0e26', '0xff6fa8'], ['0x1d3b0e', '0xc8ff6f']];
async function gradientClip(i, seconds, path, size = '1280x720') {
  const [c0, c1] = BEAT_COLORS[i % 4];
  await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `gradients=s=${size}:r=30:d=${seconds}:c0=${c0}:c1=${c1}:speed=0.015:seed=${i + 1}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', path]);
}

/** Free offline pipeline proof: placeholder visuals + placeholder narration through the official renderer. */
export async function placeholderFilm({ input, runDir, out }) {
  const app = await loadApp();
  const inputs = await readInput(input);
  const validation = app.validateMyPixarStoryInputs(inputs);
  if (!validation.valid) throw new Error(`Invalid inputs: ${validation.errors.join(' ')}`);
  const scripts = app.compileNarrationScripts(inputs);
  const dir = resolve(runDir); const src = join(dir, 'placeholder-sources'); await mkdir(src, { recursive: true });
  const clips = [], voices = []; let voiceEngine = '';
  for (const [i, scene] of BEAT_SCENES.entries()) {
    const clip = join(src, `beat-${i + 1}.mp4`); await gradientClip(i, 15, clip); clips.push(clip);
    const voice = join(src, `beat-${i + 1}.wav`); voiceEngine = await voiceTrack(scripts[scene], voice); voices.push(voice);
  }
  const built = await manifest({ runDir: dir, clips: clips.join(','), narration: voices.join(',') });
  const rendered = await render(built.manifest, dir);
  if (out) { await mkdir(dirname(resolve(out)), { recursive: true }); await copyFile(rendered.film, resolve(out)); }
  const provenance = { input, inputDigest: digest(inputs), narration: BEAT_SCENES.map((s, i) => ({ beat: i + 1, text: scripts[s] })), voiceEngine, visuals: 'FFmpeg gradients source (original, generated locally; no provider imagery)', renderer: 'official build/remotion via runtime/assemble.mjs', paidCalls: 0 };
  await writeFile(join(dir, 'placeholder-provenance.json'), JSON.stringify(provenance, null, 2));
  return { ...rendered, out: out ? resolve(out) : rendered.film, provenance };
}

/** Published Replicate list price for the studio's video profile; used only to quote the next approval. */
const VIDEO_PROFILE = { provider: 'Replicate', model: 'bytedance/seedance-2.0-mini', endpoint: 'https://api.replicate.com/v1/models/bytedance/seedance-2.0-mini/predictions', resolution: '480p', usdPerSecond: 0.04, priceSource: 'Replicate pricing for seedance-2.0-mini, 480p without video input (checked 2026-10-08)' };

/**
 * Paid pre-video production pass (needs explicit user approval and --max-usd): one Muse keyframe and one
 * Cartesia narration per beat. Every call is estimated, budget-checked and recorded in <run>/spend-ledger.json
 * before it is made; re-running reuses succeeded calls instead of paying again.
 * It stops at the image-to-video step: it writes <run>/video-requests.json (unsent request bodies + cost quote)
 * and makes NO video call. After the user approves video spend, generate the 4 clips, then run
 * `manifest` with those clips and the 4 narration files, then `render`.
 */
export async function produce({ input, production, runDir, maxUsd }) {
  const app = await loadApp();
  const inputs = await readInput(input);
  const validation = app.validateMyPixarStoryInputs(inputs);
  if (!validation.valid) throw new Error(`Invalid inputs: ${validation.errors.join(' ')}`);
  if (!production) throw new Error('Missing --production <production.json> (the agent-written narration + keyframe prompts).');
  const spec = JSON.parse(await readFile(resolve(production), 'utf8'));
  if (spec.beats?.length !== 4) throw new Error('Production spec needs exactly 4 beats.');
  for (const [i, b] of spec.beats.entries()) {
    if (!b.narration?.trim() || !b.keyframePrompt?.trim()) throw new Error(`Beat ${i + 1} needs narration and keyframePrompt.`);
    if (b.narration.split(/\s+/).length > 38) throw new Error(`Beat ${i + 1} narration is over 38 words; it will not fit 15s at a natural pace.`);
  }
  const estimate = spec.beats.reduce((s, b) => s + RATES.museImageUsd + b.narration.length * RATES.cartesiaUsdPerChar, 0);
  const dir = resolve(runDir); const src = join(dir, 'sources'); await mkdir(src, { recursive: true });
  const ledger = await SpendLedger.open(join(dir, 'spend-ledger.json'), Number(maxUsd));
  const remaining = spec.beats.reduce((s, b, i) => s + (ledger.done(`keyframe-${i + 1}`) ? 0 : RATES.museImageUsd) + (ledger.done(`narration-${i + 1}`) ? 0 : b.narration.length * RATES.cartesiaUsdPerChar), 0);
  if (ledger.committedUsd + remaining > ledger.maxUsd) throw new Error(`Budget stop before any call: remaining calls ~$${remaining.toFixed(3)} + committed ~$${ledger.committedUsd.toFixed(3)} exceeds --max-usd ${ledger.maxUsd}.`);
  const voice = await cartesiaVoice(spec.voice.voiceId);
  if (!voice.isPublic && !spec.voice.consentRecord) throw new Error('This voice is not a public stock voice. A cloned voice needs a recorded consent reference (voice.consentRecord) from the person whose voice it is.');
  const log = msg => console.error(`[wiggly] ${msg} (running estimate $${ledger.committedUsd.toFixed(3)} of $${ledger.maxUsd})`);
  const storyboard = app.compileStoryboard(inputs);
  const beats = [];
  for (const [i, b] of spec.beats.entries()) {
    const image = await museImage(ledger, { step: `keyframe-${i + 1}`, prompt: b.keyframePrompt, out: join(src, `keyframe-${i + 1}.webp`) });
    log(`beat ${i + 1} keyframe ${image.output.width}x${image.output.height}`);
    const speech = await cartesiaSpeech(ledger, { step: `narration-${i + 1}`, text: b.narration, voiceId: spec.voice.voiceId, model: spec.voice.model, out: join(src, `narration-${i + 1}.wav`) });
    log(`beat ${i + 1} narration ${speech.output.durationSeconds.toFixed(2)}s`);
    if (speech.output.durationSeconds > 15) throw new Error(`Beat ${i + 1} narration is ${speech.output.durationSeconds.toFixed(2)}s; shorten the line (never speed it up).`);
    const jpg = join(src, `keyframe-${i + 1}.jpg`);
    await exec('ffmpeg', ['-v', 'error', '-y', '-i', image.output.file, '-q:v', '2', jpg]);
    beats.push({ beat: i + 1, window: [i * 15, (i + 1) * 15], narration: b.narration, narrationFile: speech.output.file, narrationSeconds: speech.output.durationSeconds, narrationSha256: speech.output.sha256, keyframe: image.output, keyframeJpg: jpg, keyframeJob: image.jobId, narrationJob: speech.jobId });
  }
  const requests = beats.map((b, i) => ({
    step: `clip-${b.beat}`, beat: b.beat, durationSeconds: 15, estimateUsd: Number((15 * VIDEO_PROFILE.usdPerSecond).toFixed(2)),
    endpoint: VIDEO_PROFILE.endpoint,
    body: { input: { image: `<data URI of ${b.keyframeJpg}>`, prompt: storyboard.scenes[BEAT_SCENES[i]].seaDanceVideoPrompt, duration: 15, resolution: VIDEO_PROFILE.resolution, aspect_ratio: '16:9', generate_audio: false } },
  }));
  const videoQuoteUsd = Number(requests.reduce((s, r) => s + r.estimateUsd, 0).toFixed(2));
  const handoff = {
    schemaVersion: 1, status: 'awaiting-video-approval', sent: false,
    note: 'No AI video call has been made. These are the exact image-to-video requests the next step would send; each needs explicit user approval for the quoted spend. Save each prediction id before polling (Standard rule 14) and keep to 3 attempts per clip.',
    profile: VIDEO_PROFILE, videoQuoteUsd, requests,
    afterVideo: `node runner.mjs manifest --run ${dir} --clips ${requests.map(r => join(src, `${r.step}.mp4`)).join(',')} --narration ${beats.map(b => b.narrationFile).join(',')}  then  node runner.mjs render --manifest ${join(dir, 'manifest.json')}`,
  };
  await writeFile(join(dir, 'video-requests.json'), JSON.stringify(handoff, null, 2));
  const spend = ledger.entries.map(e => ({ step: e.step, provider: e.provider, model: e.model, operation: e.operation, status: e.status, attempt: e.attempt, estimateUsd: e.estimateUsd, jobId: e.jobId ?? null }));
  const provenance = { schemaVersion: 1, input, production, inputDigest: digest(inputs), voice: { ...voice, model: spec.voice.model, note: 'Public Cartesia stock voice; not a clone of any real person.' }, beats, aiVideoCalls: 0, spend, estimatedSpendUsd: Number(ledger.committedUsd.toFixed(4)), rates: RATES };
  await writeFile(join(dir, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return { status: 'awaiting-video-approval', stoppedAt: 'image-to-video (4 clips x 15s)', videoQuoteUsd, videoRequests: join(dir, 'video-requests.json'), provenance: join(dir, 'provenance.json'), estimatedSpendUsd: provenance.estimatedSpendUsd };
}

/** Free local camera move over a still keyframe (stand-in motion; not AI video). */
async function stillMotionClip(image, seconds, out, zoomIn) {
  const frames = Math.round(seconds * 30);
  const z = zoomIn ? `1+0.10*on/${frames}` : `1.10-0.10*on/${frames}`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', image, '-vf', `scale=3840:-2,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=30,format=yuv420p`, '-frames:v', String(frames), '-c:v', 'libx264', '-crf', '20', out]);
  return out;
}

/**
 * Free review cut from a finished `produce` run, with NO AI video: each paid keyframe gets a slow local
 * camera move and sits under its paid narration, then the official renderer builds the 60s film.
 * Use it to review story, pictures and voice before approving video spend. It is not the final film.
 */
export async function standInFilm({ runDir, out }) {
  const dir = resolve(runDir);
  const provenance = JSON.parse(await readFile(join(dir, 'provenance.json'), 'utf8'));
  if (provenance.beats?.length !== 4) throw new Error('Run `produce` first; provenance.json needs 4 beats.');
  const clips = [];
  for (const b of provenance.beats) {
    if (await sha256File(b.keyframe.file) !== b.keyframe.sha256) throw new Error(`Keyframe ${b.beat} changed since produce.`);
    clips.push(await stillMotionClip(b.keyframe.file, 15, join(dir, 'sources', `stand-in-${b.beat}.mp4`), b.beat % 2 === 1));
  }
  const built = await manifest({ runDir: dir, clips: clips.join(','), narration: provenance.beats.map(b => b.narrationFile).join(',') });
  const rendered = await render(built.manifest, dir);
  if (out) { await mkdir(dirname(resolve(out)), { recursive: true }); await copyFile(rendered.film, resolve(out)); }
  const record = { schemaVersion: 1, kind: 'stand-in-film', motion: 'local FFmpeg zoompan over each Muse keyframe (free); no AI video', narration: 'Cartesia files from produce', paidCalls: 0, manifestDigest: built.manifestDigest, film: rendered.film };
  await writeFile(join(dir, 'stand-in.json'), JSON.stringify(record, null, 2));
  return { ...rendered, out: out ? resolve(out) : rendered.film, standIn: join(dir, 'stand-in.json') };
}

export async function smoke() {
  const report = { checks: [] };
  const status = await check();
  if (!status.readyForFreeWork) throw new Error(`Missing local tools: ${JSON.stringify(status.localTools)}`);
  report.checks.push({ step: 'check', ok: true, missingRequiredKeys: status.missingRequiredKeys });
  for (const proof of ['docs/proofs/steve-jobs-to-lisa.json', 'docs/proofs/marshall-mathers-to-hailie.json']) {
    const v = await validate(join(kit, proof)); if (!v.valid) throw new Error(`${proof}: ${v.errors.join(' ')}`);
    const p = await plan(join(kit, proof)); report.checks.push({ step: 'validate+plan', proof, ok: true, beats: p.beats.length });
  }
  if (!await exists(join(kit, 'build/remotion/renderer-manifest.json'))) await exec(process.execPath, [join(kit, 'build-renderer.mjs')], { maxBuffer: 16 * 1024 * 1024 });
  await verifyRenderer();
  const dir = await mkdtemp(join(tmpdir(), 'my-pixar-story-smoke-'));
  try {
    const clips = [], voices = [];
    for (let i = 0; i < 4; i++) {
      const clip = join(dir, `c${i}.mp4`); await gradientClip(i, 15, clip, '320x180'); clips.push(clip);
      const voice = join(dir, `v${i}.wav`); await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${220 + i * 55}:duration=3`, voice]); voices.push(voice);
    }
    const run = join(dir, 'run');
    const built = await manifest({ runDir: run, clips: clips.join(','), narration: voices.join(',') });
    const film = JSON.parse(await readFile(built.manifest, 'utf8'));
    const prepared = await prepareComposition(film, join(run, 'smoke'));
    const out = join(run, 'smoke.mp4');
    await renderComposition(prepared, out, () => {}, [0, 59]);
    const measured = await probe(out);
    if (measured.width !== 1920 || measured.height !== 1080 || measured.fps !== 30 || !measured.hasAudio || Math.abs(measured.durationSeconds - 2) > 0.05) throw new Error(`Smoke render mismatch: ${JSON.stringify(measured)}`);
    report.checks.push({ step: 'official renderer (2s segment)', ok: true, measured });
  } finally { await rm(dir, { recursive: true, force: true }); }
  return { status: 'smoke-passed', paidCalls: 0, ...report };
}

const HELP = `My Pixar Story ${pkg.version} — official runner (read SKILL.md first)
  check                                       tools, renderer, provider key NAMES (free)
  smoke                                       free end-to-end smoke through the official renderer
  validate --input <inputs.json>              validate inputs before any paid call
  plan --input <inputs.json> [--run <dir>]    4-beat draft + paid-call list (no calls made)
  manifest --run <dir> --clips a.mp4,... --narration n1.wav,n2.wav,n3.wav,n4.wav [--music m.wav] [--durations 15,15,15,15]
  render --manifest <run/manifest.json> [--run <dir>]   official 60s render (writes progress.html/json)
  inspect --media <film.mp4> --output <report.json>     technical inspection (not a creative pass)
  finalize --run <dir> --film <film.mp4> --inspection <report.json> --reviewer <name> --note <decision>
  open --input <film.mp4>                     open the film for review (closes stale QuickTime docs first)
  placeholder-film --input <inputs.json> --run <dir> [--out <film.mp4>]   free offline pipeline proof (no provider media)
  produce --input <inputs.json> --production <production.json> --run <dir> --max-usd <approved>
                                              PAID (approval first): Muse keyframes + Cartesia narration; stops before video
                                              and writes video-requests.json (unsent) with a cost quote
  stand-in-film --run <produce run> [--out <film.mp4>]   free review cut: keyframes + narration, local camera
                                              moves, official render (no AI video; not the final film)`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i].startsWith('--') || rest[i + 1] === undefined) { console.error(`Bad option: ${rest[i]}`); process.exit(2); }
    opts[rest[i].slice(2)] = rest[i + 1];
  }
  try {
    let result;
    switch (command) {
      case 'check': result = await check(); if (!result.readyForFreeWork) process.exitCode = 1; break;
      case 'smoke': result = await smoke(); break;
      case 'validate': result = await validate(opts.input); if (!result.valid) process.exitCode = 1; break;
      case 'plan': result = await plan(opts.input, opts.run); break;
      case 'manifest': result = await manifest({ runDir: opts.run, clips: opts.clips, narration: opts.narration, music: opts.music, durations: opts.durations }); break;
      case 'render': result = await render(opts.manifest, opts.run); break;
      case 'inspect': result = await inspect(opts.media, opts.output); break;
      case 'finalize': result = await finalize({ runDir: opts.run, film: opts.film, inspection: opts.inspection, reviewer: opts.reviewer, note: opts.note }); break;
      case 'open': result = await open(opts.input); break;
      case 'produce': result = await produce({ input: opts.input, production: opts.production, runDir: opts.run, maxUsd: opts['max-usd'] }); break;
      case 'stand-in-film': result = await standInFilm({ runDir: opts.run, out: opts.out }); break;
      case 'placeholder-film': result = await placeholderFilm({ input: opts.input, runDir: opts.run, out: opts.out }); break;
      default: console.log(HELP); process.exitCode = command && command !== 'help' ? 2 : 0;
    }
    if (result) console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: 'stopped', message: error.message }));
    process.exitCode = 1;
  }
}
