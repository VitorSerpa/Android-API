import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { MenteType } from '@/constants/mente-theme';
import { makeStyles, useColors } from '@/theme';

export type RadarAxis = { label: string; percent: number | null };

/**
 * RF-22: radar comparing the wellbeing dimensions (0–100). Axes without data
 * sit at the centre and are listed as "sem dados" so the shape never implies
 * a value that wasn't recorded.
 */
export function RadarChart({ axes, size = 220 }: { axes: readonly RadarAxis[]; size?: number }) {
  const c = useColors();
  const styles = useStyles();
  const center = size / 2;
  const radius = size / 2 - 34;
  const angle = (index: number) => (index / axes.length) * 2 * Math.PI - Math.PI / 2;
  const point = (index: number, ratio: number) => ({
    x: center + Math.cos(angle(index)) * radius * ratio,
    y: center + Math.sin(angle(index)) * radius * ratio,
  });
  const polygon = axes.map((axis, index) => point(index, (axis.percent ?? 0) / 100)).map((p) => `${p.x},${p.y}`).join(' ');
  const description = axes.map((axis) => `${axis.label} ${axis.percent === null ? 'sem dados' : `${axis.percent}%`}`).join(', ');

  return (
    <View style={styles.wrap} accessible accessibilityRole="image" accessibilityLabel={`Gráfico de radar: ${description}`}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <Polygon
            key={ratio}
            points={axes.map((_, index) => point(index, ratio)).map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={c.border}
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, index) => {
          const end = point(index, 1);
          const label = point(index, 1.22);
          return [
            <Line key={`l-${axis.label}`} x1={center} y1={center} x2={end.x} y2={end.y} stroke={c.border} strokeWidth={1} />,
            <SvgText
              key={`t-${axis.label}`}
              x={label.x}
              y={label.y + 4}
              fontSize={11}
              fontFamily={MenteType.caption.fontFamily}
              fill={c.textMuted}
              textAnchor="middle">
              {axis.label}
            </SvgText>,
          ];
        })}
        <Polygon points={polygon} fill={c.primary} fillOpacity={0.25} stroke={c.accent} strokeWidth={2} />
        {axes.map((axis, index) =>
          axis.percent === null ? null : (
            <Circle key={axis.label} cx={point(index, axis.percent / 100).x} cy={point(index, axis.percent / 100).y} r={3.5} fill={c.accent} />
          ),
        )}
      </Svg>
      <View style={styles.legend}>
        {axes.map((axis) => (
          <Text key={axis.label} style={styles.legendText}>
            {axis.label}: {axis.percent === null ? 'sem dados' : `${axis.percent}%`}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 2,
  },
  legendText: {
    ...MenteType.small,
    color: c.textMuted,
  },
}));
