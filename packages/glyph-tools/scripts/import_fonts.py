#!/usr/bin/env python3
"""Build Fangcun's versioned SVG Glyph catalog from pinned open font assets."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
import math
from pathlib import Path
import re

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.momentsPen import MomentsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "assets" / "sources"
GENERATED = ROOT / "src" / "generated"
ASSET_VERSION = "2026.08.2"
PREVIEW_SPRITE_FILENAME = f"fangcun-preview-{ASSET_VERSION}.svg"
NUMBER_PATTERN = re.compile(r"-?(?:\d+\.?\d*|\.\d+)")
HISTORICAL_ALIASES: dict[str, tuple[str, ...]] = {
    "庵": ("奄",),
    "藏": ("臧",),
}
PREVIEW_COMPONENTS: dict[str, tuple[tuple[str, str], ...]] = {
    # 《说文》字库没有现代输入“谱”；预览印面以“言”+“普”组成传统字形，
    # 保持字符语义，不把单独的声符“普”冒充完整字形。
    "谱": (
        ("言", "translate(-16 0) scale(.5 1)"),
        ("普", "translate(368 0) scale(.62 1)"),
    ),
}


@dataclass(frozen=True)
class NormalizedOutline:
    path: str
    bbox: tuple[float, float, float, float]
    visual_center: tuple[float, float]
    ink_density: float
    complexity: int
    contour_count: int


def compact_number(value: float) -> float | int:
    rounded = round(value, 2)
    return int(rounded) if rounded.is_integer() else rounded


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def quantize_path(path: str) -> str:
    """Round normalized path coordinates to integer design units."""
    return NUMBER_PATTERN.sub(lambda match: str(round(float(match.group()))), path)


def load_character_mapping(path: Path) -> dict[str, tuple[str, ...]]:
    mapping: dict[str, tuple[str, ...]] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        source, targets = line.split("\t", 1)
        mapping[source] = tuple(targets.split())
    return mapping


def cjk_cmap(font: TTFont) -> dict[int, str]:
    return {
        codepoint: glyph_name
        for codepoint, glyph_name in (font.getBestCmap() or {}).items()
        if 0x3400 <= codepoint <= 0x9FFF
    }


def normalize_outline(
    font: TTFont,
    glyph_name: str,
    max_extent: int = 840,
) -> NormalizedOutline | None:
    glyph_set = font.getGlyphSet()
    glyph = glyph_set[glyph_name]
    bounds_pen = BoundsPen(glyph_set)
    glyph.draw(bounds_pen)
    if bounds_pen.bounds is None:
        return None
    x_min, y_min, x_max, y_max = bounds_pen.bounds
    width = x_max - x_min
    height = y_max - y_min
    if width <= 0 or height <= 0:
        return None

    scale = min(max_extent / width, max_extent / height)
    translate_x = 500 - ((x_min + x_max) / 2) * scale
    translate_y = 500 + ((y_min + y_max) / 2) * scale
    svg_pen = SVGPathPen(glyph_set)
    transform_pen = TransformPen(
        svg_pen,
        (scale, 0, 0, -scale, translate_x, translate_y),
    )
    glyph.draw(transform_pen)
    path = quantize_path(svg_pen.getCommands())
    if not path:
        return None

    moments_pen = MomentsPen(glyph_set)
    glyph.draw(moments_pen)
    area = moments_pen.area
    if not math.isfinite(area) or abs(area) < 1:
        return None
    source_center_x = moments_pen.momentX / area
    source_center_y = moments_pen.momentY / area
    visual_center = (
        source_center_x * scale + translate_x,
        -source_center_y * scale + translate_y,
    )
    bbox = (
        x_min * scale + translate_x,
        -y_max * scale + translate_y,
        x_max * scale + translate_x,
        -y_min * scale + translate_y,
    )
    complexity = math.ceil(len(NUMBER_PATTERN.findall(path)) / 2)
    density = abs(area) * scale * scale / 1_000_000
    return NormalizedOutline(
        path=path,
        bbox=tuple(compact_number(value) for value in bbox),
        visual_center=tuple(compact_number(value) for value in visual_center),
        ink_density=round(density, 4),
        complexity=complexity,
        contour_count=max(1, path.count("Z")),
    )


def outline_is_publishable(outline: NormalizedOutline) -> bool:
    return (
        0.05 <= outline.ink_density <= 0.85
        and all(-2 <= value <= 1002 for value in outline.bbox)
        and all(math.isfinite(value) for value in (*outline.bbox, *outline.visual_center))
        and outline.path.count("M") == outline.path.count("Z")
    )


def tuple_for(
    character: str,
    source_character: str,
    outline: NormalizedOutline,
    source_id: str,
) -> list[object]:
    digest = sha256(
        f"{ASSET_VERSION}|{source_id}|{character}|{source_character}|{outline.path}".encode()
    ).hexdigest()[:16]
    return [
        character,
        source_character,
        outline.path,
        *outline.bbox,
        *outline.visual_center,
        outline.ink_density,
        outline.complexity,
        outline.contour_count,
        digest,
    ]


def write_preview_assets(
    module_path: Path,
    sprite_path: Path,
    preview_characters: str,
    guxi_rows: list[list[object]],
    xiaozhuan_rows: list[list[object]],
    manual_glyphs: list[dict[str, object]],
) -> list[str]:
    preferred: dict[str, str] = {}
    for row in xiaozhuan_rows:
        preferred.setdefault(str(row[0]), str(row[2]))
    for row in guxi_rows:
        preferred.setdefault(str(row[0]), str(row[2]))
    for glyph in manual_glyphs:
        preferred[str(glyph["character"])] = str(glyph["svgPath"])
    found = {character: preferred[character] for character in preview_characters if character in preferred}
    composites = {
        character: components
        for character, components in PREVIEW_COMPONENTS.items()
        if character in preview_characters and all(component in preferred for component, _ in components)
    }
    found.update({character: "" for character in composites})
    missing = sorted(set(preview_characters) - set(found))
    ids = {character: f"glyph-{ord(character):x}" for character in found}
    lines = [
        "// Generated by scripts/import_fonts.py. Do not edit by hand.",
        f'export const PREVIEW_GLYPH_SPRITE_URL = "/glyphs/{PREVIEW_SPRITE_FILENAME}";',
        "export const previewGlyphIds: Readonly<Record<string, string>> = {",
    ]
    lines.extend(
        f"  {json.dumps(character, ensure_ascii=False)}: {json.dumps(ids[character])},"
        for character in sorted(found)
    )
    lines.append("};\n")
    module_path.write_text("\n".join(lines), encoding="utf-8")

    sprite_path.parent.mkdir(parents=True, exist_ok=True)
    for stale_sprite in sprite_path.parent.glob("fangcun-preview-*.svg"):
        if stale_sprite != sprite_path:
            stale_sprite.unlink()
    symbols = [
        '<svg xmlns="http://www.w3.org/2000/svg">',
        f"<!-- Generated by packages/glyph-tools/scripts/import_fonts.py; asset {ASSET_VERSION}. -->",
        "<defs>",
    ]
    for character, svg_path in sorted(found.items()):
        if character in composites:
            component_paths = "".join(
                f'<g transform="{transform}"><path d="{preferred[component]}" fill-rule="evenodd"/></g>'
                for component, transform in composites[character]
            )
            symbols.append(f'<g id="{ids[character]}">{component_paths}</g>')
        else:
            symbols.append(f'<g id="{ids[character]}"><path d="{svg_path}" fill-rule="evenodd"/></g>')
    symbols.extend(["</defs>", "</svg>\n"])
    sprite_path.write_text("\n".join(symbols), encoding="utf-8")
    return missing


def write_manual_module(path: Path, manual_glyphs: list[dict[str, object]]) -> None:
    rows = []
    for glyph in manual_glyphs:
        svg_path = str(glyph["svgPath"])
        rows.append({
            **glyph,
            "complexity": math.ceil(len(NUMBER_PATTERN.findall(svg_path)) / 2),
            "assetHash": sha256(svg_path.encode()).hexdigest()[:16],
        })
    path.write_text(
        "// Generated by scripts/import_fonts.py from assets/manual-glyphs.json. Do not edit by hand.\n"
        f"export const manualGlyphData = {json.dumps(rows, ensure_ascii=False, separators=(',', ':'))} as const;\n",
        encoding="utf-8",
    )


def write_sharded_modules(
    generated_root: Path,
    guxi_rows: list[list[object]],
    xiaozhuan_rows: list[list[object]],
) -> None:
    shards_root = generated_root / "shards"
    shards_root.mkdir(parents=True, exist_ok=True)
    for stale_shard in shards_root.glob("glyphs-*.generated.ts"):
        stale_shard.unlink()
    shards: dict[str, list[list[object]]] = {}
    for script, rows in (("xiaozhuan", xiaozhuan_rows), ("guxi", guxi_rows)):
        for row in rows:
            key = f"{ord(str(row[0])) // 256:02x}"
            shards.setdefault(key, []).append([script, *row])

    tuple_type = """export type GeneratedGlyphShardTuple = [
  script: \"xiaozhuan\" | \"guxi\",
  character: string,
  sourceCharacter: string,
  svgPath: string,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
  visualCenterX: number,
  visualCenterY: number,
  inkDensity: number,
  complexity: number,
  strokeCount: number,
  assetHash: string,
];
"""
    for key, rows in sorted(shards.items()):
        lines = [
            "// Generated by scripts/import_fonts.py. Do not edit by hand.",
            tuple_type.rstrip(),
            "export const glyphShardData: GeneratedGlyphShardTuple[] = [",
        ]
        lines.extend(f"  {json.dumps(row, ensure_ascii=False, separators=(',', ':'))}," for row in rows)
        lines.append("];\n")
        (shards_root / f"glyphs-{key}.generated.ts").write_text("\n".join(lines), encoding="utf-8")

    loader_lines = [
        "// Generated by scripts/import_fonts.py. Do not edit by hand.",
        "export const glyphShardLoaders = {",
    ]
    loader_lines.extend(
        f'  "{key}": () => import("./shards/glyphs-{key}.generated"),'
        for key in sorted(shards)
    )
    loader_lines.append("} as const;\n")
    (generated_root / "shard-loaders.generated.ts").write_text(
        "\n".join(loader_lines), encoding="utf-8"
    )

    aggregate_lines = [
        "// Generated by scripts/import_fonts.py. Do not edit by hand.",
        *(
            f'import {{ glyphShardData as shard{key} }} from "./shards/glyphs-{key}.generated";'
            for key in sorted(shards)
        ),
        "",
        "export const allGlyphShardData = [",
        *(f"  ...shard{key}," for key in sorted(shards)),
        "];\n",
    ]
    (generated_root / "all-shards.generated.ts").write_text(
        "\n".join(aggregate_lines), encoding="utf-8"
    )


def main() -> None:
    GENERATED.mkdir(parents=True, exist_ok=True)
    guxi_path = SOURCES / "JFZSKSealScript_V3.ttf"
    xiaozhuan_path = SOURCES / "CNS-Shuowen.ttf"
    mapping_path = SOURCES / "OpenCC-STCharacters.txt"
    guxi_font = TTFont(guxi_path)
    xiaozhuan_font = TTFont(xiaozhuan_path)
    guxi_cmap = cjk_cmap(guxi_font)
    xiaozhuan_cmap = cjk_cmap(xiaozhuan_font)
    character_mapping = load_character_mapping(mapping_path)
    manual_glyphs = json.loads((ROOT / "assets" / "manual-glyphs.json").read_text(encoding="utf-8"))

    guxi_rows: list[list[object]] = []
    xiaozhuan_rows: list[list[object]] = []
    excluded: list[dict[str, object]] = []
    outline_cache: dict[tuple[str, str], NormalizedOutline | None] = {}

    def cached_outline(
        kind: str,
        font: TTFont,
        glyph_name: str,
        max_extent: int,
    ) -> NormalizedOutline | None:
        key = (kind, glyph_name)
        if key not in outline_cache:
            outline_cache[key] = normalize_outline(font, glyph_name, max_extent)
        return outline_cache[key]

    for codepoint, glyph_name in sorted(guxi_cmap.items()):
        character = chr(codepoint)
        # The Zhongshan source deliberately has finer strokes. A larger em fill
        # preserves that character while bringing publishable outlines into the
        # product's documented density band without synthetic emboldening.
        outline = cached_outline("guxi", guxi_font, glyph_name, 960)
        if outline is None or not outline_is_publishable(outline):
            excluded.append({"script": "guxi", "character": character, "reason": "quality_gate"})
            continue
        guxi_rows.append(tuple_for(character, character, outline, "jfzsk-v3"))

    # Publish the complete Shuowen source and add input aliases at import time.
    # The resulting variants keep sourceCharacter explicit; runtime rendering
    # never performs locale-dependent conversion on a historical glyph.
    xiaozhuan_inputs: dict[str, list[str]] = {
        chr(codepoint): [chr(codepoint)] for codepoint in xiaozhuan_cmap
    }
    for character, targets in character_mapping.items():
        for target in targets:
            if len(target) == 1 and ord(target) in xiaozhuan_cmap:
                xiaozhuan_inputs.setdefault(character, []).append(target)
    for character, targets in HISTORICAL_ALIASES.items():
        for target in targets:
            if ord(target) in xiaozhuan_cmap:
                xiaozhuan_inputs.setdefault(character, []).append(target)

    for character, candidates in sorted(xiaozhuan_inputs.items()):
        seen: set[str] = set()
        for source_character in candidates:
            if len(source_character) != 1 or source_character in seen:
                continue
            seen.add(source_character)
            glyph_name = xiaozhuan_cmap.get(ord(source_character))
            if glyph_name is None:
                continue
            outline = cached_outline("xiaozhuan", xiaozhuan_font, glyph_name, 840)
            if outline is None or not outline_is_publishable(outline):
                excluded.append(
                    {
                        "script": "xiaozhuan",
                        "character": character,
                        "sourceCharacter": source_character,
                        "reason": "quality_gate",
                    }
                )
                continue
            xiaozhuan_rows.append(
                tuple_for(character, source_character, outline, "cns-shuowen-2017")
            )

    preview_characters = "".join(
        dict.fromkeys((ROOT / "assets" / "preview-characters.txt").read_text(encoding="utf-8"))
    ).replace("\n", "")
    preview_sprite_path = ROOT.parents[1] / "apps" / "web" / "public" / "glyphs" / PREVIEW_SPRITE_FILENAME
    preview_missing = write_preview_assets(
        GENERATED / "preview-glyphs.generated.ts",
        preview_sprite_path,
        preview_characters,
        guxi_rows,
        xiaozhuan_rows,
        manual_glyphs,
    )
    write_manual_module(GENERATED / "manual-glyphs.generated.ts", manual_glyphs)
    write_sharded_modules(GENERATED, guxi_rows, xiaozhuan_rows)
    available_input_characters = len({str(row[0]) for row in guxi_rows + xiaozhuan_rows})
    report = {
        "assetVersion": ASSET_VERSION,
        "sources": {
            "jfzsk-v3": {"sha256": file_hash(guxi_path), "cjkCoverage": len(guxi_cmap)},
            "cns-shuowen-2017": {
                "sha256": file_hash(xiaozhuan_path),
                "cjkCoverage": len(xiaozhuan_cmap),
            },
            "opencc-stcharacters": {"sha256": file_hash(mapping_path)},
            "fangcun-manual": {"sha256": file_hash(ROOT / "assets" / "manual-glyphs.json")},
        },
        "published": {
            "guxiVariants": len(guxi_rows),
            "xiaozhuanVariants": len(xiaozhuan_rows),
            "uniqueInputCharacters": available_input_characters,
            "onDemandModernStyleCoverage": {
                "jiaguwen": available_input_characters,
                "jinwen": available_input_characters,
                "guxi": available_input_characters,
                "han_seal": available_input_characters,
                "bird_worm": available_input_characters,
            },
        },
        "quality": {
            "highComplexityGuxi": sum(int(row[10]) > 800 for row in guxi_rows),
            "highComplexityXiaozhuan": sum(int(row[10]) > 800 for row in xiaozhuan_rows),
        },
        "excluded": excluded,
        "previewMissing": preview_missing,
        "previewSprite": {
            "file": PREVIEW_SPRITE_FILENAME,
            "glyphs": len(set(preview_characters) - set(preview_missing)),
            "sha256": file_hash(preview_sprite_path),
        },
    }
    (GENERATED / "catalog-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report["published"], ensure_ascii=False))
    print(f"excluded={len(excluded)} previewMissing={''.join(preview_missing) or 'none'}")


if __name__ == "__main__":
    main()
