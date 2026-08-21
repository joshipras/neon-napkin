"use client";

const SEGMENTS: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "c", "d", "g"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "e", "d", "c", "g"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"]
};

export default function SevenSegmentTimer({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60) % 100;
  const secs = Math.floor(seconds % 60);
  const value = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="wa-timer" aria-label={value}>
      {value.split("").map((char, index) =>
        char === ":" ? (
          <div className="wa-colon" key={`${char}-${index}`}>
            <span />
            <span />
          </div>
        ) : (
          <Digit key={`${char}-${index}`} value={char} />
        )
      )}
    </div>
  );
}

function Digit({ value }: { value: string }) {
  const active = new Set(SEGMENTS[value] || []);
  return (
    <div className="wa-digit">
      {["a", "b", "c", "d", "e", "f", "g"].map((segment) => (
        <span className={`wa-seg wa-seg-${segment} ${active.has(segment) ? "is-on" : ""}`} key={segment} />
      ))}
    </div>
  );
}
