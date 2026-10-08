import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  compileStoryboard,
  compileNarrationScripts,
} from "../../../app/features/formats/my-pixar-story/screenplay";
import {
  compileCharacterDna,
  getAgeProgressionDescriptor,
  buildSeaDanceVideoPrompt,
  PIXAR_AESTHETIC_UNIVERSAL_STYLE,
} from "../../../app/features/formats/my-pixar-story/prompt";
import {
  validateMyPixarStoryInputs,
  validateMyPixarStoryStoryboard,
} from "../../../app/features/formats/my-pixar-story/validate";
import type { MyPixarStoryInputs } from "../../../app/features/formats/my-pixar-story/types";

console.log("=== Running My Pixar Story Smoke Tests ===");

// 1. Load Proof Fixtures
const repoRoot = resolve(process.cwd(), process.cwd().endsWith("/v3") ? ".." : ".");
const steveProofPath = resolve(repoRoot, "docs/proofs/steve-jobs-to-lisa.json");
const marshallProofPath = resolve(repoRoot, "docs/proofs/marshall-mathers-to-hailie.json");

const steveInputs: MyPixarStoryInputs = JSON.parse(readFileSync(steveProofPath, "utf-8"));
const marshallInputs: MyPixarStoryInputs = JSON.parse(readFileSync(marshallProofPath, "utf-8"));

// 2. Validate Steve Jobs Inputs
console.log("Checking Steve Jobs proof input validation...");
const steveValidation = validateMyPixarStoryInputs(steveInputs);
assert.equal(steveValidation.valid, true, `Steve Jobs validation failed: ${steveValidation.errors.join(", ")}`);

// 3. Compile Steve Jobs Storyboard
console.log("Compiling Steve Jobs storyboard...");
const steveStoryboard = compileStoryboard(steveInputs);
assert.equal(steveStoryboard.format, "my-pixar-story");
assert.equal(steveStoryboard.scenes.length, 5);
assert.equal(steveStoryboard.subjectName, "Steve");
assert.equal(steveStoryboard.recipientName, "Lisa");

// Check Scene 1
const s1 = steveStoryboard.scenes[0];
assert.equal(s1.beatNumber, 1);
assert.ok(s1.ageLabel.includes("Childhood"));
assert.ok(s1.narrationScript.length > 0);
assert.ok(s1.seaDanceVideoPrompt.includes("production CG") || s1.seaDanceVideoPrompt.includes("RenderMan"));
assert.ok(s1.characterDnaAgePrompt.includes("boy") || s1.characterDnaAgePrompt.includes("child"));

// Check Scene 2
const s2 = steveStoryboard.scenes[1];
assert.equal(s2.beatNumber, 2);
assert.ok(s2.ageLabel.includes("Teen Years"));
assert.ok(s2.narrationScript.includes("Volkswagen") || s2.narrationScript.includes("microbus"));

// Check Scene 5 (Tearjerker Hug)
const s5 = steveStoryboard.scenes[4];
assert.equal(s5.beatNumber, 5);
assert.ok(s5.ageLabel.includes("Today"));
assert.ok(s5.cameraMovement.includes("slow push-in") || s5.cameraMovement.includes("settling"));

// Validate Compiled Storyboard Structure
const steveSbValidation = validateMyPixarStoryStoryboard(steveStoryboard);
assert.equal(steveSbValidation.valid, true, `Compiled storyboard invalid: ${steveSbValidation.errors.join(", ")}`);

// 4. Validate Marshall Mathers Inputs & Storyboard
console.log("Checking Marshall Mathers proof input validation...");
const marshallValidation = validateMyPixarStoryInputs(marshallInputs);
assert.equal(marshallValidation.valid, true, `Marshall Mathers validation failed: ${marshallValidation.errors.join(", ")}`);

console.log("Compiling Marshall Mathers storyboard...");
const marshallStoryboard = compileStoryboard(marshallInputs);
assert.equal(marshallStoryboard.scenes.length, 5);
assert.equal(marshallStoryboard.subjectName, "Marshall");
assert.equal(marshallStoryboard.recipientName, "Hailie");

const marshallSbValidation = validateMyPixarStoryStoryboard(marshallStoryboard);
assert.equal(marshallSbValidation.valid, true, `Marshall storyboard invalid: ${marshallSbValidation.errors.join(", ")}`);

// 5. Test Validator Failure Cases
console.log("Testing validator failure cases...");

// Audio duration < 10s failure
const shortAudioInputs: MyPixarStoryInputs = {
  ...steveInputs,
  audio: {
    narrationMode: "parent_clone",
    voiceCapture: {
      source: "browser_record",
      audioUrl: "https://assets.wiggly.internal/recordings/short.mp3",
      durationSeconds: 7, // Below 10s gate
    },
  },
};
const shortAudioValidation = validateMyPixarStoryInputs(shortAudioInputs);
assert.equal(shortAudioValidation.valid, false);
assert.ok(shortAudioValidation.errors.some((e) => e.includes("minimum of 10 seconds of speech is strictly required")));

// Missing Scene 1 answer failure
const missingAnswerInputs = {
  ...steveInputs,
  answers: {
    ...steveInputs.answers,
    scene1Childhood: {
      partnerInCrime: "",
      sillyTrouble: "",
      weirdObsession: "",
    },
  },
};
const missingAnswerValidation = validateMyPixarStoryInputs(missingAnswerInputs);
assert.equal(missingAnswerValidation.valid, false);
assert.ok(missingAnswerValidation.errors.some((e) => e.includes("Scene 1 (Childhood) requires")));

// 6. Test Prompt Compiler directly
const dna = compileCharacterDna(steveInputs.subject.keyPhysicalTraits, steveInputs.subject.preferredName);
assert.ok(dna.includes("spectacles"));
assert.ok(dna.includes("lean angular jawline"));
assert.ok(dna.includes("dark brown"));

const ageDesc = getAgeProgressionDescriptor(dna, 1, steveInputs.subject.keyPhysicalTraits);
assert.ok(ageDesc.ageLabel.includes("Childhood"));
assert.ok(ageDesc.characterPrompt.includes("boy") || ageDesc.characterPrompt.includes("child"));

const videoPrompt = buildSeaDanceVideoPrompt(
  1,
  ageDesc.characterPrompt,
  "Running outdoors with golden retriever",
  "Gentle push forward",
  "Golden-hour afternoon sunlight"
);
assert.ok(videoPrompt.includes("feature-quality 3D animated film"));
assert.ok(videoPrompt.includes("Gentle push forward"));
assert.ok(videoPrompt.includes("Golden-hour afternoon sunlight"));

console.log("All My Pixar Story smoke tests passed cleanly! (100% offline, 0 paid calls)");
