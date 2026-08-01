import { ImageResponse } from "next/og";

/**
 * OpenGraph card, generated at build time.
 *
 * Rendered by Satori, which supports a flexbox subset of CSS — every container
 * therefore sets `display: flex` explicitly, and no CSS grid or custom font is
 * used, so the build cannot fail on a network font fetch.
 */
export const alt = "MathForge — SAT/AP Calculus Learning Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0e0c16",
          backgroundImage:
            "radial-gradient(circle at 10% 0%, rgba(167,139,250,0.24), transparent 55%), radial-gradient(circle at 92% 8%, rgba(34,211,238,0.16), transparent 58%)",
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "rgba(167,139,250,0.18)",
              color: "#a78bfa",
              fontSize: 32,
            }}
          >
            Σ
          </div>
          <div style={{ display: "flex", color: "#ece9f5", fontSize: 30, fontWeight: 600 }}>
            MathForge
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#f5f3ff",
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            SAT/AP Calculus
          </div>
          <div
            style={{
              display: "flex",
              color: "#a78bfa",
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Learning Platform
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              color: "#a9a3bd",
              fontSize: 27,
              lineHeight: 1.4,
              maxWidth: 940,
            }}
          >
            Step-by-step derivatives and integrals, solved in the browser by a dependency-free
            engine — with every AP topic linked to the actuarial technique it becomes.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {[
            "Calculus AB / BC",
            "AP Statistics",
            "Central Limit Theorem",
            "TypeScript",
            "48 tests",
          ].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(169,163,189,0.3)",
                color: "#cdc7dd",
                fontSize: 22,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
