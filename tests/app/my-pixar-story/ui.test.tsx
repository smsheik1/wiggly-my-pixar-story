import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PixarCharacterMirrorCard } from "../../../app/features/formats/my-pixar-story/ui/PixarCharacterMirrorCard";
import { PixarAudioRecorderGate } from "../../../app/features/formats/my-pixar-story/ui/PixarAudioRecorderGate";
import { PixarGolden5Stepper } from "../../../app/features/formats/my-pixar-story/ui/PixarGolden5Stepper";
import { CreatePixarStorySheet, PixarStoryIntakeForm } from "../../../app/features/formats/my-pixar-story/ui/CreatePixarStorySheet";
import type { ConfirmedPhysicalTraits, Golden5Answers } from "../../../app/features/formats/my-pixar-story/types";

const mockTraits: ConfirmedPhysicalTraits = {
  gender: "male",
  ageBracket: "70s+",
  hairColor: "grey",
  hairStyle: "short",
  eyeColor: "hazel",
  glasses: true,
  facialHair: "mustache",
  signatureTraits: ["kind eyes"],
};

const mockAnswers: Golden5Answers = {
  scene1Childhood: {
    partnerInCrime: "my dog Rusty",
    sillyTrouble: "rockets in garden",
    weirdObsession: "superhero drawings",
  },
  scene2TeenFreedom: {
    freedomMachine: "1974 Beetle",
    secretTeenIdentity: "drummer",
  },
  scene3LeapOfFaith: {
    riskOrAdventure: "clock shop",
    triumphMoment: "church bell chime",
  },
  scene4Romance: {
    howWeMet: "music shop",
    awkwardDateMoment: "dropped ice cream",
    theMomentIKnew: "she laughed and offered half",
  },
  scene5LegacyFinale: {
    whatIWishKidsUnderstood: "loved every second",
    timeMachineMessageToChildSelf: "cherish the quiet days",
  },
};

function runUiTests() {
  console.log("Running Milestone 6: Intake UI & Stepper on /create tests...");

  // 1. PixarCharacterMirrorCard markup check
  const mirrorHtml = renderToStaticMarkup(
    createElement(PixarCharacterMirrorCard, {
      traits: mockTraits,
      onChange: () => {},
    })
  );
  assert.ok(mirrorHtml.includes("4-Tap Character Mirror"));
  assert.ok(mirrorHtml.includes("DNA LOCKED"));
  assert.ok(mirrorHtml.includes("1. Hair Color"));
  assert.ok(mirrorHtml.includes("2. Eye Color"));
  assert.ok(mirrorHtml.includes("3. Eyewear"));
  assert.ok(mirrorHtml.includes("4. Facial Hair"));

  // 2. PixarAudioRecorderGate markup check
  const audioHtml = renderToStaticMarkup(
    createElement(PixarAudioRecorderGate, {
      onAudioReady: () => {},
    })
  );
  assert.ok(audioHtml.includes("Voice Clone Gate (10-Second Minimum)"));
  assert.ok(audioHtml.includes("0/10s REQUIRED"));

  // 3. PixarGolden5Stepper markup check
  const stepperHtml = renderToStaticMarkup(
    createElement(PixarGolden5Stepper, {
      answers: mockAnswers,
      onChange: () => {},
    })
  );
  assert.ok(stepperHtml.includes("Scene 1"));
  assert.ok(stepperHtml.includes("Scene 5"));
  assert.ok(stepperHtml.includes("The Kid"));
  assert.ok(stepperHtml.includes("superhero drawings"));

  // 4. PixarStoryIntakeForm markup check
  const formHtml = renderToStaticMarkup(
    createElement(PixarStoryIntakeForm, {
      onSceneCreated: () => {},
    })
  );
  assert.ok(formHtml.includes("Create Your 3D Family Memoir"));
  assert.ok(formHtml.includes("Build 5-Chapter Pixar Cut"));

  console.log("Milestone 6: Intake UI & Stepper tests passed!");
}

runUiTests();
