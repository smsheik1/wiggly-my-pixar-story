/**
 * Browser-safe format module (renderer + validator only). The registry and the
 * Remotion bundle import this file, never index.ts, because index.ts re-exports
 * the Node-only provider runners and agent bridge (node:fs, node:child_process).
 */
import type { MyPixarStoryAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { MyPixarStoryFormatRenderer } from "./render";
import { validateMyPixarStoryAdScene } from "./validate";

export const myPixarStoryFormatModule: AdFormatModule<"my-pixar-story", MyPixarStoryAdScene> = {
  id: "my-pixar-story",
  label: "My Pixar Story",
  defaultSlots: ["headline"],
  editorSchema: {
    text: [],
    style: [],
    format: [],
  },
  RenderComponent: MyPixarStoryFormatRenderer,
  validate: validateMyPixarStoryAdScene,
};
