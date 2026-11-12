import { Hold } from "./Hold";
import type { Hold as HoldKind } from "@/lib/types";

/**
 * A wall of holds in staggered rows: the HOLD! logo pattern. The app icon in
 * public/ is drawn from the same layout.
 */
const PALETTE = {
  yellow: ["#FFDD55", "#E8BE2A"],
  blue: ["#7EB3FF", "#5E9EF5"],
  green: ["#5FDDB0", "#3FC998"],
  orange: ["#FFA45C", "#F58F40"],
  purple: ["#B79BFF", "#A080F5"],
  pink: ["#FF9CC2", "#F582AD"],
  red: ["#FF8A7A", "#F06C5B"],
} as const;

type Cell = [HoldKind, keyof typeof PALETTE, number];

const ROWS: Cell[][] = [
  [["jug", "yellow", -10], ["crimp", "blue", 14], ["pinch", "green", -20], ["sloper", "orange", 6]],
  [["volume", "pink", -8], ["pocket", "purple", 10], ["jug", "red", -18], ["crimp", "yellow", 8]],
  [["sloper", "green", 4], ["pinch", "orange", 22], ["volume", "blue", -6], ["pocket", "pink", -14]],
  [["crimp", "purple", -6], ["jug", "blue", 12], ["sloper", "yellow", -10], ["pinch", "red", 16]],
];

export function HoldPattern({
  step = 112,
  size = 104,
  rows = 4,
  offsetX = 28,
  offsetY = 30,
  className = "",
}: {
  /** Distance between holds, in px. */
  step?: number;
  size?: number;
  rows?: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
}) {
  const cells: { cell: Cell; x: number; y: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    const row = ROWS[r % ROWS.length];
    for (let c = 0; c < row.length + 1; c++) {
      const cell = row[c % row.length];
      cells.push({
        cell,
        x: offsetX + c * step + (r % 2 ? step / 2 : 0),
        y: offsetY + r * step,
        key: `${r}-${c}`,
      });
    }
  }
  return (
    <div aria-hidden className={`pointer-events-none relative overflow-hidden ${className}`}>
      {cells.map(({ cell: [kind, color, rotate], x, y, key }) => {
        const s = kind === "crimp" ? size * 0.85 : size;
        const [fill, shade] = PALETTE[color];
        return (
          <Hold
            key={key}
            kind={kind}
            fill={fill}
            shade={shade}
            size={s}
            rotate={rotate}
            style={{ position: "absolute", left: x - s / 2, top: y - s / 2 }}
          />
        );
      })}
    </div>
  );
}
