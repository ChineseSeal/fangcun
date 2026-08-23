export type FeatureFlag =
  | "home.livePreview"
  | "viewer3d.enabled"
  | "motion.scrollNarrative";

const defaultFlags: Record<FeatureFlag, boolean> = {
  "home.livePreview": true,
  "viewer3d.enabled": true,
  "motion.scrollNarrative": true,
};

function readOverrides(): Partial<Record<FeatureFlag, boolean>> {
  const raw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  if (!raw) return {};

  return Object.fromEntries(
    raw
      .split(",")
      .map((entry) => entry.trim().split("="))
      .filter(([name]) => name in defaultFlags)
      .map(([name, value]) => [name, value !== "false"]),
  ) as Partial<Record<FeatureFlag, boolean>>;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return readOverrides()[flag] ?? defaultFlags[flag];
}
