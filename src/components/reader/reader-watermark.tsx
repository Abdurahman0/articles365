"use client";

/**
 * Dynamic per-user watermark tiled across the reading surface.
 * Fed from mock authenticated session data (ready for backend integration).
 * Non-interactive, unselectable, low-opacity so it never blocks reading.
 */
export function ReaderWatermark({
  line1,
  line2,
  page = 0,
}: {
  line1: string;
  line2: string;
  page?: number;
}) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='360' height='240'>
      <text x='50%' y='45%' fill='rgba(130,130,130,0.14)' font-family='Inter, sans-serif'
        font-size='13' font-weight='600' text-anchor='middle'
        transform='rotate(-28 180 120)'>${escapeXml(line1)}</text>
      <text x='50%' y='58%' fill='rgba(130,130,130,0.11)' font-family='Inter, sans-serif'
        font-size='11' text-anchor='middle'
        transform='rotate(-28 180 120)'>${escapeXml(line2)}</text>
    </svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  // shift the tiling subtly per page so the pattern isn't static
  const offset = (page % 2) * 40;

  return (
    <div
      aria-hidden
      className="no-select pointer-events-none absolute inset-0 z-20"
      style={{
        backgroundImage: url,
        backgroundRepeat: "repeat",
        backgroundPosition: `${offset}px ${offset}px`,
      }}
    />
  );
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
