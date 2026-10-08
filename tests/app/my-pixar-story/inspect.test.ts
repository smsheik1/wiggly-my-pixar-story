import assert from "node:assert/strict";
import { compileStoryboard } from "../../../app/features/formats/my-pixar-story/screenplay";
import { createMyPixarStoryScene } from "../../../app/features/scene/createMyPixarStoryScene";
import { inspectMediaQuality, generateProductionReceipt } from "../../../app/features/formats/my-pixar-story/inspect";
import type { MyPixarStoryInputs } from "../../../app/features/formats/my-pixar-story/types";

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

async function runInspectTests() {
  console.log("Running Milestone 5: Media Quality Inspection & Receipts tests...");

  const storyboard = compileStoryboard(mockInputs);
  const completeScene = createMyPixarStoryScene({
    storyboard,
    activeClipUrls: [
      "https://video.internal/clip1.mp4",
      "https://video.internal/clip2.mp4",
      "https://video.internal/clip3.mp4",
      "https://video.internal/clip4.mp4",
      "https://video.internal/clip5.mp4",
    ],
    voiceoverAudioUrl: "https://audio.internal/voice.mp3",
  });

  // 1. Full scene passes inspection
  const passResult = inspectMediaQuality(completeScene);
  assert.equal(passResult.passed, true);
  assert.equal(passResult.contactSheetVerified, true);
  assert.equal(passResult.audioContinuityPassed, true);
  assert.equal(passResult.characterDnaConsistent, true);

  // Verify Accordion Camera System on compiled scenes
  const scenes = completeScene.layout.storyboard.scenes;
  assert.equal(scenes[0].shotScale, "medium_story");
  assert.equal(scenes[0].focalLength, "50mm");
  assert.equal(scenes[1].shotScale, "wide_establishing");
  assert.equal(scenes[1].focalLength, "35mm");
  assert.equal(scenes[2].shotScale, "medium_story");
  assert.equal(scenes[2].focalLength, "50mm");
  assert.equal(scenes[3].shotScale, "medium_close");
  assert.equal(scenes[3].focalLength, "65mm");
  assert.equal(scenes[4].shotScale, "intimate_close_up");
  assert.equal(scenes[4].focalLength, "85mm");

  // 2. Incomplete contact sheet detection
  const incompleteScene = createMyPixarStoryScene({
    storyboard,
    activeClipUrls: ["https://video.internal/clip1.mp4"], // only 1 clip
  });
  const incompleteResult = inspectMediaQuality(incompleteScene);
  assert.equal(incompleteResult.contactSheetVerified, false);
  assert.ok(
    incompleteResult.issues.some((i) => i.message.includes("Contact sheet incomplete")),
    "Must flag incomplete contact sheet."
  );

  // 3. Draft receipt generation (480p building tier)
  const draftReceipt = generateProductionReceipt({
    scene: completeScene,
    isCheckoutExport: false,
  });
  assert.equal(draftReceipt.format, "my-pixar-story");
  assert.equal(draftReceipt.tier, "draft_building_480p");
  assert.equal(draftReceipt.models.resolution, "480p");
  assert.equal(draftReceipt.models.video, "seadance-2.0-mini");
  assert.equal(draftReceipt.models.image, "muse-image-1.0");
  assert.equal(draftReceipt.sceneCount, 5);
  assert.equal(draftReceipt.beats.length, 5);
  assert.ok(draftReceipt.checksum.length === 64, "Checksum must be a valid 64-char SHA-256 hex string.");
  assert.equal(draftReceipt.subjectName, "Artie");
  assert.equal(draftReceipt.recipientName, "Lily");

  // 4. Checkout final export receipt generation (1080p high fidelity tier)
  const finalReceipt = generateProductionReceipt({
    scene: completeScene,
    isCheckoutExport: true,
  });
  assert.equal(finalReceipt.tier, "checkout_final_1080p");
  assert.equal(finalReceipt.models.resolution, "1080p");
  assert.equal(finalReceipt.models.video, "seadance-2.5");
  assert.equal(finalReceipt.models.image, "muse-image-1.0");
  assert.ok(finalReceipt.checksum.length === 64);

  console.log("Milestone 5: Media Quality Inspection & Receipts tests passed!");
}

runInspectTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
