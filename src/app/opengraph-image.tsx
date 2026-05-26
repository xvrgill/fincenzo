import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Fincenzo — budgeting for individuals and the couples they live with";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "72px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#ededed",
          position: "relative",
        }}
      >
        {/* subtle grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* green glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(74, 222, 128, 0.25), transparent 70%)",
          }}
        />

        {/* logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, zIndex: 1 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#4ade80",
              boxShadow: "0 0 24px rgba(74, 222, 128, 0.6)",
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 600 }}>fincenzo</div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, zIndex: 1 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>Money that’s&nbsp;</span>
            <span style={{ color: "#4ade80" }}>mine</span>
            <span>. Money that’s&nbsp;</span>
            <span style={{ color: "#4ade80" }}>ours</span>
            <span>.</span>
          </div>
          <div style={{ fontSize: 32, color: "#888", lineHeight: 1.3 }}>
            One app. Nothing shared by default.
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#888",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#4ade80",
              }}
            />
            <span>Invite-only beta · built in the open</span>
          </div>
          <div>fincenzo.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
