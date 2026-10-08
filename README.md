# My Pixar Story

**A Wiggly format: a 60-second, Pixar-style animated memoir, told by a parent or grandparent in their own voice.**

Answer five questions about your life: childhood, teenage freedom, the big leap, how you met, and what you want them to know. Your coding agent turns the answers into a four-beat, 16:9 animated short. You narrate it in your own cloned voice to your child or grandchild.

## What you get

- A 60-second film at 1920×1080, 30 fps, H.264/AAC, rendered by the one official Remotion renderer included in this repo.
- Four 15-second beats: early life, the leap, the moment the recipient entered your story, and what I want you to know.
- A storyboard, a provider plan, a technical inspection report, a contact sheet, and a live `progress.html` while it renders.

## What you provide

- Your answers to the Golden 5 questions. `docs/proofs/steve-jobs-to-lisa.json` shows the exact shape.
- A voice sample of at least 10 seconds, recorded with your consent. It's used only to clone your own voice.
- Optionally, reference photos for character design.
- Your own provider keys, set as environment variables. They are never stored in the repo.

## Hand it to your agent

Open this repo in Codex, Claude Code, Cursor, or Antigravity and say:

> Make me a My Pixar Story film with this repo. Read SKILL.md first.

The agent reads `SKILL.md` and follows these steps:

1. Runs the free smoke test.
2. Tells you which keys are missing.
3. Validates your answers.
4. Shows you a plan, including the number of paid calls.
5. Asks once before spending anything.
6. Renders, inspects, and hands you the film for review.

## Run it yourself

```bash
npm ci
node runner.mjs check                                          # tools + which key names are missing (free)
node runner.mjs smoke                                          # free end-to-end smoke through the real renderer
node runner.mjs plan --input docs/proofs/steve-jobs-to-lisa.json --run runs/steve   # draft beats + paid-call list
npm test                                                       # app tests, renderer test, runner tests
```

## Services and costs

| Service | Used for | Key | Cost |
| --- | --- | --- | --- |
| Cartesia Sonic | Voice clone and 4 narration windows | `CARTESIA_API_KEY` | Paid, per character. Check current pricing. |
| Meta Muse Image 1.0 | Character sheets, backgrounds, keyframes | `META_API_KEY` | About $0.01 per image |
| Seedance 2.0 Mini, 480p (Replicate or the SeaDance API) | Image-to-video clips | `REPLICATE_API_TOKEN` or `SEADANCE_API_KEY` | Paid, per clip. Check current pricing. |
| Gemini, ElevenLabs (optional) | Automated media review, music, effects | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` | Optional |

Validation, planning, rendering, inspection, and the smoke test are free and run locally. They need only Node 22 or later, FFmpeg, and FFprobe.

## Proofs

`proofs/` holds two films rendered from the public-figure inputs in `docs/proofs/` (Steve Jobs to Lisa, and Marshall Mathers to Hailie). They are **offline pipeline proofs**: placeholder gradient visuals and placeholder system-voice narration, run through the official renderer and technical gate with no paid calls. They prove the runtime and the timing, not the creative quality of a real Pixar-style production. `PROOF-REPORT.md` covers what they show and what is still unproven.

## Status

The runtime, validation, planning, rendering, and inspection all work and are tested. Paid generation through the provider runners hasn't yet been proven end to end from this repo. Creative review is pending. See `FORMAT-REPO.json`.
