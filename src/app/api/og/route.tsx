import { ImageResponse } from "next/og";

export const runtime = "edge";

// Dynamic OG image used by docs pages. The file-convention
// `opengraph-image.tsx` doesn't work inside a catch-all segment under
// Turbopack ("catch all segment must be the last segment modifying the path"),
// so the docs page's generateMetadata builds an absolute URL to this route
// and passes title + section as query params.

const ALLOWED_SIZE = { width: 1200, height: 630 };

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "Documentation").slice(0, 100);
  const section = (searchParams.get("section") ?? "Docs").slice(0, 60);
  const description = (searchParams.get("description") ?? "").slice(0, 200);
  const path = (searchParams.get("path") ?? "/docs").slice(0, 100);

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
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-150px",
            left: "-150px",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(74, 222, 128, 0.18), transparent 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
          <div
            style={{
              fontSize: 18,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 2,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>Docs</span>
            <span style={{ color: "#444" }}>›</span>
            <span>{section}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, zIndex: 1 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#ededed",
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: 28,
                color: "#999",
                lineHeight: 1.35,
                maxWidth: "85%",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

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
              style={{ width: 8, height: 8, borderRadius: 999, background: "#4ade80" }}
            />
            <span>fincenzo.com/docs</span>
          </div>
          <div>{path}</div>
        </div>
      </div>
    ),
    { ...ALLOWED_SIZE },
  );
}
