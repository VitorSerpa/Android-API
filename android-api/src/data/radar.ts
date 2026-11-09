/**
 * Pure geometry and wording for the wellbeing radar (RF-22), kept apart from
 * the component so it can be unit tested.
 */

export type RadarPoint = { x: number; y: number };

/** Angle of an axis, starting at 12 o'clock and going clockwise. */
export function radarAngle(index: number, count: number): number {
  return (index / count) * 2 * Math.PI - Math.PI / 2;
}

/** Position of `ratio` (0 = centre, 1 = outer ring) along an axis. */
export function radarPoint(index: number, count: number, ratio: number, center: number, radius: number): RadarPoint {
  const angle = radarAngle(index, count);
  return { x: center + Math.cos(angle) * radius * ratio, y: center + Math.sin(angle) * radius * ratio };
}

/** 0–100 → 0–1, with missing data and out-of-range values pinned. */
export function radarRatio(percent: number | null): number {
  if (percent === null || !Number.isFinite(percent)) return 0;
  return Math.min(1, Math.max(0, percent / 100));
}

/** SVG `points` attribute for the values polygon. */
export function radarPolygonPoints(percents: readonly (number | null)[], center: number, radius: number): string {
  return percents
    .map((percent, index) => radarPoint(index, percents.length, radarRatio(percent), center, radius))
    .map((p) => `${round2(p.x)},${round2(p.y)}`)
    .join(' ');
}

/**
 * Axis closest to a touch at (x, y) inside a chart centred on `center`, by
 * angle. Touches too close to the centre (`deadZone`) are ambiguous → null.
 */
export function nearestRadarAxis(x: number, y: number, center: number, count: number, deadZone = 12): number | null {
  if (count <= 0) return null;
  const dx = x - center;
  const dy = y - center;
  if (Math.hypot(dx, dy) < deadZone) return null;
  // Clockwise angle from 12 o'clock, 0 … 2π.
  const fromTop = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
  return Math.round(fromTop / ((2 * Math.PI) / count)) % count;
}

/** Tapping the selected axis again clears the selection. */
export function toggleRadarSelection(current: number | null, index: number): number | null {
  return current === index ? null : index;
}

/** Keeps a selection valid when the number of axes changes. */
export function validRadarSelection(current: number | null, count: number): number | null {
  return current !== null && current >= 0 && current < count ? current : null;
}

export function radarValueText(percent: number | null): string {
  return percent === null || !Number.isFinite(percent) ? 'sem dados' : `${Math.round(percent)}%`;
}

/** Human wording for a 0–100 indicator. */
export function radarLevel(percent: number | null): 'sem dados' | 'baixo' | 'moderado' | 'alto' {
  if (percent === null || !Number.isFinite(percent)) return 'sem dados';
  if (percent < 34) return 'baixo';
  if (percent < 67) return 'moderado';
  return 'alto';
}

export type RadarAxisSummary = {
  /** e.g. "72 de 100 · nível alto" or "Sem dados no período". */
  value: string;
  /** Full sentence for screen readers. */
  spoken: string;
};

export function describeRadarAxis(axis: { label: string; percent: number | null; detail?: string }): RadarAxisSummary {
  const detail = axis.detail?.trim();
  if (axis.percent === null || !Number.isFinite(axis.percent)) {
    const value = 'Sem dados no período';
    return { value, spoken: [`${axis.label}: sem dados no período.`, detail].filter(Boolean).join(' ') };
  }
  const score = Math.round(Math.min(100, Math.max(0, axis.percent)));
  const level = radarLevel(score);
  const value = `${score} de 100 · nível ${level}`;
  return { value, spoken: [`${axis.label}: ${score} de 100, nível ${level}.`, detail].filter(Boolean).join(' ') };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
