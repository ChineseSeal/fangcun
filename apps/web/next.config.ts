import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({});

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async headers() {
    return [
      {
        source: "/glyphs/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit", "svg-to-pdfkit"],
  transpilePackages: [
    "@fangcun/carving-aid",
    "@fangcun/compliance",
    "@fangcun/dsl-schema",
    "@fangcun/glyph-tools",
    "@fangcun/seal-engine",
  ],
};

export default withMDX(nextConfig);
