# My Pixar Story: proof report

Two proofs, both built from public-figure inputs. No private or family data is used.

| Proof | Input | Production spec | Film | Inspection | Keyframes | Provenance |
| --- | --- | --- | --- | --- | --- | --- |
| Steve Jobs to Lisa | `docs/proofs/steve-jobs-to-lisa.json` | `docs/proofs/steve-jobs-to-lisa-production.json` | `proofs/steve-jobs-to-lisa.mp4` | `proofs/steve-jobs-to-lisa-inspection.json` | `proofs/steve-jobs-to-lisa-keyframes.jpg` | `proofs/steve-jobs-to-lisa-provenance.json` |
| Marshall Mathers to Hailie | `docs/proofs/marshall-mathers-to-hailie.json` | `docs/proofs/marshall-mathers-to-hailie-production.json` | `proofs/marshall-mathers-to-hailie.mp4` | `proofs/marshall-mathers-to-hailie-inspection.json` | `proofs/marshall-mathers-to-hailie-keyframes.jpg` | `proofs/marshall-mathers-to-hailie-provenance.json` |

## How they were made

1. `node runner.mjs validate`, then `plan`, for each input.
2. Production spec (the agent's step in SKILL.md section 3). Four beats, each with narration rewritten only from facts in the input answers, plus a full keyframe prompt. Both voices are public Cartesia stock voices: "Carl - Steady Storyteller" for Steve and "Darius - Husky Narrator" for Marshall. The format never clones someone who hasn't consented, public figures included.
3. `node runner.mjs produce ... --max-usd 1.30`, which made the paid calls: four Meta Muse Image 1.0 keyframes (2016×1152 returned) and four Cartesia `sonic-3` narration files per proof. Each call was budget-checked and recorded in a spend ledger, with its provider request ID, before it was sent.
4. **Stopped before image-to-video.** `produce` wrote the four exact Seedance 2.0 Mini 480p requests it would send (keyframe, video prompt, 15 s each, generated audio off) and quoted $2.40 per film at $0.04/s. None was sent: the owner ruled out AI video calls for these proofs. The unsent requests are in each provenance file under `pendingVideoStep`.
5. `node runner.mjs stand-in-film` (free). Each keyframe got a slow local FFmpeg camera move (alternating push-in and pull-out) under its narration. The official renderer then built the 60-second film and the technical gate passed.
6. The committed MP4s are size-reduced copies (H.264 CRF 27, AAC 160 kbps; about 8 MB instead of about 45 MB) of the official render. The technical gate was re-run on these exact bytes, and `node runner.mjs inspect` wrote the inspection reports.

## Technical results (committed bytes)

| Proof | Duration | Size | fps | Audio | Loudness | True peak | Black | Narration per beat (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Steve Jobs to Lisa | 60 s | 1920×1080 | 30 | yes | -16.06 LUFS | -1.45 dB | 0 s | 7.80, 7.38, 7.80, 11.75 |
| Marshall Mathers to Hailie | 60 s | 1920×1080 | 30 | yes | -15.57 LUFS | -1.47 dB | 0 s | 5.94, 12.21, 8.64, 9.80 |

Both pass the gate in `runtime/assemble.mjs`: 60 s, 1080p, 30 fps, audio present, -18 to -14 LUFS, true peak ≤ -1 dB, at most 0.25 s of black.

## Spend (estimates at list price)

| Proof | Muse keyframes | Cartesia narration | AI video | Total |
| --- | --- | --- | --- | --- |
| Steve Jobs to Lisa | 4 × $0.01 | 530 chars ≈ $0.027 | $0 (not called) | ≈ $0.067 |
| Marshall Mathers to Hailie | 4 × $0.01 | 511 chars ≈ $0.026 | $0 (not called) | ≈ $0.066 |

Cartesia bills credits (about 1 per character). The dollar figure assumes the Pro plan rate of $0.05 per 1,000 characters. Per-call request IDs are in the provenance files.

## What these proofs show

- The same runner, renderer and gate produce two different stories with no runtime changes. The stories differ in recipient, era, settings, tone and voice.
- Paid keyframe and narration generation works from this repo, with budget caps, attempt limits and recorded request IDs.
- Muse keyframes keep each character recognisably consistent across a story without character sheets. This was checked by eye on all eight keyframes.
- The narration fits each 15-second window at a natural pace, between 5.9 and 12.2 s per beat.

## Example input (not a proof)

`examples/shaz-to-mia.json` and `examples/shaz-to-mia-production.json` hold a real parent's text answers to a fictional daughter, Mia, published with the maker's consent, plus the production spec built from them. They went through the same `validate`, `plan`, `produce` and `stand-in-film` steps (4 Muse keyframes and 4 stock-voice Cartesia narrations, about $0.068) and the result passed the technical gate. Only the text is published. The generated keyframes, narration audio and review cut stay private, and no photos, voice recordings or consent notes exist in the repo.

## What is still unproven

- **Image-to-video.** No Seedance clip has been generated from this repo. The motion in these films is a stand-in, not character animation.
- **Creative review.** The builder sampled frames from each film. Nobody has watched or listened to either film end to end. `FORMAT-REPO.json` review is `pending`.
- **Voice cloning.** This path wasn't exercised, by design.
- **Character sheets** (SKILL.md section 3) were skipped to keep the proofs cheap. Consistency rests on repeated character text.
- The kit-level input schema (relationship `parent`, `grandparent` or `spouse`) and the app validator (`father`, `mother` or `grandparent`) still disagree. The runner uses the app validator.
