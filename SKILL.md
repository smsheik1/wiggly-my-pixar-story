---
name: my-pixar-story
description: "Make a 60-second, 16:9 Pixar-style animated memoir in which a parent or grandparent tells their own life story to a child or grandchild, in their own voice. Use when a user wants a My Pixar Story film, wants to test the format, or hands you this repo. Covers setup, free smoke test, input validation, planning, paid-generation approval, the official render, inspection and finalization."
---

# My Pixar Story: operating manual

This file is the only operating manual. `README.md` is for people, and `AGENTS.md` and `CLAUDE.md` just point here.

**The film:** 60 seconds, 1920×1080, 30 fps, H.264/AAC. It has four fixed 15-second beats. The maker narrates in first person to one recipient, and the visuals are stylized 3D animation. The default arc is early life, the leap, the moment the recipient entered the story, then what I want you to know.

## Hard rules

1. Use only the packaged runtime: `runner.mjs`, `runtime/*.mjs`, and the Remotion bundle built from `app/remotion-entry` by `build-renderer.mjs`. Never write another renderer, a preview path or an FFmpeg-only export.
2. Narration is never sped up. Each beat must fit its 15-second window at a natural pace, so rewrite or edit long beats. Clips are trimmed, never sped up or looped silently.
3. Never invent facts. Every name, place, object, date and quote must come from the inputs or an approved clarification (see grounded-v1 in `crew/leo/SKILL.md`). This applies to public figures too.
4. Ask once before any paid call. Show the plan from `plan` and the providers and call counts, and wait for an explicit yes. Then stay within that approval.
5. Save each provider job or prediction ID as soon as the job starts. After a polling timeout, collect that same job; never start a duplicate.
6. Make at most 3 attempts per generated asset or render. After that, stop and report the observed blocker.
7. Secrets stay out of the repo. Read keys from environment variables and report only missing key names. Never commit `.env`, `secrets.env`, private photos, voice samples or clones, or anything under `agent-runs/`.
8. Voice clones need consent. Only clone the maker's own voice, from a sample they supplied with explicit consent (at least 10 seconds of speech).
9. "Render complete" is not success. Inspect the real film, then watch and listen to it. Only finalize after a person approves it.

## 0. Setup (free)

```bash
npm ci
node runner.mjs check   # tools, renderer, and which key NAMES are missing
node runner.mjs smoke   # free end-to-end smoke through the official renderer (~10 s)
```

Requirements are listed in `requirements.json`: Node ≥22, FFmpeg, and FFprobe. On first render, Remotion downloads its Chrome Headless Shell once. If `check` reports missing tools, stop and tell the user before doing anything else. Missing provider keys only block step 4.

## 1. Inputs

The input contract is `MyPixarStoryInputs` in `app/features/formats/my-pixar-story/types.ts`. Worked examples are in `docs/proofs/`.

- `subject` holds the maker's `fullName`, `preferredName`, `recipientName`, `relationshipToRecipient` (`father`, `mother` or `grandparent`), `gender`, `keyPhysicalTraits` and `referencePhotoUrls`. Photos are references for character design only.
- `answers` are the Golden 5 answers: `scene1Childhood`, `scene2TeenFreedom`, `scene3LeapOfFaith`, `scene4Romance` and `scene5LegacyFinale`. Keep the maker's wording exactly as given.
- `audio.voiceCapture` is the consented voice sample. It must be at least 10 seconds.
- `tone` is one of `heartwarming_tearjerker`, `playful_adventure` or `triumphant_inspirational`.

If an answer is too vague to tell truthfully, ask one focused follow-up (for example, an object, a sentence someone said, or a place). Optional sub-answers may stay empty.

## 2. Validate, then plan (free)

```bash
node runner.mjs validate --input <inputs.json>
node runner.mjs plan --input <inputs.json> --run runs/<name>
```

`plan` writes `storyboard.json` and `plan.json`. These contain four draft beats taken from scenes 1, 3, 4 and 5, with keyframe and video prompts and the list of paid calls. The draft narration is deterministic and only a starting point. Write the real script yourself following `crew/leo/SKILL.md`, then review it against `evaluation/rubrics/text.md`. Keep each beat under roughly 35 words so it fits 15 seconds at a natural pace.

## 3. Production design (free)

Use the crew guides as role checklists. They are not separate services:

- Cast and character sheets: `crew/cleo`, `crew/pia`, `character-prompter.md` and `character-sheet-recipe.md`.
- Backgrounds: `crew/beau` and `background-prompter.md`.
- Shots and timing: `crew/sam` and `crew/cam`. Every shot belongs to one beat, and clip durations sum to exactly 60 s on the 30 fps grid.
- Motion and video prompts: `crew/mo` and `crew/vin`.
- Sound: `crew/finn`. Narration-only is allowed. Music and effects are optional and need their own approval.
- Generation plan: `crew/max`. Count every paid call and source each rate.

