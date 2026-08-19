import webPackage from "../package.json";
import { GLYPH_ASSET_VERSION } from "@fangcun/glyph-tools/server";
import { ENGINE_VERSION } from "@fangcun/seal-engine";
import { env } from "./env";

export const runtimeVersion = {
  appVersion: webPackage.version,
  engineVersion: ENGINE_VERSION,
  assetVersion: GLYPH_ASSET_VERSION,
  environment: env.appEnv,
} as const;
