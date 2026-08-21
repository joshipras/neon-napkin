import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          color: "#eaffdf",
          background:
            "radial-gradient(circle at 20% 10%, #134f1b 0, transparent 34%), radial-gradient(circle at 82% 18%, #4e1144 0, transparent 30%), #030406",
          fontFamily: "monospace"
        }}
      >
        <div style={{ fontSize: 30, color: "#25f7ff", marginBottom: 24 }}>
          LIVE INPUT 44.1 KHZ STEREO
        </div>
        <div
          style={{
            fontSize: 118,
            fontWeight: 900,
            color: "#39ff14",
            textShadow: "0 0 24px #39ff14"
          }}
        >
          VISUALIZE.FM
        </div>
        <div style={{ fontSize: 44, marginTop: 30 }}>
          Turn any room into 1999.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 50 }}>
          {Array.from({ length: 28 }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 24,
                height: 36 + ((index * 37) % 132),
                background:
                  index % 4 === 0 ? "#ff30c2" : index % 3 === 0 ? "#ffb000" : "#39ff14"
              }}
            />
          ))}
        </div>
      </div>
    ),
    size
  );
}
