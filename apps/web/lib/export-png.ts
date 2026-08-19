import type { SealDsl } from "@fangcun/dsl-schema";

export type PngBackground = "paper" | "transparent";

async function requestAuthoritativeSvg(
  dsl: SealDsl,
  background: PngBackground,
): Promise<string> {
  const exportDsl: SealDsl = {
    ...dsl,
    paper: {
      ...dsl.paper,
      color: background === "transparent" ? "none" : dsl.paper.color === "none" ? "xuan" : dsl.paper.color,
    },
  };
  const response = await fetch("/api/seals/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dsl: exportDsl }),
  });
  if (!response.ok) throw new Error("authoritative SVG unavailable");
  return response.text();
}

export type RasterSize = number | { width: number; height: number };

function normalizeRasterSize(size: RasterSize): { width: number; height: number } {
  if (typeof size === "number") {
    const safeSize = Math.max(256, Math.min(8000, Math.round(size)));
    return { width: safeSize, height: safeSize };
  }
  return {
    width: Math.max(1, Math.min(8000, Math.round(size.width))),
    height: Math.max(1, Math.min(8000, Math.round(size.height))),
  };
}

export async function rasterizeSvg(svg: string, size: RasterSize = 1000): Promise<Blob> {
  const safeSize = normalizeRasterSize(size);
  const sourceUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG rasterization failed"));
    });
    image.src = sourceUrl;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = safeSize.width;
    canvas.height = safeSize.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable");
    context.drawImage(image, 0, 0, safeSize.width, safeSize.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function createSealPng(
  dsl: SealDsl,
  background: PngBackground,
  size = 1000,
): Promise<Blob> {
  const svg = await requestAuthoritativeSvg(dsl, background);
  return rasterizeSvg(svg, size);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
