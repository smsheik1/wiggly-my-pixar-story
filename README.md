# My Pixar Story

**A Wiggly format: a 60-second, Pixar-style animated memoir, told by a parent or grandparent in their own voice.**

Answer five questions about your life: childhood, teenage freedom, the big leap, how you met, and what you want them to know. Your coding agent turns the answers into a four-beat, 16:9 animated short. You narrate it in your own cloned voice to your child or grandchild.

## What you get

- A 60-second film at 1920×1080, 30 fps, H.264/AAC, rendered by the one official Remotion renderer included in this repo.
- Four 15-second beats: early life, the leap, the moment the recipient entered your story, and what I want you to know.
- A storyboard, a provider plan, a technical inspection report, a contact sheet, and a live `progress.html` while it renders.

## What you provide

- Your answers to the Golden 5 questions. `docs/proofs/steve-jobs-to-lisa.json` shows the exact shape. `examples/shaz-to-mia.json` is a real parent's answers (to a fictional daughter), mapped from a free-text intake, with its production spec in `examples/shaz-to-mia-production.json`.
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
node runner.mjs produce --input docs/proofs/steve-jobs-to-lisa.json --production docs/proofs/steve-jobs-to-lisa-production.json --run runs/steve --max-usd 0.20   # PAID: keyframes + narration, stops before video
node runner.mjs stand-in-film --run runs/steve --out runs/steve/review.mp4   # free review cut, no AI video
npm test                                                       # app tests, renderer test, runner tests
```

## Services and costs

| Service | Used for | Key | Cost |
| --- | --- | --- | --- |
| Cartesia Sonic | 4 narration windows (stock voice, or a consented clone of you) | `CARTESIA_API_KEY` | About 1 credit per character (roughly $0.05 per 1,000 characters on the Pro plan); a 4-beat film is about 500 characters |
| Meta Muse Image 1.0 | Character sheets, backgrounds, keyframes | `META_API_KEY` | About $0.01 per image |
| Seedance 2.0 Mini, 480p (Replicate or the SeaDance API) | Image-to-video clips | `REPLICATE_API_TOKEN` or `SEADANCE_API_KEY` | About $0.04 per second on Replicate (checked October 2026): four 15 s clips is about $2.40 |
| Gemini, ElevenLabs (optional) | Automated media review, music, effects | `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` | Optional |

Validation, planning, rendering, inspection, and the smoke test are free and run locally. They need only Node 22 or later, FFmpeg, and FFprobe.

## Proofs

`proofs/` holds two 60-second review cuts made from the public-figure inputs in `docs/proofs/` (Steve Jobs to Lisa, and Marshall Mathers to Hailie). Each used real paid calls: four Meta Muse keyframes and four Cartesia narration lines in a public stock voice (never a clone of the real person). Each keyframe then got a slow local camera move, and the film went through the official renderer and technical gate. **No AI video was generated**, so the motion is a stand-in and the films aren't final productions. The keyframes, the unsent video requests and the spend ledger are in `proofs/` too. `PROOF-REPORT.md` covers what they show and what is still unproven.

## Status

The runtime, validation, planning, paid keyframes and narration, rendering, and inspection all work, and are tested or proven by the proofs. Image-to-video generation hasn't been run from this repo yet: `produce` stops there and writes the exact requests for approval. Creative review is pending. See `FORMAT-REPO.json`.
