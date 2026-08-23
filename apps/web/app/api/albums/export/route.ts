import { NextResponse } from "next/server";
import { createAlbumBookPdf, createAlbumPdf, type AlbumPdfPage } from "@fangcun/album/pdf";

export const runtime = "nodejs";

const MAX_ALBUM_PAGES = 24;
const MAX_PAGE_SVG_LENGTH = 1_500_000;
const MAX_BOOK_SVG_LENGTH = 8_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePage(value: unknown): AlbumPdfPage | null {
  if (!isRecord(value) || typeof value.svg !== "string" || value.svg.length === 0 || value.svg.length > MAX_PAGE_SVG_LENGTH) return null;
  const widthMm = typeof value.widthMm === "number" ? value.widthMm : 0;
  const heightMm = typeof value.heightMm === "number" ? value.heightMm : 0;
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm < 80 || widthMm > 400 || heightMm < 100 || heightMm > 500) return null;
  if (!value.svg.includes('data-fangcun-output="album-page"')) return null;
  return { heightMm, svg: value.svg, widthMm };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON", message: "请求体不是有效 JSON" } }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ ok: false, error: { code: "ALBUM_OUTPUT_INVALID", message: "印谱输出无效" } }, { status: 400 });
  const rawPages = Array.isArray(body.pages) ? body.pages : [body];
  if (rawPages.length < 1 || rawPages.length > MAX_ALBUM_PAGES) {
    return NextResponse.json({ ok: false, error: { code: "ALBUM_PAGE_COUNT_INVALID", message: "印谱页数不在允许范围内" } }, { status: 400 });
  }
  const pages = rawPages.map(parsePage);
  if (pages.some((page) => page === null)) {
    return NextResponse.json({ ok: false, error: { code: "ALBUM_OUTPUT_INVALID", message: "页面不是有效的方寸印谱输出" } }, { status: 400 });
  }
  const validPages = pages as AlbumPdfPage[];
  if (validPages.reduce((total, page) => total + page.svg.length, 0) > MAX_BOOK_SVG_LENGTH) {
    return NextResponse.json({ ok: false, error: { code: "ALBUM_BOOK_TOO_LARGE", message: "整册印谱 SVG 过大" } }, { status: 400 });
  }
  const title = typeof body.title === "string" && body.title ? body.title.slice(0, 80) : "Fangcun Album";
  try {
    const pdf = validPages.length === 1
      ? await createAlbumPdf({ ...validPages[0]!, title })
      : await createAlbumBookPdf({ pages: validPages, title });
    const bodyBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(bodyBuffer, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename=\"fangcun-album${validPages.length > 1 ? "-book" : ""}.pdf\"`,
        "content-type": "application/pdf",
        "x-fangcun-page-count": String(validPages.length),
        "x-fangcun-page-mm": `${validPages[0]!.widthMm}x${validPages[0]!.heightMm}`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "ALBUM_PDF_FAILED", message: "印谱 PDF 生成失败" } }, { status: 500 });
  }
}
