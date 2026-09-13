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
          background: "#f4efe2",
          color: "#161310",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 28, color: "#a7b0b4" }}>studio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 110, lineHeight: 0.9 }}>{site.name}</div>
          <div style={{ fontSize: 28, color: "#5c564c" }}>
            drawings · animations · photographs
          </div>
        </div>
      </div>
    ),
    size,
  );
}
