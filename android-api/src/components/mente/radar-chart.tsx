import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import {
  describeRadarAxis,
  nearestRadarAxis,
  radarPoint,
  radarPolygonPoints,
  radarRatio,
  radarValueText,
  toggleRadarSelection,
  validRadarSelection,
} from '@/data/radar';
import { makeStyles, useColors } from '@/theme';

export type RadarAxis = {
  label: string;
  percent: number | null;
  /** Optional explanation shown when the axis is selected, e.g. "Média 3,4 de 5 nos últimos 30 dias". */
  detail?: string;
};

export type RadarChartProps = {
  axes: readonly RadarAxis[];
  size?: number;
  /** Called with the selected axis index, or null when the selection is cleared. */
  onSelectAxis?: (index: number | null) => void;
};

const LABEL_RATIO = 1.22;
const DOT = 12;

/**
 * RF-22: radar comparing the wellbeing dimensions (0–100). Axes without data
 * sit at the centre and are listed as "sem dados" so the shape never implies
 * a value that wasn't recorded. Tapping an axis (its label, its slice of the
 * chart or its chip below) highlights it and shows a detail card; tapping it
 * again clears the selection.
 */
export function RadarChart({ axes, size = 220, onSelectAxis }: RadarChartProps) {
  const c = useColors();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [rawSelected, setSelected] = useState<number | null>(null);
  const selected = validRadarSelection(rawSelected, axes.length);

  const count = axes.length;
  const center = size / 2;
  const radius = size / 2 - 34;
  const point = (index: number, ratio: number) => radarPoint(index, count, ratio, center, radius);
  const polygon = radarPolygonPoints(
    axes.map((axis) => axis.percent),
    center,
    radius,
  );
  const description = axes.map((axis) => `${axis.label} ${radarValueText(axis.percent)}`).join(', ');

  // Gentle grow-in of the values polygon on mount.
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      grow.set(1);
      return;
    }
    grow.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [grow, reduceMotion]);
  const growStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + grow.get() * 0.7,
    transform: [{ scale: grow.get() }],
  }));

  const select = (index: number | null) => {
    if (index === null) return;
    const next = toggleRadarSelection(selected, index);
    setSelected(next);
    onSelectAxis?.(next);
    if (next !== null && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(describeRadarAxis(axes[next]).spoken);
    }
  };

  const onChartPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    select(nearestRadarAxis(locationX, locationY, center, count));
  };

  const selectedAxis = selected === null ? null : axes[selected];
  const summary = selectedAxis ? describeRadarAxis(selectedAxis) : null;
  const selectedDot = selected === null || axes[selected].percent === null ? null : point(selected, radarRatio(axes[selected].percent));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onChartPress}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Gráfico de radar: ${description}`}
        accessibilityHint="Use os botões abaixo do gráfico para ver os detalhes de cada indicador."
        style={{ width: size, height: size }}>
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
            const label = point(index, LABEL_RATIO);
            const active = selected === index;
            return [
              <Line
                key={`l-${axis.label}`}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke={active ? c.accent : c.border}
                strokeWidth={active ? 2 : 1}
              />,
              <SvgText
                key={`t-${axis.label}`}
                x={label.x}
                y={label.y + 4}
                fontSize={active ? 12 : 11}
                fontFamily={active ? MenteType.captionStrong.fontFamily : MenteType.caption.fontFamily}
                fill={active ? c.accent : c.textMuted}
                textAnchor="middle">
                {axis.label}
              </SvgText>,
            ];
          })}
        </Svg>

        {/* Values layer: grows in from the centre on mount. */}
        <Animated.View pointerEvents="none" style={[styles.layer, { width: size, height: size }, growStyle]}>
          <Svg width={size} height={size}>
            <Polygon points={polygon} fill={c.primary} fillOpacity={0.25} stroke={c.accent} strokeWidth={2} />
            {axes.map((axis, index) => {
              if (axis.percent === null) return null;
              const p = point(index, radarRatio(axis.percent));
              const dimmed = selected !== null && selected !== index;
              return <Circle key={axis.label} cx={p.x} cy={p.y} r={3.5} fill={c.accent} fillOpacity={dimmed ? 0.45 : 1} />;
            })}
          </Svg>
        </Animated.View>

        {selectedDot && (
          <Animated.View
            key={`dot-${selected}`}
            pointerEvents="none"
            entering={reduceMotion ? undefined : ZoomIn.duration(220)}
            style={[
              styles.selectedDot,
              { left: selectedDot.x - DOT / 2, top: selectedDot.y - DOT / 2, backgroundColor: c.accent, borderColor: c.surface },
            ]}
          />
        )}

        {/* 44 pt hit areas over each axis label (screen readers use the chips below). */}
        {axes.map((axis, index) => {
          const label = point(index, LABEL_RATIO);
          const left = Math.min(size - MIN_TOUCH, Math.max(0, label.x - MIN_TOUCH / 2));
          const top = Math.min(size - MIN_TOUCH, Math.max(0, label.y - MIN_TOUCH / 2));
          return (
            <Pressable
              key={`hit-${axis.label}`}
              onPress={() => select(index)}
              accessible={false}
              importantForAccessibility="no"
              style={[styles.hit, { left, top }]}
            />
          );
        })}
      </Pressable>

      <View style={styles.legend}>
        {axes.map((axis, index) => {
          const active = selected === index;
          return (
            <Pressable
              key={axis.label}
              onPress={() => select(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${axis.label}: ${radarValueText(axis.percent)}`}
              accessibilityHint={active ? 'Toque para fechar os detalhes' : 'Toque para ver os detalhes'}
              style={({ pressed }) => [styles.chip, active && { backgroundColor: c.badgeBackground, borderColor: c.accent }, pressed && styles.pressed]}>
              <Text style={[styles.legendText, active && styles.legendTextActive]}>
                {axis.label}: {radarValueText(axis.percent)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedAxis && summary && (
        <Animated.View key={`card-${selected}`} entering={reduceMotion ? undefined : FadeIn.duration(200)} style={styles.detail}>
          <Text style={styles.detailTitle} accessibilityLiveRegion="polite" accessibilityLabel={summary.spoken}>
            {selectedAxis.label} · <Text style={styles.detailValue}>{summary.value}</Text>
          </Text>
          {selectedAxis.detail ? <Text style={styles.detailText}>{selectedAxis.detail}</Text> : null}
          <Text style={styles.detailHint}>Toque de novo em {selectedAxis.label} para fechar.</Text>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  selectedDot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
  hit: {
    position: 'absolute',
    width: MIN_TOUCH,
    height: MIN_TOUCH,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: MenteRadius.pill,
    borderWidth: 1,
    borderColor: c.border,
  },
  pressed: {
    opacity: 0.7,
  },
  legendText: {
    ...MenteType.small,
    color: c.textMuted,
  },
  legendTextActive: {
    ...MenteType.smallStrong,
    color: c.accent,
  },
  detail: {
    alignSelf: 'stretch',
    gap: 2,
    padding: 12,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  detailTitle: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detailValue: {
    ...MenteType.caption,
    color: c.accent,
  },
  detailText: {
    ...MenteType.small,
    color: c.text,
  },
  detailHint: {
    ...MenteType.small,
    color: c.textMuted,
  },
}));
