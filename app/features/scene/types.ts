/**
 * Minimal standalone copy of the Wiggly ad-scene contract, trimmed to what the
 * My Pixar Story format needs. Source: wiggly monorepo v3/features/scene/types.ts
 * (and v3/features/research/types.ts for the brand fields). Only the
 * "my-pixar-story" format is renderable in this repo.
 */
import type { MyPixarStoryStoryboard } from "../formats/my-pixar-story/types";

export const AD_SCENE_VERSION = 1 as const;

export type RenderableAdFormatId = "my-pixar-story";

export type HeadlineType =
  | "painful_moment"
  | "receipt_drop"
  | "callout"
  | "contrast"
  | "transformation";

export type ResearchReceipts = {
  specificClaims: string[];
  buyerMoments: string[];
  exactSiteLanguage: string[];
  namedProof: string[];
};

export type BrandSnapshot = {
  name: string;
  url: string;
  host: string;
  title: string;
  description: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  ogImageUrl: string | null;
  screenshotUrl: string | null;
  colors: string[];
  fonts: {
    heading?: string;
    body?: string;
    feel: "serif" | "sans" | "display" | "mono" | "unknown";
  };
  vibeTags: string[];
};

export type BrandAdAngle = {
  buyer: string;
  moment: string;
  pain: string;
  proof: string;
  sitePhrase: string | null;
};

export type AdSceneCaption = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: 1 | 2;
};

export type AdSceneAudioAnalysis = {
  fps: number;
  levels: number[];
  bands: number[][];
};

export type AdSceneAudio =
  | {
    status: "none";
    transcript: "";
    captions: [];
  }
  | {
    status: "generated";
    storageId: string;
    url: string;
    mimeType: string;
    durationMs: number;
    durationSeconds: number;
    transcript: string;
    captions: AdSceneCaption[];
    analysis?: AdSceneAudioAnalysis;
    provider: "gemini" | "upload" | "elevenlabs" | "fish-studio";
    model: string;
    generatedAt: number;
  };

export type AdSceneBackgroundMusic = {
  status: "uploaded";
  storageId: string;
  url: string;
  mimeType: string;
  durationMs: number;
  fileName: string;
  volume: number;
  loop: true;
  addedAt: number;
};

export type AdSceneStyleBase = {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFeel: BrandSnapshot["fonts"]["feel"];
};

export type AdSceneBase<
  TFormat extends string,
  TStyle extends AdSceneStyleBase,
  TLayout extends { preset: string },
> = {
  version: typeof AD_SCENE_VERSION;
  format: TFormat;
  brand: BrandSnapshot & {
    receipts: ResearchReceipts;
  };
  creative: {
    angleId: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    headlineType: HeadlineType;
    selectedPain: string;
    selectedProof: string;
  };
  style: TStyle;
  audio: AdSceneAudio;
  backgroundMusic?: AdSceneBackgroundMusic;
  layout: TLayout;
  metadata: {
    candidateIndex: number;
    generationBatchId: string;
    researchRunId: string;
    brandSnapshotId: string;
    model: string;
    provider: "gemini" | "nvidia-nim" | "openrouter" | "deterministic";
    generatedAt: number;
    adAngles?: BrandAdAngle[];
    selectedProductHandles?: string[];
  };
};

export type MyPixarStoryAdSceneLayout = {
  preset: "my-pixar-story-memoir";
  storyboard: MyPixarStoryStoryboard;
  activeClipUrls?: string[];
  activeKeyframeUrls?: string[];
  musicAudioUrl?: string;
  voiceoverAudioUrl?: string;
};

export type MyPixarStoryAdScene = AdSceneBase<
  "my-pixar-story",
  AdSceneStyleBase,
  MyPixarStoryAdSceneLayout
>;

export type RenderableAdScene = MyPixarStoryAdScene;
