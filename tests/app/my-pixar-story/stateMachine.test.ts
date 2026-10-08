import assert from "node:assert/strict";
import {
  createInitialInterviewState,
  executeInterviewTurn,
  rollbackToPastCheckpoint,
  compileAnswersFromSession,
} from "../../../app/features/formats/my-pixar-story/stateMachine";
import type { ConfirmedPhysicalTraits } from "../../../app/features/formats/my-pixar-story/types";

console.log("=== Running My Pixar Story State Machine Tests ===");

const mockTraits: ConfirmedPhysicalTraits = {
  gender: "male",
  ageBracket: "40s",
  hairColor: "dark_brown",
  hairStyle: "short",
  eyeColor: "brown",
  glasses: true,
  facialHair: "stubble",
};

// 1. Initial State
console.log("1. Testing initial state creation...");
let session = createInitialInterviewState({
  userId: "user-123",
  subjectName: "David",
  recipientName: "Maya",
  visualProfile: {
    status: "confirmed",
    sourcePhotoUrls: ["https://assets.wiggly.internal/photos/david.jpg"],
    confirmedTraits: mockTraits,
    compiledCharacterDnaPrompt: "A 40-year-old Pixar stylized man with dark brown hair and glasses.",
  },
});

assert.equal(session.pipelineStage, "golden_5_interview");
assert.equal(session.currentActiveSlotId, "scene1Childhood");
assert.equal(session.slots.scene1Childhood.status, "in_progress");
assert.equal(session.checkpoints.length, 0);

// 2. Turn 1: Valid Answer for Scene 1 (Childhood)
console.log("2. Testing Turn 1: Valid answer for Scene 1...");
const turn1 = executeInterviewTurn({
  session,
  userUtterance:
    "When I was 8, my best friend was Toby next door. We were obsessed with building wooden treehouses and digging for pirate treasure, and we accidentally flooded Mr. Henderson's lawn with the garden hose.",
});

assert.equal(turn1.directorResponse.intentRecognized, "slot_answer");
assert.ok(turn1.directorResponse.transitionQuestion.length > 0);
assert.equal(turn1.updatedSession.slots.scene1Childhood.status, "confirmed");
assert.equal(turn1.updatedSession.currentActiveSlotId, "scene2TeenFreedom");
assert.equal(turn1.updatedSession.slots.scene2TeenFreedom.status, "in_progress");
session = turn1.updatedSession;

// 3. Turn 2: Tangent Handling (Bridge & Pivot)
console.log("3. Testing Turn 2: Tangent handling (Bridge & Pivot)...");
const turn2 = executeInterviewTurn({
  session,
  userUtterance:
    "Oh man, speaking of lawns, did I ever tell you about the time my cousin bought a giant lawn tractor? It had a cup holder and headlights, we thought it was hilarious.",
});

assert.equal(turn2.directorResponse.intentRecognized, "tangent_story");
assert.ok(turn2.updatedSession.anecdoteBank.length > 0);
assert.equal(turn2.directorResponse.tangentSavedToMemory, true);
assert.ok(
  turn2.directorResponse.directorMessage.includes("cousin") ||
    turn2.directorResponse.directorMessage.includes("That's fantastic") ||
    turn2.directorResponse.directorMessage.includes("memory")
);
assert.equal(turn2.updatedSession.currentActiveSlotId, "scene2TeenFreedom");
assert.equal(turn2.updatedSession.slots.scene2TeenFreedom.status, "in_progress");
session = turn2.updatedSession;

// 4. Turn 3: Valid Answer for Scene 2 (Teen Freedom)
console.log("4. Testing Turn 3: Valid answer for Scene 2...");
const turn3 = executeInterviewTurn({
  session,
  userUtterance:
    "At 16, my freedom was an old rusty orange Moped that sounded like a blender. I had long messy hair and played bass guitar in a punk band in our basement.",
});

assert.equal(turn3.directorResponse.intentRecognized, "slot_answer");
assert.equal(turn3.updatedSession.slots.scene2TeenFreedom.status, "confirmed");
assert.equal(turn3.updatedSession.currentActiveSlotId, "scene3LeapOfFaith");
session = turn3.updatedSession;

// 5. Turn 4: Meta-question Handling
console.log("5. Testing Turn 4: Meta-question handling...");
const turn4 = executeInterviewTurn({
  session,
  userUtterance: "Wait, how many more questions do we have left to do?",
});

