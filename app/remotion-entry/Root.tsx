import { Composition } from "remotion";
import type { RenderableAdScene } from "../features/scene/types";
import { defaultRenderScene } from "./fixture";
import { RemotionAdScene } from "./RemotionAdScene";

// Ported from the Wiggly monorepo (v3/remotion-entry/Root.tsx), reduced to the two
// formats this repo ships. runtime/remotion.mjs selects this composition by id.
export const adSceneCompositionId = "AdSceneMp4";
export const adSceneFps = 30;

export const getAdSceneDimensions = (_scene: RenderableAdScene) => ({ width: 1920, height: 1080 });

export const getAdSceneDurationInFrames = (scene: RenderableAdScene, fps = adSceneFps) => {
  if (scene.format === "memoir-film") return Math.round((scene.layout.durationMs / 1000) * fps);
  return Math.max(1, Math.round((scene.layout.storyboard.totalDurationSeconds || 65) * fps));
};

export function RemotionRoot() {
  return (
    <Composition
      id={adSceneCompositionId}
      component={RemotionAdScene}
      width={1920}
      height={1080}
      fps={adSceneFps}
      durationInFrames={1800}
      calculateMetadata={({ props }) => ({
        fps: adSceneFps,
        durationInFrames: getAdSceneDurationInFrames(props.scene, adSceneFps),
        ...getAdSceneDimensions(props.scene),
      })}
      defaultProps={{ scene: defaultRenderScene as RenderableAdScene }}
    />
  );
}
