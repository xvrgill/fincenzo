import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 96,
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
