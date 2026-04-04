const STATE_ABBR: Record<string, string> = {
  "Jammu and Kashmir": "JK",
  Ladakh: "LA",
  "Himachal Pradesh": "HP",
  Uttarakhand: "UK",
  "Arunachal Pradesh": "AR",
  Punjab: "PB",
  Haryana: "HR",
  "Uttar Pradesh": "UP",
  Bihar: "BR",
  Assam: "AS",
  Nagaland: "NL",
  Manipur: "MN",
  Tripura: "TR",
  Mizoram: "MZ",
  Rajasthan: "RJ",
  Delhi: "DL",
  "Madhya Pradesh": "MP",
  Jharkhand: "JH",
  "West Bengal": "WB",
  Sikkim: "SK",
  Meghalaya: "ML",
  Gujarat: "GJ",
  Maharashtra: "MH",
  Chhattisgarh: "CG",
  Odisha: "OD",
  "Dadra and Nagar Haveli and Daman and Diu": "DD",
  Karnataka: "KA",
  "Andhra Pradesh": "AP",
  Telangana: "TL",
  Goa: "GA",
  Kerala: "KL",
  "Tamil Nadu": "TN",
  Puducherry: "PY",
  "Andaman and Nicobar Islands": "AN",
  Lakshadweep: "LD",
  Chandigarh: "CH",
};

// ABBR_TO_STATE for tooltip
const ABBR_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR).map(([k, v]) => [v, k]),
);

// [abbr, col, row] — approximate geographic tile layout
const TILES: [string, number, number][] = [
  ["JK", 1, 0],
  ["LA", 2, 0],
  ["HP", 3, 0],
  ["UK", 4, 0],
  ["AR", 8, 0],
  ["CH", 2, 1],
  ["PB", 1, 1],
  ["HR", 3, 1],
  ["UP", 4, 1],
  ["BR", 5, 1],
  ["AS", 6, 1],
  ["NL", 7, 1],
  ["MN", 8, 1],
  ["RJ", 1, 2],
  ["DL", 3, 2],
  ["MP", 4, 2],
  ["JH", 5, 2],
  ["WB", 6, 2],
  ["SK", 7, 2],
  ["TR", 8, 2],
  ["ML", 7, 3],
  ["MZ", 8, 3],
  ["GJ", 1, 3],
  ["MH", 2, 3],
  ["CG", 4, 3],
  ["OD", 5, 3],
  ["DD", 1, 4],
  ["KA", 2, 4],
  ["TL", 3, 4],
  ["AP", 4, 4],
  ["GA", 1, 5],
  ["KL", 2, 5],
  ["TN", 3, 5],
  ["PY", 4, 5],
  ["LD", 1, 6],
  ["AN", 5, 5],
];

function getColor(count: number): string {
  if (count === 0) return "#e5e7eb";
  if (count <= 2) return "#d4ed8a";
  if (count <= 5) return "#96BB1A";
  return "#6a8512";
}

function getTextColor(count: number): string {
  if (count === 0) return "#9ca3af";
  if (count <= 2) return "#4b5563";
  return "#fff";
}

interface IndiaMapProps {
  stateCounts: Record<string, number>;
}

export function IndiaMap({ stateCounts }: IndiaMapProps) {
  const abbrCounts: Record<string, number> = {};
  for (const [stateName, count] of Object.entries(stateCounts)) {
    const abbr = STATE_ABBR[stateName];
    if (abbr) abbrCounts[abbr] = count;
  }

  const tileW = 52;
  const tileH = 42;
  const gap = 4;
  const cols = 9;
  const rows = 7;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={cols * (tileW + gap) + 10}
        height={rows * (tileH + gap) + 10}
        className="overflow-visible"
      >
        <title>India State-wise Audit Map</title>
        {TILES.map(([abbr, col, row]) => {
          const count = abbrCounts[abbr] ?? 0;
          const x = col * (tileW + gap) + 5;
          const y = row * (tileH + gap) + 5;
          const stateName = ABBR_TO_STATE[abbr] ?? abbr;
          return (
            <g key={abbr}>
              <title>{`${stateName}: ${count} audit${count !== 1 ? "s" : ""}`}</title>
              <rect
                x={x}
                y={y}
                width={tileW}
                height={tileH}
                rx={5}
                fill={getColor(count)}
                stroke="#d1d5db"
                strokeWidth={0.5}
              />
              <text
                x={x + tileW / 2}
                y={y + tileH / 2 - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="600"
                fill={getTextColor(count)}
              >
                {abbr}
              </text>
              <text
                x={x + tileW / 2}
                y={y + tileH / 2 + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight="700"
                fill={getTextColor(count)}
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{ background: "#e5e7eb", border: "1px solid #d1d5db" }}
          />
          0
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: "#d4ed8a" }} />
          1-2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: "#96BB1A" }} />
          3-5
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: "#6a8512" }} />
          5+
        </span>
      </div>
    </div>
  );
}
