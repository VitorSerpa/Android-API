/**
 * Pure geometry and formatting behind `LineChart` (src/components/mente/line-chart.tsx).
 * Kept free of React / React Native so `node --test` can exercise it directly.
 */

export type ChartValues = readonly (number | null)[];

/** Drawing area: the plot is inset by `padX` / `padY` so dots at the edges are not clipped. */
export type PlotBox = { width: number; height: number; padX: number; padY: number };

export type ChartPoint = { x: number; y: number };

export type CurveKind = 'smooth' | 'linear';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** One decimal keeps the SVG path strings short without visible loss. */
const r = (value: number) => Math.round(value * 10) / 10;

export function pointX(index: number, count: number, box: PlotBox): number {
  const inner = Math.max(0, box.width - box.padX * 2);
  return count <= 1 ? box.width / 2 : box.padX + (index / (count - 1)) * inner;
}

/** `value` is normalised 0 (bottom) … 1 (top); out-of-range values are clamped onto the plot. */
export function pointY(value: number, box: PlotBox): number {
  const inner = Math.max(0, box.height - box.padY * 2);
  return box.padY + (1 - clamp(value, 0, 1)) * inner;
}

/** Whether any series has a value at `index`. */
export function hasValueAt(series: readonly { values: ChartValues }[], index: number): boolean {
  return series.some((line) => {
    const value = line.values[index];
    return value !== null && value !== undefined;
  });
}

/**
 * The index nearest to the horizontal touch position `x` that `isSelectable` accepts,
 * or `null` when no index is selectable. Ties go to the earlier index.
 */
export function nearestIndex(x: number, count: number, box: PlotBox, isSelectable: (index: number) => boolean): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < count; index += 1) {
    if (!isSelectable(index)) continue;
    const distance = Math.abs(pointX(index, count, box) - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Next selectable index from `current` in direction `delta` (+1 / -1), used by the
 * screen-reader "adjustable" actions. Starts at the first / last selectable index when
 * nothing is selected; stays put at the ends.
 */
export function stepIndex(current: number | null, delta: 1 | -1, count: number, isSelectable: (index: number) => boolean): number | null {
  let index = current === null ? (delta > 0 ? -1 : count) : current;
  for (;;) {
    index += delta;
    if (index < 0 || index >= count) return current;
    if (isSelectable(index)) return index;
  }
}

/** Contiguous runs of non-null values; a `null` (or missing) value breaks the line. */
export function valueRuns(values: ChartValues): { start: number; values: number[] }[] {
  const runs: { start: number; values: number[] }[] = [];
  let current: { start: number; values: number[] } | null = null;
  values.forEach((value, index) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      current = null;
      return;
    }
    if (!current) {
      current = { start: index, values: [] };
      runs.push(current);
    }
    current.values.push(value);
  });
  return runs;
}

/**
 * Tangents for a monotone cubic (same rule as d3's `curveMonotoneX`): the curve never
 * overshoots the data, so a smoothed mood line cannot dip below 1 or above 5.
 */
function monotoneTangents(points: readonly ChartPoint[]): number[] {
  const n = points.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const h = points[i + 1].x - points[i].x;
    slopes.push(h === 0 ? 0 : (points[i + 1].y - points[i].y) / h);
  }
  const tangents = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    const d0 = slopes[i - 1];
    const d1 = slopes[i];
    const h0 = points[i].x - points[i - 1].x;
    const h1 = points[i + 1].x - points[i].x;
    const p = (d0 * h1 + d1 * h0) / (h0 + h1 || 1);
    tangents[i] = (Math.sign(d0) + Math.sign(d1)) * Math.min(Math.abs(d0), Math.abs(d1), 0.5 * Math.abs(p)) || 0;
  }
  if (n >= 2) {
    tangents[0] = n === 2 ? slopes[0] : (3 * slopes[0] - tangents[1]) / 2;
    tangents[n - 1] = n === 2 ? slopes[0] : (3 * slopes[n - 2] - tangents[n - 2]) / 2;
  }
  return tangents;
}

/** SVG path `d` through `points` (one run, no gaps). Empty string for fewer than 2 points. */
export function linePath(points: readonly ChartPoint[], curve: CurveKind = 'smooth'): string {
  if (points.length < 2) return '';
  const [first, ...rest] = points;
  let d = `M${r(first.x)} ${r(first.y)}`;
  if (curve === 'linear' || points.length === 2) {
    for (const point of rest) d += `L${r(point.x)} ${r(point.y)}`;
    return d;
  }
  const m = monotoneTangents(points);
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const third = (b.x - a.x) / 3;
    d += `C${r(a.x + third)} ${r(a.y + m[i] * third)} ${r(b.x - third)} ${r(b.y - m[i + 1] * third)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}

/** Closed path filling the area between the line and `baselineY`. Empty for fewer than 2 points. */
export function areaPath(points: readonly ChartPoint[], baselineY: number, curve: CurveKind = 'smooth'): string {
  const line = linePath(points, curve);
  if (!line) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${line}L${r(last.x)} ${r(baselineY)}L${r(first.x)} ${r(baselineY)}Z`;
}

/**
 * Least-squares trend over the non-null values. Returns the fitted value at the first and
 * last index (clamped to 0…1) and the slope per index; `null` with fewer than 2 values.
 */
export function linearTrend(values: ChartValues): { from: number; to: number; slope: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  values.forEach((value, index) => {
    if (value === null || value === undefined || Number.isNaN(value)) return;
    xs.push(index);
    ys.push(value);
  });
  if (xs.length < 2) return null;
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - meanX) * (ys[i] - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const at = (x: number) => clamp(meanY + slope * (x - meanX), 0, 1);
  return { from: at(0), to: at(values.length - 1), slope };
}

/** Left offset of a tooltip of `tooltipWidth` centred on `x`, kept inside `0…width`. */
export function tooltipLeft(x: number, tooltipWidth: number, width: number): number {
  return clamp(x - tooltipWidth / 2, 0, Math.max(0, width - tooltipWidth));
}

/** Fallback text for a normalised value: a whole percentage. */
export function defaultFormat(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? 'sem registro' : `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

export type FormattableSeries = {
  values: ChartValues;
  displayValues?: readonly (string | null)[];
  format?: (index: number) => string | null;
};

/**
 * The text shown for `series` at `index`: `displayValues` first, then `format`, then
 * `defaultFormat`. A missing value reads "sem registro".
 */
export function pointValueText(series: FormattableSeries, index: number): string {
  const value = series.values[index];
  if (value === null || value === undefined) return 'sem registro';
  const display = series.displayValues?.[index];
  if (display !== null && display !== undefined) return display;
  const formatted = series.format?.(index);
  if (formatted !== null && formatted !== undefined) return formatted;
  return defaultFormat(value);
}

/** One sentence for screen readers: "Seg: Humor 4,0; Ansiedade sem registro". */
export function pointSummary(
  title: string,
  series: readonly (FormattableSeries & { label?: string })[],
  index: number,
): string {
  const parts = series.map((line, position) => `${line.label ?? `Série ${position + 1}`} ${pointValueText(line, index)}`);
  return `${title}: ${parts.join('; ')}`;
}
