import { allGlyphShardData } from "./generated/all-shards.generated";
import { manualGlyphCatalog } from "./manual-catalog";
import { importedVariants } from "./variant-factory";

export { GLYPH_ASSET_VERSION } from "./variant-factory";

export const glyphCatalog = Object.freeze([
  ...importedVariants(allGlyphShardData),
  ...manualGlyphCatalog,
]);

/** @deprecated Use glyphCatalog. Kept while older callers migrate. */
export const seedGlyphCatalog = glyphCatalog;
