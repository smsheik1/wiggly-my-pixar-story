import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileStoryboard } from "../../../app/features/formats/my-pixar-story/screenplay";
import { createMyPixarStoryScene } from "../../../app/features/scene/createMyPixarStoryScene";
import { AdRenderSurface } from "../../../app/features/render/AdRenderSurface";
import type { MyPixarStoryInputs, FamilyScrapbookArtifact } from "../../../app/features/formats/my-pixar-story/types";

const mockMemorabilia: FamilyScrapbookArtifact[] = [
  {
    id: "artifact-beat-2",
    beatNumber: 2,
    artifactType: "ticket",
    assetUrl: "https://assets.wiggly.internal/scrapbook/drive-in-ticket-1976.jpg",
    description: "An authentic worn 1976 drive-in movie ticket stub",
    placementInScene: "corkboard",
    caption: "Drive-In Movie 1976",
  },
  {
    id: "artifact-beat-4",
    beatNumber: 4,
    artifactType: "photo",
    assetUrl: "https://assets.wiggly.internal/scrapbook/wedding-day-vintage.jpg",
    description: "A vintage sepia-toned photograph of Mom and Dad at the cafe",
    placementInScene: "photo_frame",
    caption: "The Day We Met",
  },
];

const mockInputsWithScrapbook: MyPixarStoryInputs = {
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
  familyMemorabilia: mockMemorabilia,
};

function runScrapbookTests() {
  console.log("Running Milestone 8: v2 Realism & Scrapbook Memorabilia tests...");

  // 1. Storyboard compilation with attached memorabilia
  const storyboard = compileStoryboard(mockInputsWithScrapbook);
  assert.ok(storyboard.familyMemorabilia?.length === 2);

  // Beat 2 check
  const scene2 = storyboard.scenes[1]!;
  assert.equal(scene2.beatNumber, 2);
  assert.ok(scene2.scrapbookArtifact);
  assert.equal(scene2.scrapbookArtifact.id, "artifact-beat-2");
  assert.ok(
    scene2.seaDanceVideoPrompt.includes("corkboard"),
    "Prompt must inject background placement."
  );
  assert.ok(
    scene2.seaDanceVideoPrompt.includes("ticket stub"),
    "Prompt must describe authentic keepsake."
  );

  // Beat 4 check
  const scene4 = storyboard.scenes[3]!;
  assert.equal(scene4.beatNumber, 4);
  assert.ok(scene4.scrapbookArtifact);
  assert.equal(scene4.scrapbookArtifact.id, "artifact-beat-4");
  assert.ok(scene4.seaDanceVideoPrompt.includes("photo frame"));

  // 2. Canonical AdScene creation
  const scene = createMyPixarStoryScene({ storyboard });

  // 3. AdRenderSurface rendering check (Rule 1 & Rule 9 parity)
  // At timeSeconds = 15 (Chapter 2: ~13s to 26s), the Polaroid for artifact-beat-2 must render
  const beat2Html = renderToStaticMarkup(
    createElement(AdRenderSurface, {
      scene,
      timeSeconds: 15,
      mode: "preview",
    })
  );
  assert.ok(
    beat2Html.includes('data-scrapbook-artifact="artifact-beat-2"'),
    "Chapter 2 must render the Polaroid keepsake."
  );
  assert.ok(beat2Html.includes("Drive-In Movie 1976"), "Polaroid caption must be displayed.");

  // At timeSeconds = 42 (Chapter 4: ~39s to 52s), the Polaroid for artifact-beat-4 must render
  const beat4Html = renderToStaticMarkup(
    createElement(AdRenderSurface, {
      scene,
      timeSeconds: 42,
      mode: "preview",
    })
  );
  assert.ok(
    beat4Html.includes('data-scrapbook-artifact="artifact-beat-4"'),
    "Chapter 4 must render the Polaroid keepsake."
  );
  assert.ok(beat4Html.includes("The Day We Met"), "Chapter 4 caption must be displayed.");

  // At timeSeconds = 2 (Chapter 1: 0s to 13s), no scrapbook artifact was attached
  const beat1Html = renderToStaticMarkup(
    createElement(AdRenderSurface, {
      scene,
      timeSeconds: 2,
      mode: "preview",
    })
  );
  assert.ok(
    !beat1Html.includes("data-scrapbook-artifact="),
    "Chapter 1 has no artifact and should not render an empty polaroid."
  );

  console.log("Milestone 8: v2 Realism & Scrapbook Memorabilia tests passed!");
}

runScrapbookTests();
