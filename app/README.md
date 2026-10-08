# My Pixar Story app code

The in-app My Pixar Story flow, moved out of the Wiggly monorepo (`v3/features/formats/my-pixar-story`,
`v3/features/scene/createMyPixarStoryScene.ts`). It covers the intake sheet and Golden 5 stepper UI, the interview
state machine, the deterministic screenplay compiler, the scene factory and renderer, provider runners
(Cartesia, SeaDance, Meta Muse, Replicate, Gemini Omni), and media-quality receipts.

The folder layout mirrors the monorepo (`app/features/...`, `app/lib`, `app/components/ui`), so relative imports are unchanged.

## Shared modules copied in from the monorepo

| Path | Notes |
| --- | --- |
| `features/scene/types.ts` | Trimmed ad-scene contract: only the base scene types plus `MyPixarStoryAdScene`. Brand types are inlined. |
| `features/formats/types.ts` | `AdFormatModule` / `FormatRenderProps`, unchanged. |
| `features/formats/registry.ts` | Standalone registry: `my-pixar-story` (via the browser-safe `my-pixar-story/module.ts`) and `memoir-film`. |
| `features/formats/memoir-film/index.tsx` | The official 60-second film renderer and validator, copied unchanged. |
| `remotion-entry/*`, `features/render/renderGlobals.css` | The Remotion entry that `build-renderer.mjs` bundles into `build/remotion` (gitignored, rebuilt by `npm run test:kit`). `Root.tsx` is reduced to these two formats, and `RemotionAdScene.tsx` drops the music-bed branch for formats that aren't in this repo. |
| `features/render/AdRenderSurface.tsx`, `RenderAssetContext.tsx`, `fontStack.ts` | Unchanged. |
| `lib/agent-bridge.ts` | `askActiveAgent` (shells out to `agy` / `claude`). Only `compileStoryboardWithAntigravity` uses it, and the tests don't. |
| `lib/utils.ts`, `components/ui/*` | shadcn/ui primitives used by the intake UI. |

## Tests

```bash
npm ci
npm run test:app       # 8 tsx scripts in tests/app (node:assert, exit non-zero on failure)
npm run typecheck:app  # tsc --noEmit over app/ and tests/app
```

The tests run offline. Provider tests use `mock: true`, an empty `explicitApiKey`, or an injected fake `fetch`, so they don't need API keys.
The smoke test reads the public-figure proof fixtures in `docs/proofs/` (`steve-jobs-to-lisa.json`, `marshall-mathers-to-hailie.json`). They use only publicly known story details, plus placeholder URLs.
