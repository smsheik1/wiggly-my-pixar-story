/**
 * Standalone format registry. In the Wiggly monorepo this registry holds every
 * ad format; this repo only ships My Pixar Story, so it is the single entry.
 * Shape mirrors wiggly monorepo v3/features/formats/registry.ts.
 */
import type { RenderableAdFormatId } from "../scene/types";
import type { AdFormatModule } from "./types";
import { myPixarStoryFormatModule } from "./my-pixar-story";

export type AnyAdFormatModule = AdFormatModule<string, any>;

export const createFormatRegistry = <TModules extends Record<string, AnyAdFormatModule>>(modules: TModules) => modules;

export const formatRegistry = createFormatRegistry({
  "my-pixar-story": myPixarStoryFormatModule,
} satisfies Record<RenderableAdFormatId, AnyAdFormatModule>);

export const getFormatModuleFromRegistry = <
  TModules extends Record<string, AnyAdFormatModule>,
  TFormat extends keyof TModules & string,
>(
  registry: TModules,
  format: TFormat,
): TModules[TFormat] => {
  const module = registry[format];
  if (!module) throw new Error(`Unknown ad format: ${format}`);
  return module;
};

export const getFormatModule = (format: RenderableAdFormatId): AdFormatModule => {
  return getFormatModuleFromRegistry(formatRegistry, format) as AdFormatModule;
};
