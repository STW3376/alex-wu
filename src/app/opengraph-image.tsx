import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3ead9",
          color: "#241c16",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>
          Studio
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 96, lineHeight: 0.9 }}>{site.name}</div>
          <div style={{ fontSize: 28, maxWidth: 720, color: "#6a5c4f" }}>
            Drawings, animations, music, comics, inventions, and crafts.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
