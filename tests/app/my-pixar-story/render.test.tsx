import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MyPixarStoryFormatRenderer } from "../../../app/features/formats/my-pixar-story/render";
import { compileStoryboard } from "../../../app/features/formats/my-pixar-story/screenplay";
import type { MyPixarStoryInputs, MyPixarStoryAdScene } from "../../../app/features/formats/my-pixar-story/types";

console.log("=== Running My Pixar Story Renderer Tests ===");

const mockInputs: MyPixarStoryInputs = {
  subject: {
    fullName: "Arthur Pendelton",
    preferredName: "Artie",
    recipientName: "Lily",
    relationshipToRecipient: "grandparent",
    referencePhotoUrls: ["https://assets.wiggly.internal/photos/artie1.jpg"],
    gender: "male",
    keyPhysicalTraits: {
      gender: "male",
      ageBracket: "70s+",
      hairColor: "grey",
      hairStyle: "short",
      eyeColor: "hazel",
      glasses: true,
      facialHair: "mustache",
    },
  },
  audio: {
    narrationMode: "parent_clone",
  },
  answers: {
    scene1Childhood: {
      partnerInCrime: "my golden retriever Rusty",
      sillyTrouble: "launching baking soda rockets into Mrs. Gable's petunias",
      weirdObsession: "drawing elaborate superhero blueprints in my spiral notebook",
    },
    scene2TeenFreedom: {
      freedomMachine: "a rattle-trap sky blue 1974 Volkswagen Beetle",
      secretTeenIdentity: "drumming in a terribly loud garage rock band called The Sparks",
    },
    scene3LeapOfFaith: {
      riskOrAdventure: "moving across the country with two suitcases and sixty dollars to open my clock workshop",
      triumphMoment: "the day the town square church bell chimed after I spent all night fixing its gears",
    },
    scene4Romance: {
      howWeMet: "we both reached for the very same vintage jazz record at Murray's Music Shop",
      awkwardDateMoment: "dropping my ice cream cone straight onto my shoes on our first boardwalk walk",
      theMomentIKnew: "when she laughed until tears came out and offered me half her cone",
    },
    scene5LegacyFinale: {
      whatIWishKidsUnderstood: "every gray hair was earned having the absolute time of my life with your mother and you kids",
      timeMachineMessageToChildSelf: "don't hurry growing up so fast little buddy, the quiet ordinary days are the magical ones",
    },
  },
  tone: "heartwarming_tearjerker",
};

const storyboard = compileStoryboard(mockInputs);

const mockScene: MyPixarStoryAdScene = {
  version: 1,
  format: "my-pixar-story",
  brand: {
    name: "Artie's Story",
    url: "",
    host: "wiggly.internal",
    title: "Artie's Story",
    description: "Memoir",
    logoUrl: null,
    faviconUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#FFAA00", "#112233"],
    fonts: { feel: "sans" },
    vibeTags: ["pixar", "memoir"],
    receipts: {
      specificClaims: [],
      buyerMoments: [],
      exactSiteLanguage: [],
      namedProof: [],
    },
  },
  creative: {
    angleId: "artie-memoir",
    headline: "Artie's Story",
    subheadline: "For Lily",
    ctaText: "Watch Memoir",
    headlineType: "transformation",
    selectedPain: "Cherish memories",
    selectedProof: "5 animated chapters",
  },
  style: {
    backgroundColor: "#0D1117",
    textColor: "#FFFFFF",
    accentColor: "#FFB238",
    fontFeel: "sans",
  },
  audio: {
    status: "none",
    transcript: "",
    captions: [],
  },
  layout: {
    preset: "my-pixar-story-memoir",
    storyboard,
    activeClipUrls: [
      "https://assets.wiggly.internal/clips/artie-scene1.mp4",
      "https://assets.wiggly.internal/clips/artie-scene2.mp4",
      "https://assets.wiggly.internal/clips/artie-scene3.mp4",
      "https://assets.wiggly.internal/clips/artie-scene4.mp4",
      "https://assets.wiggly.internal/clips/artie-scene5.mp4",
    ],
  },
  metadata: {
    candidateIndex: 0,
    generationBatchId: "test-batch",
    researchRunId: "test-run",
    brandSnapshotId: "test-snapshot",
    model: "seadance-2.0-mini",
    provider: "deterministic",
    generatedAt: Date.now(),
  },
};

// 1. Scene 1 Render (t = 5s)
console.log("Testing Scene 1 render at t = 5s...");
const htmlScene1 = renderToStaticMarkup(
  createElement(MyPixarStoryFormatRenderer, {
    scene: mockScene,
    timeSeconds: 5,
  })
);
assert.ok(htmlScene1.includes("Chapter 1: The Wonder Years"), "Scene 1 badge not rendered.");
assert.ok(htmlScene1.includes("Lily"), "Dedication to Lily not rendered.");
assert.ok(htmlScene1.includes("artie-scene1.mp4"), "Scene 1 video clip source not rendered.");

// 2. Scene 2 Render (t = 18s)
console.log("Testing Scene 2 render at t = 18s...");
const htmlScene2 = renderToStaticMarkup(
  createElement(MyPixarStoryFormatRenderer, {
    scene: mockScene,
    timeSeconds: 18,
  })
);
assert.ok(htmlScene2.includes("Chapter 2: The Freedom Machine"), "Scene 2 badge not rendered.");
assert.ok(htmlScene2.includes("artie-scene2.mp4"), "Scene 2 video clip source not rendered.");

// 3. Scene 3 Render (t = 32s)
console.log("Testing Scene 3 render at t = 32s...");
const htmlScene3 = renderToStaticMarkup(
  createElement(MyPixarStoryFormatRenderer, {
    scene: mockScene,
    timeSeconds: 32,
  })
);
assert.ok(htmlScene3.includes("Chapter 3: The Leap of Faith"), "Scene 3 badge not rendered.");

// 4. Scene 4 Render (t = 45s)
console.log("Testing Scene 4 render at t = 45s...");
const htmlScene4 = renderToStaticMarkup(
  createElement(MyPixarStoryFormatRenderer, {
    scene: mockScene,
    timeSeconds: 45,
  })
);
assert.ok(htmlScene4.includes("Chapter 4: The Origin of Us"), "Scene 4 badge not rendered.");

// 5. Scene 5 Render (t = 58s)
console.log("Testing Scene 5 render at t = 58s...");
const htmlScene5 = renderToStaticMarkup(
  createElement(MyPixarStoryFormatRenderer, {
    scene: mockScene,
    timeSeconds: 58,
  })
);
assert.ok(htmlScene5.includes("Chapter 5: What I Wish You Knew"), "Scene 5 badge not rendered.");
assert.ok(htmlScene5.includes("artie-scene5.mp4"), "Scene 5 video clip source not rendered.");

console.log("All My Pixar Story Renderer tests passed cleanly! (100% offline, 0 paid calls)");
