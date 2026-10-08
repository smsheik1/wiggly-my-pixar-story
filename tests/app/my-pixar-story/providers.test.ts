import assert from "node:assert/strict";
import {
  synthesizeSceneNarration,
  generateSceneVideoClip,
  generateKeyframeImage,
  animateKeyframeWithGeminiOmni,
} from "../../../app/features/formats/my-pixar-story/providers";

async function runProviderTests() {
  console.log("Running Milestone 4: Provider Runners & Rule 12 Error Boundaries tests...");

  // 1. Mock runner verification (0 external API calls)
  const mockAudio = await synthesizeSceneNarration({
    text: "I remember when we built that rocket in Mrs. Gable's yard.",
    mock: true,
  });
  assert.equal(mockAudio.isMock, true);
  assert.ok(mockAudio.audioUrl.startsWith("mock://cartesia/audio/"));
  assert.ok(mockAudio.durationSeconds > 0);

  const mockVideo = await generateSceneVideoClip({
    prompt: "Pixar 3D animated scene of a young kid running in warm golden hour light",
    beatNumber: 1,
    resolution: "480p",
    mock: true,
  });
  assert.equal(mockVideo.isMock, true);
  assert.equal(mockVideo.beatNumber, 1);
  assert.equal(mockVideo.resolution, "480p");
  assert.ok(mockVideo.videoUrl.includes("seadance-beat-1-480p.mp4"));

  // Mock keyframe generation: default Meta Muse Image 1.0
  const mockImageMuse = await generateKeyframeImage({
    prompt: "Pixar 3D animation still frame of an energetic 8-year-old boy in a workshop",
    beatNumber: 1,
    mock: true,
  });
  assert.equal(mockImageMuse.isMock, true);
  assert.equal(mockImageMuse.beatNumber, 1);
  assert.equal(mockImageMuse.provider, "meta-muse");
  assert.equal(mockImageMuse.model, "muse-image-1.0");
  assert.ok(mockImageMuse.imageUrl.includes("pixar-keyframe-beat-1.jpg"));

  // Mock keyframe generation: optional Replicate
  const mockImageReplicate = await generateKeyframeImage({
    prompt: "Pixar 3D animation still frame",
    beatNumber: 2,
    provider: "replicate",
    mock: true,
  });
  assert.equal(mockImageReplicate.isMock, true);
  assert.equal(mockImageReplicate.beatNumber, 2);
  assert.equal(mockImageReplicate.provider, "replicate");
  assert.equal(mockImageReplicate.model, "google/nano-banana-2-lite");

  // Mock Gemini Omni 1.1 Flash Video Animation (default flex tier)
  const mockOmniVideo = await animateKeyframeWithGeminiOmni({
    prompt: "Pixar 3D animated scene of child in workshop",
    beatNumber: 1,
    mock: true,
  });
  assert.equal(mockOmniVideo.isMock, true);
  assert.equal(mockOmniVideo.model, "gemini-omni-1.1-flash");
  assert.equal(mockOmniVideo.serviceTier, "flex");
  assert.equal(mockOmniVideo.beatNumber, 1);
  assert.ok(mockOmniVideo.videoUrl.includes("mock://gemini-omni/video/"));
  assert.equal(mockOmniVideo.escalatedFromFlex, false);

  // Mock Gemini Omni with isFinalPerfected = true (promotes to standard tier)
  const mockOmniPerfected = await animateKeyframeWithGeminiOmni({
    prompt: "Pixar 3D animated scene of child in workshop",
    beatNumber: 1,
    isFinalPerfected: true,
    mock: true,
  });
  assert.equal(mockOmniPerfected.serviceTier, "standard");
  assert.ok(mockOmniPerfected.videoUrl.includes("beat-1-standard.mp4"));

  // 2. Cost Guardrail verification (1080p requires isCheckoutFinalExport)
  await assert.rejects(
    async () => {
      await generateSceneVideoClip({
        prompt: "Pixar 3D animated scene",
        beatNumber: 2,
        resolution: "1080p",
        isCheckoutFinalExport: false,
        mock: false,
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("[Cost Guardrail] 1080p video generation is reserved exclusively"),
        "Must halt on unapproved 1080p draft generation."
      );
      return true;
    }
  );

  // 3. Rule 12 Zero-Silent-Fallback Verification for Cartesia Voice
  await assert.rejects(
    async () => {
      await synthesizeSceneNarration({
        text: "Testing missing key error message",
        mock: false,
        explicitApiKey: "", // explicitly missing
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("❌ VOICE SYNTHESIS FAILURE: CARTESIA_API_KEY IS MISSING"),
        "Must yell loudly with exact failure header."
      );
      assert.ok(
        err.message.includes("https://play.cartesia.ai/keys"),
        "Must provide click-by-click URL to keys."
      );
      assert.ok(
        err.message.includes("https://play.cartesia.ai/settings/billing"),
        "Must provide billing URL to check character balance."
      );
      assert.ok(
        err.message.includes("secrets.env"),
        "Must specify exact secrets.env file path."
      );
      return true;
    }
  );

  // 4. Rule 12 Zero-Silent-Fallback Verification for SeaDance Video
  await assert.rejects(
    async () => {
      await generateSceneVideoClip({
        prompt: "Pixar 3D animated scene",
        beatNumber: 3,
        resolution: "480p",
        mock: false,
        explicitApiKey: "", // explicitly missing
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("❌ SEADANCE VIDEO GENERATION FAILURE: SEADANCE_API_KEY IS MISSING"),
        "Must yell loudly with exact SeaDance failure header."
      );
      assert.ok(
        err.message.includes("https://seadance.ai/dashboard/api-keys"),
        "Must provide SeaDance dashboard URL."
      );
      assert.ok(
        err.message.includes("https://seadance.ai/billing"),
        "Must provide SeaDance billing URL."
      );
      assert.ok(
        err.message.includes("SEADANCE_API_KEY=your_copied_key_here"),
        "Must provide exact line to paste into secrets.env."
      );
      return true;
    }
  );

  // 5. Rule 12 Zero-Silent-Fallback Verification for Meta Muse Image
  await assert.rejects(
    async () => {
      await generateKeyframeImage({
        prompt: "Pixar 3D keyframe",
        beatNumber: 1,
        provider: "meta-muse",
        mock: false,
        explicitApiKey: "", // explicitly missing
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("❌ META MUSE IMAGE GENERATION FAILURE: META_API_KEY IS MISSING"),
        "Must yell loudly with exact Meta Muse failure header."
      );
      assert.ok(
        err.message.includes("https://dev.meta.ai"),
        "Must provide Meta developer URL."
      );
      assert.ok(
        err.message.includes("META_API_KEY=your_meta_key_here"),
        "Must provide exact line to paste into secrets.env."
      );
      return true;
    }
  );

  // 6. Rule 12 Zero-Silent-Fallback Verification for Replicate Image
  await assert.rejects(
    async () => {
      await generateKeyframeImage({
        prompt: "Pixar 3D keyframe",
        beatNumber: 2,
        provider: "replicate",
        mock: false,
        explicitApiKey: "", // explicitly missing
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("❌ REPLICATE IMAGE GENERATION FAILURE: REPLICATE_API_TOKEN IS MISSING"),
        "Must yell loudly with exact Replicate failure header."
      );
      assert.ok(
        err.message.includes("https://replicate.com/account/api-tokens"),
        "Must provide Replicate tokens URL."
      );
      assert.ok(
        err.message.includes("REPLICATE_API_TOKEN=your_token_here"),
        "Must provide exact line to paste into secrets.env."
      );
      return true;
    }
  );

  // 7. Rule 12 Zero-Silent-Fallback Verification for Gemini Omni Video
  await assert.rejects(
    async () => {
      await animateKeyframeWithGeminiOmni({
        prompt: "Pixar 3D animated scene",
        beatNumber: 1,
        mock: false,
        explicitApiKey: "", // explicitly missing
      });
    },
    (err: Error) => {
      assert.ok(
        err.message.includes("❌ GEMINI OMNI VIDEO GENERATION FAILURE: GEMINI_API_KEY IS MISSING"),
        "Must yell loudly with exact Gemini Omni failure header."
      );
      assert.ok(
        err.message.includes("https://aistudio.google.com/app/apikey"),
        "Must provide Google AI Studio key URL."
      );
      assert.ok(
        err.message.includes("GEMINI_API_KEY=your_key_here"),
        "Must provide exact line to paste into secrets.env."
      );
      return true;
    }
  );

  // 8. Circuit Breaker: Automatic Escalation from Flex to Standard after >2 Google errors
  const callTiers: string[] = [];
  const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string) as { service_tier: string };
    callTiers.push(body.service_tier);

    if (callTiers.length <= 3) {
      // First 3 calls on flex return capacity / rate limit errors (errors > 2)
      return new Response(JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED: capacity unavailable" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4th call is escalated to standard and succeeds
    return new Response(
      JSON.stringify({
        steps: [
          {
            type: "model_output",
            content: [{ type: "video", data: "AAAAIGZ0eXBtcDQyAAAAAG1wNDJtcDQx" }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as unknown as typeof fetch;

  const escalatedResult = await animateKeyframeWithGeminiOmni({
    prompt: "Pixar 3D animated scene",
    beatNumber: 1,
    explicitApiKey: "test-fake-key",
    fetchFn: fakeFetch,
  });

  // Verify that it attempted 3 times on flex, then escalated to standard on 4th call
  assert.deepEqual(callTiers, ["flex", "flex", "flex", "standard"]);
  assert.equal(escalatedResult.serviceTier, "standard");
  assert.equal(escalatedResult.escalatedFromFlex, true);
  assert.equal(escalatedResult.flexErrorCount, 3);
  assert.ok(escalatedResult.videoUrl.startsWith("data:video/mp4;base64,"));

  // 9. Fast-fail on non-transient error (e.g. 400 Bad Request) without retrying or silent fallback
  let nonTransientCalls = 0;
  const badRequestFetch = (async () => {
    nonTransientCalls++;
    return new Response(JSON.stringify({ error: "Invalid prompt syntax" }), { status: 400 });
  }) as unknown as typeof fetch;

  await assert.rejects(
    async () => {
      await animateKeyframeWithGeminiOmni({
        prompt: "Invalid prompt syntax",
        beatNumber: 1,
        explicitApiKey: "test-fake-key",
        fetchFn: badRequestFetch,
      });
    },
    (err: Error) => {
      assert.ok(err.message.includes("❌ GEMINI OMNI API ERROR (HTTP 400)"));
      assert.equal(nonTransientCalls, 1, "Must not retry non-transient errors.");
      return true;
    }
  );

  console.log("Milestone 4: Provider runners and Rule 12 error boundary tests passed!");
}

runProviderTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
