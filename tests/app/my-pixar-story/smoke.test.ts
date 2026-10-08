import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
// Fictional fixtures (invented people, no real family data). In the monorepo these were
// docs/proofs/*.json files that were never committed; this repo ships fictional replacements.
const fixturesDir = fileURLToPath(new URL("../fixtures/", import.meta.url));
const theoFixturePath = resolve(fixturesDir, "fictional-theo-to-wren.json");
const dezFixturePath = resolve(fixturesDir, "fictional-dez-to-poppy.json");

const theoInputs: MyPixarStoryInputs = JSON.parse(readFileSync(theoFixturePath, "utf-8"));
const dezInputs: MyPixarStoryInputs = JSON.parse(readFileSync(dezFixturePath, "utf-8"));

// 2. Validate fictional Theo Inputs
console.log("Checking fictional Theo proof input validation...");
const theoValidation = validateMyPixarStoryInputs(theoInputs);
assert.equal(theoValidation.valid, true, `fictional Theo validation failed: ${theoValidation.errors.join(", ")}`);

// 3. Compile fictional Theo Storyboard
console.log("Compiling fictional Theo storyboard...");
const theoStoryboard = compileStoryboard(theoInputs);
assert.equal(theoStoryboard.format, "my-pixar-story");
assert.equal(theoStoryboard.scenes.length, 5);
assert.equal(theoStoryboard.subjectName, "Theo");
assert.equal(theoStoryboard.recipientName, "Wren");

// Check Scene 1
const s1 = theoStoryboard.scenes[0];
assert.equal(s1.beatNumber, 1);
assert.ok(s1.ageLabel.includes("Childhood"));
assert.ok(s1.narrationScript.length > 0);
assert.ok(s1.seaDanceVideoPrompt.includes("production CG") || s1.seaDanceVideoPrompt.includes("RenderMan"));
assert.ok(s1.characterDnaAgePrompt.includes("boy") || s1.characterDnaAgePrompt.includes("child"));

// Check Scene 2
const s2 = theoStoryboard.scenes[1];
assert.equal(s2.beatNumber, 2);
assert.ok(s2.ageLabel.includes("Teen Years"));
assert.ok(s2.narrationScript.includes("Volkswagen") || s2.narrationScript.includes("microbus"));

// Check Scene 5 (Tearjerker Hug)
const s5 = theoStoryboard.scenes[4];
assert.equal(s5.beatNumber, 5);
assert.ok(s5.ageLabel.includes("Today"));
assert.ok(s5.cameraMovement.includes("slow push-in") || s5.cameraMovement.includes("settling"));

// Validate Compiled Storyboard Structure
const theoSbValidation = validateMyPixarStoryStoryboard(theoStoryboard);
assert.equal(theoSbValidation.valid, true, `Compiled storyboard invalid: ${theoSbValidation.errors.join(", ")}`);

// 4. Validate fictional Dez Inputs & Storyboard
console.log("Checking fictional Dez proof input validation...");
const dezValidation = validateMyPixarStoryInputs(dezInputs);
assert.equal(dezValidation.valid, true, `fictional Dez validation failed: ${dezValidation.errors.join(", ")}`);

console.log("Compiling fictional Dez storyboard...");
const dezStoryboard = compileStoryboard(dezInputs);
assert.equal(dezStoryboard.scenes.length, 5);
assert.equal(dezStoryboard.subjectName, "Dez");
assert.equal(dezStoryboard.recipientName, "Poppy");

const dezSbValidation = validateMyPixarStoryStoryboard(dezStoryboard);
assert.equal(dezSbValidation.valid, true, `Fictional Dez storyboard invalid: ${dezSbValidation.errors.join(", ")}`);

// 5. Test Validator Failure Cases
console.log("Testing validator failure cases...");

// Audio duration < 10s failure
const shortAudioInputs: MyPixarStoryInputs = {
  ...theoInputs,
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
  ...theoInputs,
  answers: {
    ...theoInputs.answers,
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
const dna = compileCharacterDna(theoInputs.subject.keyPhysicalTraits, theoInputs.subject.preferredName);
assert.ok(dna.includes("spectacles"));
assert.ok(dna.includes("lean angular jawline"));
assert.ok(dna.includes("dark brown"));

const ageDesc = getAgeProgressionDescriptor(dna, 1, theoInputs.subject.keyPhysicalTraits);
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
