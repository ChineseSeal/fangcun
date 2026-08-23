# Glyph Asset Sources

Asset version `2026.08.2` was imported on 2026-08-10. Generated paths are normalized, independently hashed SVG assets; the source fonts are not used for runtime text rendering.

## CNS11643 Shuowen

- Asset: `sources/CNS-Shuowen.ttf`
- Source: [CNS11643 font download](https://www.cns11643.gov.tw/downloadList.jsp?ID=2&ID2=20), 2017-12-13 release
- SHA-256: `e8501dc9747190936a222576c9b0b6f918ff335afa5696c3fda3acba1a9574e2`
- License: [Government Open Data License 1.0 / OFL notice](https://www.cns11643.gov.tw/pageView.jsp?ID=59&la=1)
- Attribution: Ministry of Digital Affairs, CNS11643 Chinese Standard Interchange Code
- Limits: these are standardized digital forms based on the transmitted *Shuowen Jiezi* text. `attested` describes a documented textual source, not an archaeological attestation for every character.

## JFZSKSealScript V3

- Asset: `sources/JFZSKSealScript_V3.ttf`; repository pinned at `a12bf04c0413da28e46cba3d16184ac91ad1bc96`
- Source: [JFZSKSealScript](https://github.com/jeffi369/JFZSKSealScript)
- SHA-256: `97b8ffdc5a715838a7be659aca626bfa4710ecd35e7eccb3ae2ffb2b7de2c250`
- License: SIL Open Font License 1.1; copyright 2025 Jingfeng Liu. The local license copy is `sources/OFL-JFZSKSealScript.txt`.
- Limits: the font is inspired by Warring States Zhongshan bronzes and extends that style to modern characters. Imported variants are marked `inferred` and `isModernSealized`; they are not presented as literal excavated forms.

## OpenCC Character Mapping

- Asset: `sources/OpenCC-STCharacters.txt`; repository pinned at `5249273a3e5606852f088c9a8b23522145d94f78`
- Source: [OpenCC](https://github.com/BYVoid/OpenCC)
- SHA-256: `a0ca1601c70648cf48b33c3c6210ccbecc5c7eead4b4c3daf76587ba2c03582b`
- License: Apache-2.0; local copy `sources/LICENSE-OpenCC.txt`
- Limits: mappings create input aliases only. Every variant retains `sourceCharacter`; the runtime never converts historical glyph paths by locale.

## Fangcun Modern Sealization

The small fallback set in `assets/manual-glyphs.json` is project-authored geometry under CC BY 4.0 and is compiled through `src/manual-catalog.ts`. These variants are marked `generated`, include per-path hashes, and must be labeled as modern sealization in UI and engine warnings.

### On-demand historical-style coverage

`src/derived-variants.ts` deterministically derives Jiaguwen, Jinwen, missing GuXi, Han-seal, and Bird-worm variants from an already licensed source path. This gives every one of the 8,925 supported input characters an exact selectable variant in those five product styles without shipping five duplicate path catalogs. The output is independently hashed, tagged `modern-style-extension`, marked `generated` and `isModernSealized`, and names its base source in metadata.

These variants are **visual style extensions, not archaeological transcriptions**. Oracle-bone and bronze corpora contain far fewer graph forms than modern Chinese, and a historical form cannot honestly exist for every modern name character. Future per-character artifact or seal-rubbing imports take precedence automatically because the derivation layer only fills a script when no exact sourced variant exists.

Install the pinned importer with `python3 -m pip install -r packages/glyph-tools/requirements.txt`, then regenerate with `pnpm --filter @fangcun/glyph-tools generate:glyphs`. The pipeline writes Unicode-sharded server modules and a versioned Web SVG symbol sprite, so runtime APIs load only the characters requested and client JavaScript contains no glyph paths. Review `src/generated/catalog-report.json` before changing `GLYPH_ASSET_VERSION`; published variant contents are immutable.