Every keyframe must be a separately generated, full-quality image. Never animate an upscaled storyboard crop.

## 4. Paid generation (needs explicit approval)

1. Show the user the plan, the providers (listed in `requirements.json`), the number of calls of each kind, and the rates you sourced. Then ask once.
2. After they approve, generate with their own keys:
   - Narration: Cartesia Sonic, one call per beat, using the cloned voice. Each file must be 15 s or shorter.
   - Keyframes: Meta Muse Image 1.0.
   - Clips: Seedance 2.0 Mini at 480p, image-to-video, through Replicate or the SeaDance API. Discard the clip's own generated audio.
   - Prototype runners for these providers are in `app/features/formats/my-pixar-story/providers.ts`. They have mock mode, cost guardrails, and loud errors when a key is missing. They have not yet been proven end to end from this standalone repo, so check provider responses carefully and record job IDs.
3. Save everything under `runs/<name>/media/`, which is gitignored with the rest of `runs/`. Never put any of it in the repo.

## 5. Assemble and render (free, local)

```bash
node runner.mjs manifest --run runs/<name> --clips c1.mp4,c2.mp4,... --narration b1.wav,b2.wav,b3.wav,b4.wav [--music bed.wav] [--durations 15,15,15,15]
node runner.mjs render --manifest runs/<name>/manifest.json
```

`manifest` imports each file under its SHA-256 name. It rejects narration longer than 15 s and clips shorter than their slot. It pads narration with silence only, to exact 15-second windows. Then it writes the film manifest.

`render` runs the one official Remotion composition at 1920×1080, 30 fps and 1800 frames, plus the FFmpeg audio mix (loudness-normalized, music ducked under the voice). It then applies the technical gate: 60 s, 1080p, 30 fps, audio present, -18 to -14 LUFS, true peak ≤ -1 dB, and no long black regions.

**Live progress:** `render` writes `progress.html` and `progress.json` to `runs/<name>/assembly/<digest>/`. As soon as the render starts, show `progress.html` inline (for example `<agent-embed url="file://…/progress.html" height="260" title="My Pixar Story render">`). The page refreshes itself every 2 seconds.

## 6. Inspect, review, finalize

```bash
node runner.mjs inspect --media <film.mp4> --output runs/<name>/inspection.json
node runner.mjs open --input <film.mp4>
node runner.mjs finalize --run runs/<name> --film <film.mp4> --inspection runs/<name>/inspection.json --reviewer "<who watched it>" --note "<their decision>"
```

1. Open the contact sheet and the film. `open` closes stale QuickTime documents first, so the film plays fresh from 00:00.
2. Watch it and listen to it yourself, then score it against `evaluation/rubrics/visual.md` and `audio.md`. If you can't hear audio or see motion directly, say so: the review is inconclusive, not passed.
3. `finalize` re-checks the technical gate and refuses if the film bytes changed since inspection. It records the human decision in `finalized.json`.
4. End by giving the user the finished film itself, not just a path.

## Checks

- `npm test` runs:
  - the 8 app tests (validator, storyboard compiler, state machine, providers in mock mode, inspection receipts, renderer, scrapbook, intake UI)
  - the Remotion renderer test (synthetic 2 s render with exact cuts)
  - the runner tests
- `npm run typecheck:app` typechecks `app/` and `tests/app/`.

## Repo map

| Path | What it is |
| --- | --- |
| `runner.mjs` | The only CLI: check, smoke, validate, plan, manifest, render, inspect, finalize, open, and placeholder-film (a free offline pipeline proof). |
| `runtime/` | The official film runtime: `remotion.mjs` (composition), `assemble.mjs` (render + gate), `mix.mjs` (audio), `media.mjs` (immutable media import), `progress.mjs` (progress page), `contracts.mjs` (studio artifact schemas). |
| `app/remotion-entry/`, `app/features/formats/memoir-film/` | Source of the official renderer, bundled by `build-renderer.mjs` into the gitignored `build/remotion`. |
| `app/features/formats/my-pixar-story/` | Format logic: input types and validation, storyboard and prompt compiler, interview state machine, provider runners, inspection receipts, intake UI. |
| `crew/`, `*-prompter.md`, `character-sheet-recipe.md`, `evaluation/rubrics/` | Role guides and review rubrics. |
| `docs/proofs/` | Two public-figure proof inputs. `proofs/` holds proof outputs and their inspections. |
| `studio.json`, `scene-contract.json`, `SQL-INTEGRATION.md` | Notes from the Wiggly hosted studio (crew model assignments and a SQLite adapter). The standalone runner doesn't use them; ignore them for local runs. |
