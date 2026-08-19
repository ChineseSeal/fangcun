import {
  PREVIEW_GLYPH_SPRITE_URL,
  previewGlyphIds,
} from "@fangcun/glyph-tools/preview";
import type { GlyphConfidence, GlyphScript } from "@fangcun/glyph-tools";

type GlyphSpecimenProps = {
  character: string;
  className?: string;
  confidence?: GlyphConfidence;
  isModernSealized?: boolean;
  path?: string;
  script?: GlyphScript;
};

const missingGlyphPath = "M150 150H850V850H150ZM240 240L760 760M760 240L240 760";

export function GlyphSpecimen({
  character,
  className = "",
  confidence,
  isModernSealized,
  path,
  script,
}: GlyphSpecimenProps) {
  const glyphId = path ? undefined : previewGlyphIds[character];
  const hasGlyph = Boolean(path || glyphId);
  return (
    <svg
      aria-label={`${character}字形`}
      className={className}
      data-char={character}
      data-glyph-confidence={confidence}
      data-glyph-modern={isModernSealized === undefined ? undefined : String(isModernSealized)}
      data-glyph-status={hasGlyph ? "catalog" : "missing"}
      data-script={script}
      role="img"
      viewBox="0 0 1000 1000"
    >
      {path ? <path d={path} fill="currentColor" fillRule="evenodd" /> : glyphId ? (
        <use fill="currentColor" href={`${PREVIEW_GLYPH_SPRITE_URL}#${glyphId}`} />
      ) : (
        <path d={missingGlyphPath} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="42" />
      )}
    </svg>
  );
}
