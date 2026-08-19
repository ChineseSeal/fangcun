"use client";

import { useMemo, useState } from "react";
import {
  getInscriptionFaces,
  inscriptionScripts,
  type InscriptionSide,
  type SealDsl,
} from "@fangcun/dsl-schema";
import type { Locale } from "@/lib/i18n";
import { isEnglish } from "@/lib/i18n";
import {
  createInscriptionRubbingSvg,
  createInscriptionTemplate,
  inscriptionScriptLabels,
  inscriptionSideLabels,
  inscriptionSideOrder,
} from "@/lib/side-inscription";
import styles from "./side-inscription-editor.module.css";

type SideInscriptionEditorProps = {
  dsl: SealDsl;
  exporting: boolean;
  locale: Locale;
  onChange: (inscription: SealDsl["inscription"]) => void;
  onCommit: (inscription: SealDsl["inscription"]) => void;
  onExport: () => void;
};

function updateFaces(
  inscription: SealDsl["inscription"],
  side: InscriptionSide,
  text: string,
): SealDsl["inscription"] {
  const faces = getInscriptionFaces(inscription)
    .filter((face) => face.side !== side)
    .concat(text ? [{ side, text: Array.from(text).slice(0, 32).join("") }] : [])
    .sort((left, right) => inscriptionSideOrder.indexOf(left.side) - inscriptionSideOrder.indexOf(right.side));
  const primary = faces[0] ?? { side, text: "" };
  return {
    ...inscription,
    enabled: faces.length > 0,
    faces,
    side: primary.side,
    text: primary.text,
  };
}

export function SideInscriptionEditor({
  dsl,
  exporting,
  locale,
  onChange,
  onCommit,
  onExport,
}: SideInscriptionEditorProps) {
  const english = isEnglish(locale);
  const copy = (chinese: string, englishText: string) => english ? englishText : chinese;
  const [selectedSide, setSelectedSide] = useState<InscriptionSide>("front");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const faces = getInscriptionFaces(dsl.inscription);
  const currentText = faces.find((face) => face.side === selectedSide)?.text ?? "";
  const rubbingSvg = useMemo(() => {
    if (!dsl.inscription.enabled || faces.length === 0) return "";
    try {
      return createInscriptionRubbingSvg(dsl);
    } catch {
      return "";
    }
  }, [dsl, faces.length]);

  function changeInscription(overrides: Partial<SealDsl["inscription"]>, commit = false) {
    const next = { ...dsl.inscription, ...overrides };
    onChange(next);
    if (commit) onCommit(next);
  }

  function applyTemplate() {
    const text = createInscriptionTemplate({ date, name, place });
    if (text) {
      const next = updateFaces(dsl.inscription, selectedSide, text);
      onChange(next);
      onCommit(next);
    }
  }

  return (
    <details className={styles.editor} data-testid="side-inscription-editor">
      <summary>
        <span>{copy("边款", "Side inscription")}</span>
        <small>{faces.length > 0 ? copy(`${faces.length} 面`, `${faces.length} ${faces.length === 1 ? "face" : "faces"}`) : copy("未添加", "Not added")}</small>
      </summary>

      <p className={styles.intro}>{copy(
        "在印石四侧添加阴刻款识；每面最多 32 字，3D 与拓片从同一 Seal DSL 派生。",
        "Add incised inscriptions to up to four sides. Each face supports 32 characters; 3D and rubbings derive from the same Seal DSL.",
      )}</p>

      <div aria-label={copy("边款面", "Inscription face")} className={styles.faceTabs} role="group">
        {inscriptionSideOrder.map((side) => {
          const face = faces.find((item) => item.side === side);
          return (
            <button
              aria-pressed={selectedSide === side}
              data-has-inscription={Boolean(face?.text)}
              key={side}
              onClick={() => setSelectedSide(side)}
              type="button"
            >
              {english ? inscriptionSideLabels[side].en : inscriptionSideLabels[side].zh}
              {face?.text ? <span aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <label className={styles.field}>
        <span>{copy(`${inscriptionSideLabels[selectedSide].zh}款识`, `${inscriptionSideLabels[selectedSide].en} inscription`)}</span>
        <textarea
          aria-describedby="inscription-character-count"
          lang="zh-Hans"
          maxLength={32}
          onChange={(event) => onChange(updateFaces(dsl.inscription, selectedSide, event.target.value))}
          onBlur={() => onCommit(dsl.inscription)}
          placeholder={copy("如：丙午年方寸刻于杭州", "For example: 丙午年方寸刻于杭州")}
          rows={3}
          value={currentText}
        />
      </label>
      <div className={styles.textMeta}>
        <small id="inscription-character-count">{Array.from(currentText).length} / 32</small>
        {currentText ? <button onClick={() => {
          const next = updateFaces(dsl.inscription, selectedSide, "");
          onChange(next);
          onCommit(next);
        }} type="button">{copy("移除此面", "Remove this face")}</button> : null}
      </div>

      <fieldset className={styles.choiceGroup}>
        <legend>{copy("边款书体", "Inscription script")}</legend>
        <div>
          {inscriptionScripts.map((script) => (
            <button
              aria-pressed={dsl.inscription.script === script}
              data-script={script}
              key={script}
              onClick={() => changeInscription({ script }, true)}
              type="button"
            >
              {english ? inscriptionScriptLabels[script].en : inscriptionScriptLabels[script].zh}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.choiceGroup}>
        <legend>{copy("阴刻刀法", "Incised knife style")}</legend>
        <div>
          {(["single", "double"] as const).map((knife) => (
            <button
              aria-pressed={dsl.inscription.knife === knife}
              key={knife}
              onClick={() => changeInscription({ knife }, true)}
              type="button"
            >
              {knife === "single" ? copy("单刀", "Single cut") : copy("双刀", "Double cut")}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.template}>
        <legend>{copy("年月名款地点模板", "Date, maker, and place template")}</legend>
        <label><span>{copy("年月", "Date")}</span><input maxLength={12} onChange={(event) => setDate(event.target.value)} placeholder={copy("丙午年", "丙午年")} value={date} /></label>
        <label><span>{copy("名款", "Maker")}</span><input maxLength={8} onChange={(event) => setName(event.target.value)} placeholder={copy("方寸", "方寸")} value={name} /></label>
        <label><span>{copy("地点", "Place")}</span><input maxLength={8} onChange={(event) => setPlace(event.target.value)} placeholder={copy("杭州", "杭州")} value={place} /></label>
        <button disabled={!date.trim() && !name.trim() && !place.trim()} onClick={applyTemplate} type="button">{copy("应用到当前面", "Apply to current face")}</button>
      </fieldset>

      {rubbingSvg ? (
        <div className={styles.rubbing}>
          <div aria-label={copy("边款拓片预览", "Side-inscription rubbing preview")} dangerouslySetInnerHTML={{ __html: rubbingSvg }} role="img" />
          <button disabled={exporting} onClick={onExport} type="button">{copy("导出黑底白字拓片 SVG", "Export black-ground rubbing SVG")}</button>
        </div>
      ) : (
        <p className={styles.empty}>{copy("输入任一面款识后可预览并导出拓片。", "Enter an inscription on any face to preview and export a rubbing.")}</p>
      )}
    </details>
  );
}
