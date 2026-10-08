import type { MemoirFilmAdScene } from "../features/scene/types";

/**
 * Default props for Remotion Studio only. Real renders always pass inputProps.scene
 * (built by runtime/remotion.mjs compositionScene) and never use this fixture.
 */
export const defaultRenderScene: MemoirFilmAdScene = {
  version: 1,
  format: "memoir-film",
  brand: {
    name: "My Pixar Story",
    url: "",
    host: "",
    title: "",
    description: "",
    faviconUrl: null,
    logoUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: [],
    fonts: { feel: "sans" },
    vibeTags: [],
    receipts: { specificClaims: [], buyerMoments: [], exactSiteLanguage: [], namedProof: [] },
  },
  creative: {
    angleId: "memoir",
    headline: "",
    subheadline: "",
    ctaText: "",
    headlineType: "transformation",
    selectedPain: "",
    selectedProof: "",
  },
  style: { backgroundColor: "#000000", textColor: "#ffffff", accentColor: "#ffffff", fontFeel: "sans" },
  audio: {
    status: "generated",
    storageId: "studio-fixture",
    url: "/memoir/mix.wav",
    mimeType: "audio/wav",
    durationMs: 60000,
    durationSeconds: 60,
    transcript: "",
    captions: [],
    provider: "upload",
    model: "studio-fixture",
    generatedAt: 0,
  },
  layout: {
    preset: "memoir-film",
    durationMs: 60000,
    fps: 30,
    manifestDigest: "0".repeat(64),
    clips: [{ id: "clip-0", src: "/memoir/clip-0.mp4", startFrame: 0, durationFrames: 1800, sourceOffsetSeconds: 0 }],
  },
  metadata: {
    candidateIndex: 0,
    generationBatchId: "studio-fixture",
    researchRunId: "",
    brandSnapshotId: "",
    model: "studio-fixture",
    provider: "deterministic",
    generatedAt: 0,
  },
};
