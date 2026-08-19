import { glyphShardLoaders } from "./generated/shard-loaders.generated";
import { deriveModernStyleVariants } from "./derived-variants";
import { manualGlyphCatalog } from "./manual-catalog";
import { importedVariants, type GeneratedGlyphRow } from "./variant-factory";
import type { GlyphVariant } from "./index";

export { GLYPH_ASSET_VERSION } from "./variant-factory";

type ShardKey = keyof typeof glyphShardLoaders;
type ShardModule = { glyphShardData: GeneratedGlyphRow[] };

const shardCache = new Map<ShardKey, Promise<ShardModule>>();

function keyForCharacter(character: string): ShardKey | null {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return null;
  const key = Math.floor(codePoint / 256).toString(16).padStart(2, "0") as ShardKey;
  return key in glyphShardLoaders ? key : null;
}

function loadShard(key: ShardKey): Promise<ShardModule> {
  const cached = shardCache.get(key);
  if (cached) return cached;
  const pending = glyphShardLoaders[key]() as Promise<ShardModule>;
  shardCache.set(key, pending);
  return pending;
}

export async function loadGlyphCatalogForText(text: string): Promise<readonly GlyphVariant[]> {
  const characters = new Set(Array.from(text));
  const keys = Array.from(characters)
    .map(keyForCharacter)
    .filter((key): key is ShardKey => key !== null);
  const uniqueKeys = Array.from(new Set(keys));
  const modules = await Promise.all(uniqueKeys.map(loadShard));
  const rows = modules
    .flatMap((module) => module.glyphShardData)
    .filter((row) => characters.has(row[1]));
  const sourceCatalog = [
    ...importedVariants(rows),
    ...manualGlyphCatalog.filter((variant) => characters.has(variant.character)),
  ];
  return [...sourceCatalog, ...deriveModernStyleVariants(sourceCatalog)];
}
