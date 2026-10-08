import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatRegistry, getFormatModule } from "../../app/features/formats/registry";
import { validateMyPixarStoryAdScene } from "../../app/features/formats/my-pixar-story/validate";
import { createMyPixarStoryScene } from "../../app/features/scene/createMyPixarStoryScene";
import { compileStoryboard } from "../../app/features/formats/my-pixar-story/screenplay";
import { AdRenderSurface } from "../../app/features/render/AdRenderSurface";
import type { MyPixarStoryInputs } from "../../app/features/formats/my-pixar-story/types";

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
      signatureTraits: ["friendly crinkles around eyes", "trim gray mustache"],
    },
  },
  audio: {
    narrationMode: "parent_clone",
    voiceCapture: {
      source: "browser_record",
      audioUrl: "https://audio.internal/sample.mp3",
      durationSeconds: 15,
    },
  },

  answers: {
    scene1Childhood: {
      partnerInCrime: "my mischievous golden retriever Rusty",
      sillyTrouble: "launching baking soda rockets that landed in Mrs. Gable's prized petunia bed",
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

// 1. Format Registry verification
const formatModule = getFormatModule("my-pixar-story");
assert.equal(formatModule.id, "my-pixar-story");
assert.equal(formatModule.label, "My Pixar Story");
assert.equal(typeof formatModule.validate, "function");
assert.equal(typeof formatModule.RenderComponent, "function");
assert.equal(formatRegistry["my-pixar-story"].id, "my-pixar-story");

// 2. Scene creation and validation
const storyboard = compileStoryboard(mockInputs);
const scene = createMyPixarStoryScene({
  storyboard,
  activeClipUrls: [
    "https://video.internal/clip1.mp4",
    "https://video.internal/clip2.mp4",
    "https://video.internal/clip3.mp4",
    "https://video.internal/clip4.mp4",
    "https://video.internal/clip5.mp4",
  ],
  activeKeyframeUrls: [
    "https://images.internal/kf1.png",
    "https://images.internal/kf2.png",
    "https://images.internal/kf3.png",
    "https://images.internal/kf4.png",
    "https://images.internal/kf5.png",
  ],
  musicAudioUrl: "https://music.internal/pixar-theme.mp3",
  voiceoverAudioUrl: "https://audio.internal/voiceover.mp3",
});

const validation = validateMyPixarStoryAdScene(scene);
assert.ok(validation.valid, `Scene should be valid: ${validation.errors.join(", ")}`);

// Validator edge cases
const invalidScene1 = { ...scene, format: "invalid-format" };
assert.equal(validateMyPixarStoryAdScene(invalidScene1).valid, false);

const invalidScene2 = { ...scene, layout: { ...scene.layout, preset: "wrong-preset" } };
assert.equal(validateMyPixarStoryAdScene(invalidScene2).valid, false);

// 3. AdRenderSurface single-renderer verification (Rule 1 & Rule 9 Parity)
const timecheckSeconds = [0, 13, 26, 39, 52];

for (const timeSec of timecheckSeconds) {
  const html = renderToStaticMarkup(
    createElement(AdRenderSurface, {
      scene,
      timeSeconds: timeSec,
      mode: "preview",
    })
  );

  assert.ok(html.includes("data-render-surface=\"ad\""), "AdRenderSurface wrapper must be present.");
  assert.ok(html.includes("data-format=\"my-pixar-story\""), "Format must be marked on the render surface.");
  assert.ok(html.includes("Artie"), "Subject preferred name must render in the layout.");
}

console.log("My Pixar Story format registry and AdRenderSurface parity tests passed.");
