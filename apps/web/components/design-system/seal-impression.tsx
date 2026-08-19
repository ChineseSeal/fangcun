import {
  PREVIEW_GLYPH_SPRITE_URL,
  previewGlyphIds,
} from "@fangcun/glyph-tools/preview";
import type { Locale } from "@/lib/i18n";
import { isEnglish } from "@/lib/i18n";
import styles from "./design-system.module.css";

type SealShape = "circle" | "irregular" | "square" | "tall";
type SealMode = "black" | "outline" | "solid";

type SealImpressionProps = {
  className?: string;
  mode?: SealMode;
  shape?: SealShape;
  text: string;
  locale?: Locale;
};

type GlyphPosition = { x: number; y: number; scale: number };

const missingGlyphPath = "M150 150H850V850H150ZM240 240L760 760M760 240L240 760";

function glyphPositions(characters: string[], shape: SealShape): GlyphPosition[] {
  if (shape === "tall") {
    if (characters.length <= 1) return [{ x: 24, y: 24, scale: 0.052 }];
    if (characters.length === 2) return [
      { x: 24, y: 4, scale: 0.052 },
      { x: 24, y: 46, scale: 0.052 },
    ];
    return characters.slice(0, 4).map((_, index) => ({
      x: 36,
      y: 7 + index * 21,
      scale: 0.028,
    }));
  }
  if (characters.length <= 1) return [{ x: 10, y: 10, scale: 0.08 }];
  if (characters.length === 2) return [
    { x: 24, y: 4, scale: 0.052 },
    { x: 24, y: 46, scale: 0.052 },
  ];
  return characters.slice(0, 4).map((_, index) => ({
    x: index % 2 === 0 ? 4 : 46,
    y: index < 2 ? 4 : 46,
    scale: 0.052,
  }));
}

export function SealImpression({
  className = "",
  locale = "zh-Hans",
  mode = "outline",
  shape = "square",
  text,
}: SealImpressionProps) {
  const characters = Array.from(text || "方寸").slice(0, 4);
  const positions = glyphPositions(characters, shape);
  const foreground = mode === "black" ? "#27221d" : "#b52618";
  const paper = "#f8f1e4";
  const background = mode === "solid" ? foreground : "transparent";
  const glyphColor = mode === "solid" ? paper : foreground;
  const radius = shape === "circle" ? 50 : shape === "irregular" ? 12 : 5;

  return (
    <svg
      className={`${styles.sealImpression} ${className}`}
      data-glyph-renderer="fangcun-paths"
      viewBox="0 0 100 100"
      role="img"
      aria-label={isEnglish(locale) ? `Chinese seal with the inscription ${text}` : `${text}印章`}
    >
      {shape === "circle" ? (
        <circle cx="50" cy="50" r="43" fill={background} stroke={foreground} strokeWidth="3.2" />
      ) : (
        <rect x={shape === "tall" ? 22 : 8} y="7" width={shape === "tall" ? 56 : 84} height="86" rx={radius} fill={background} stroke={foreground} strokeWidth="3.2" />
      )}
      {characters.map((character, index) => {
        const position = positions[index];
        const glyphId = previewGlyphIds[character];
        if (!position) return null;
        if (glyphId) {
          return (
            <use
              data-char={character}
              data-glyph-status="catalog"
              fill={glyphColor}
              href={`${PREVIEW_GLYPH_SPRITE_URL}#${glyphId}`}
              key={`${character}-${index}`}
              transform={`translate(${position.x} ${position.y}) scale(${position.scale})`}
            />
          );
        }
        return (
          <path
            data-char={character}
            data-glyph-status="missing"
            d={missingGlyphPath}
            fill="none"
            fillRule="evenodd"
            key={`${character}-${index}`}
            stroke={glyphColor}
            strokeLinecap="round"
            strokeWidth={42}
            transform={`translate(${position.x} ${position.y}) scale(${position.scale})`}
          />
        );
      })}
    </svg>
  );
}
