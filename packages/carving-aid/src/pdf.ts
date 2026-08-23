// PDFKit's self-contained build includes its AFM assets, but the DefinitelyTyped
// package does not expose this supported distribution subpath.
// @ts-expect-error -- runtime shape matches the typed default PDFDocument export.
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import SVGtoPDF from "svg-to-pdfkit";
import type { CarvingProof } from "./index";

const PDF_POINTS_PER_MM = 72 / 25.4;
const SHEET_MARGIN_MM = 8;
const SHEET_GAP_MM = 10;
const SHEET_LABEL_MM = 10;
const SHEET_FOOTER_MM = 16;

export type CarvingPdfPage = {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
};

function replaceTextContent(svg: string, source: string, replacement: string): string {
  return svg.replace(
    new RegExp(`(<text\\b[^>]*>)${source}(<\\/text>)`, "g"),
    `$1${replacement}$2`,
  );
}

function createPdfSheetSvg(sheetSvg: string): string {
  return [
    ["正稿（钤出效果）", "NORMAL / STAMPED"],
    ["反稿（上石用）", "MIRRORED"],
    ["10 mm 校验标尺 · 打印时请选择 100% / 实际大小", "10 mm SCALE / PRINT 100%"],
    ["方寸 Fangcun · 刻制前请再次核对正反", "FANGCUN / CHECK SIDES"],
  ].reduce(
    (svg, [source, replacement]) => replaceTextContent(svg, source, replacement),
    sheetSvg,
  )
    .replace(/font-family="serif"/g, 'font-family="Times-Roman"')
    .replace(/font-family="sans-serif"/g, 'font-family="Helvetica"');
}

export function deriveCarvingPdfPage(proof: CarvingProof): CarvingPdfPage {
  const widthMm = SHEET_MARGIN_MM * 2
    + proof.dimensions.widthMm * 2
    + SHEET_GAP_MM;
  const heightMm = SHEET_MARGIN_MM
    + SHEET_LABEL_MM
    + proof.dimensions.heightMm
    + SHEET_FOOTER_MM;

  return {
    widthMm,
    heightMm,
    widthPt: widthMm * PDF_POINTS_PER_MM,
    heightPt: heightMm * PDF_POINTS_PER_MM,
  };
}

export async function createCarvingProofPdf(proof: CarvingProof): Promise<Uint8Array> {
  const pageMetrics = deriveCarvingPdfPage(proof);
  const chunks: Uint8Array[] = [];
  const warnings: string[] = [];
  const document = new PDFDocument({
    autoFirstPage: false,
    compress: false,
    info: {
      Author: "Fangcun",
      CreationDate: new Date("2026-01-01T00:00:00.000Z"),
      Creator: "Fangcun Carving Aid",
      Keywords: "fangcun,carving,one-to-one,mirror,vector",
      ModDate: new Date("2026-01-01T00:00:00.000Z"),
      Subject: `1:1 vector carving proof; geometry ${proof.geometryHash}`,
      Title: `Fangcun Carving Proof ${proof.dimensions.widthMm}x${proof.dimensions.heightMm}mm`,
    },
    margin: 0,
    size: [pageMetrics.widthPt, pageMetrics.heightPt],
  });

  const output = new Promise<Uint8Array>((resolve, reject) => {
    document.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    document.on("end", () => {
      const byteLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(bytes);
    });
    document.on("error", reject);
  });

  document.addPage({
    margin: 0,
    size: [pageMetrics.widthPt, pageMetrics.heightPt],
  });

  SVGtoPDF(document, createPdfSheetSvg(proof.sheetSvg), 0, 0, {
    height: pageMetrics.heightPt,
    preserveAspectRatio: "xMinYMin meet",
    warningCallback: (message) => warnings.push(message),
    width: pageMetrics.widthPt,
  });

  if (warnings.length > 0) {
    document.end();
    await output;
    throw new Error(`CARVING_PDF_SVG_WARNING:${warnings.join("|")}`);
  }

  document.end();
  return output;
}
