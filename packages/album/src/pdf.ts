// PDFKit's self-contained build includes its AFM assets, but the DefinitelyTyped
// package does not expose this supported distribution subpath.
// @ts-expect-error -- runtime shape matches the typed default PDFDocument export.
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import SVGtoPDF from "svg-to-pdfkit";

const POINTS_PER_MM = 72 / 25.4;

export type AlbumPdfOptions = {
  svg: string;
  widthMm: number;
  heightMm: number;
  title: string;
};

export type AlbumPdfPage = Pick<AlbumPdfOptions, "svg" | "widthMm" | "heightMm">;

export type AlbumBookPdfOptions = {
  pages: readonly AlbumPdfPage[];
  title: string;
};

function printableSvg(svg: string): string {
  return svg
    .replace(/font-family="serif"/g, 'font-family="Times-Roman"')
    .replace(/font-family="sans-serif"/g, 'font-family="Helvetica"');
}

export async function createAlbumBookPdf(options: AlbumBookPdfOptions): Promise<Uint8Array> {
  const firstPage = options.pages[0];
  if (!firstPage) throw new Error("ALBUM_BOOK_EMPTY");
  const chunks: Uint8Array[] = [];
  const document = new PDFDocument({
    autoFirstPage: false,
    compress: false,
    info: {
      Author: "Fangcun",
      Creator: "Fangcun Album",
      CreationDate: new Date("2026-01-01T00:00:00.000Z"),
      Keywords: "fangcun,album,seal,print",
      Subject: "Printable seal album",
      Title: options.title,
    },
    margin: 0,
    size: [firstPage.widthMm * POINTS_PER_MM, firstPage.heightMm * POINTS_PER_MM],
  });
  const output = new Promise<Uint8Array>((resolve, reject) => {
    document.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    document.on("end", () => {
      const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(bytes);
    });
    document.on("error", reject);
  });
  for (const page of options.pages) {
    const width = page.widthMm * POINTS_PER_MM;
    const height = page.heightMm * POINTS_PER_MM;
    document.addPage({ margin: 0, size: [width, height] });
    SVGtoPDF(document, printableSvg(page.svg), 0, 0, {
      height,
      preserveAspectRatio: "xMinYMin meet",
      width,
    });
  }
  document.end();
  return output;
}

export function createAlbumPdf(options: AlbumPdfOptions): Promise<Uint8Array> {
  return createAlbumBookPdf({ pages: [options], title: options.title });
}