assert.equal(turn4.directorResponse.intentRecognized, "meta_question");
assert.ok(turn4.directorResponse.directorMessage.includes("5 core chapters"));
assert.equal(turn4.updatedSession.currentActiveSlotId, "scene3LeapOfFaith");
session = turn4.updatedSession;

// 6. Turn 5: Valid Answer for Scene 3 (Leap of Faith)
console.log("6. Testing Turn 5: Valid answer for Scene 3...");
const turn5 = executeInterviewTurn({
  session,
  userUtterance:
    "My leap was packing everything into two cardboard boxes and moving to Seattle to take a junior animation job. The moment I saw my first drawing on screen, I knew I made it.",
});

assert.equal(turn5.directorResponse.intentRecognized, "slot_answer");
assert.equal(turn5.updatedSession.slots.scene3LeapOfFaith.status, "confirmed");
assert.equal(turn5.updatedSession.currentActiveSlotId, "scene4Romance");
session = turn5.updatedSession;

// 7. Turn 6: Revision of a Past Slot (Scene 1 revision)
console.log("7. Testing Turn 6: Revision of past slot...");
const turn6 = executeInterviewTurn({
  session,
  userUtterance:
    "Actually, back when I was 8, I should mention Toby and I also had a stray three-legged cat named Barnaby who followed us everywhere.",
});

assert.equal(turn6.directorResponse.intentRecognized, "slot_revision");
assert.equal(turn6.directorResponse.targetSlotId, "scene1Childhood");
assert.ok(turn6.updatedSession.slots.scene1Childhood.userRawTranscript?.includes("Barnaby"));
assert.equal(turn6.updatedSession.currentActiveSlotId, "scene4Romance");
session = turn6.updatedSession;

// 8. Turn 7: Valid Answer for Scene 4 (Romance)
console.log("8. Testing Turn 7: Valid answer for Scene 4...");
const turn7 = executeInterviewTurn({
  session,
  userUtterance:
    "I met your mother at a crowded rainy bus stop under a broken yellow umbrella. I dropped my coffee on her boots, but she just laughed and handed me a tissue.",
});

assert.equal(turn7.directorResponse.intentRecognized, "slot_answer");
assert.equal(turn7.updatedSession.slots.scene4Romance.status, "confirmed");
assert.equal(turn7.updatedSession.currentActiveSlotId, "scene5LegacyFinale");
session = turn7.updatedSession;

// 9. Turn 8: Valid Answer for Scene 5 (Legacy Finale)
console.log("9. Testing Turn 8: Valid answer for Scene 5 (Completion)...");
const turn8 = executeInterviewTurn({
  session,
  userUtterance:
    "I want you kids to know that everything I built was out of love for you. And to little 8-year-old me: hold on tight, it gets really good.",
});

assert.equal(turn8.directorResponse.intentRecognized, "slot_answer");
assert.equal(turn8.updatedSession.slots.scene5LegacyFinale.status, "confirmed");
assert.equal(turn8.updatedSession.pipelineStage, "script_review");
session = turn8.updatedSession;

// 10. Compile Answers from Session
console.log("10. Testing answer compilation from session...");
const compiledAnswers = compileAnswersFromSession(session);
assert.ok(compiledAnswers.scene1Childhood.partnerInCrime.includes("Toby"));
assert.ok(compiledAnswers.scene2TeenFreedom.freedomMachine.includes("Moped"));
assert.ok(compiledAnswers.scene3LeapOfFaith.riskOrAdventure.includes("Seattle"));
assert.ok(compiledAnswers.scene4Romance.howWeMet.includes("umbrella"));
assert.ok(compiledAnswers.scene5LegacyFinale.whatIWishKidsUnderstood.includes("love"));

// 11. Time-Travel Rollback Test
console.log("11. Testing Time-Travel Rollback...");
const firstCheckpoint = session.checkpoints[1]!; // checkpoint saved before Turn 2 (Scene 2 in progress)
const rolledBackSession = rollbackToPastCheckpoint(session, firstCheckpoint.checkpointId);
assert.equal(rolledBackSession.currentActiveSlotId, "scene2TeenFreedom");
assert.equal(rolledBackSession.slots.scene2TeenFreedom.status, "in_progress");
assert.equal(rolledBackSession.slots.scene3LeapOfFaith.status, "unseen");
assert.equal(rolledBackSession.pipelineStage, "golden_5_interview");

console.log("All State Machine tests passed cleanly! (100% offline, 0 paid calls)");
