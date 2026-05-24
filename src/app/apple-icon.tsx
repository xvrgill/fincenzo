import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#ededed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 88,
          fontWeight: 500,
          letterSpacing: 2,
        }}
      >
        <span style={{ color: "#22c55e", marginRight: 8 }}>▸</span>
        <span>F</span>
      </div>
    ),
    { ...size },
  );
}
