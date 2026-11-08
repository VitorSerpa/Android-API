import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { MenteFonts } from '@/constants/mente-theme';
import type { SleepMoodPoint } from '@/data/comparisons';
import { useColors } from '@/theme';

const PAD_LEFT = 28;
const PAD_BOTTOM = 26;
const PAD_TOP = 8;
const PAD_RIGHT = 8;
const MOOD_TICKS = [1, 2, 3, 4, 5];

/**
 * RF-64: scatter of hours slept (x) against the next day's mood (y, 1–5).
 * Each dot is one night (US-17 CA-01). The x axis spans the recorded range,
 * rounded out to whole hours, so short and long nights are both readable.
 */
export function ScatterChart({ points, width, height = 190 }: { points: readonly SleepMoodPoint[]; width: number; height?: number }) {
  const c = useColors();
  const hours = points.map((point) => point.sleepHours);
  const minX = Math.max(0, Math.floor(Math.min(4, ...hours)));
  const maxX = Math.ceil(Math.max(10, ...hours));
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const x = (value: number) => PAD_LEFT + ((value - minX) / (maxX - minX)) * plotW;
  const y = (mood: number) => PAD_TOP + (1 - (mood - 1) / 4) * plotH;
  const step = maxX - minX > 8 ? 2 : 1;
  const hourTicks = Array.from({ length: Math.floor((maxX - minX) / step) + 1 }, (_, index) => minX + index * step);

  return (
    <Svg width={width} height={height}>
      {MOOD_TICKS.map((mood) => (
        <Line key={`gy-${mood}`} x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y(mood)} y2={y(mood)} stroke={c.border} strokeWidth={1} />
      ))}
      {MOOD_TICKS.map((mood) => (
        <SvgText key={`ly-${mood}`} x={PAD_LEFT - 8} y={y(mood) + 4} fontSize={11} fontFamily={MenteFonts.regular} fill={c.textMuted} textAnchor="end">
          {mood}
        </SvgText>
      ))}
      {hourTicks.map((hour) => (
        <SvgText key={`lx-${hour}`} x={x(hour)} y={height - 8} fontSize={11} fontFamily={MenteFonts.regular} fill={c.textMuted} textAnchor="middle">
          {`${hour}h`}
        </SvgText>
      ))}
      {points.map((point) => (
        <Circle
          key={point.day}
          cx={x(point.sleepHours)}
          cy={y(point.mood)}
          r={6}
          fill={c.mood}
          fillOpacity={0.75}
          stroke={c.surface}
          strokeWidth={1.5}
        />
      ))}
    </Svg>
  );
}
