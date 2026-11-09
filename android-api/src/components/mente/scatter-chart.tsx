import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { MenteFonts, MenteRadius, MenteType } from '@/constants/mente-theme';
import { MIN_TOUCH } from '@/components/mente/ui';
import type { SleepMoodPoint } from '@/data/comparisons';
import {
  describePoint,
  leastSquares,
  MOOD_AXIS_MAX,
  MOOD_AXIS_MIN,
  nearestPointIndex,
  sleepDomain,
  stepIndex,
  trendSegment,
} from '@/lib/scatter-chart';
import { makeStyles, useColors } from '@/theme';

const PAD_LEFT = 28;
const PAD_BOTTOM = 26;
const PAD_TOP = 8;
const PAD_RIGHT = 8;
const MOOD_TICKS = [1, 2, 3, 4, 5];
const DOT_R = 6;
const SELECTED_R = 9;
/** Above this many nights the dots fade in together instead of one by one (cheaper on small phones). */
const STAGGER_LIMIT = 40;
const REVEAL_MS = 700;
const TOOLTIP_H = 58;
const TOOLTIP_MAX_W = 300;
const DEFAULT_HINT = 'Toque em um ponto para ver os detalhes da noite.';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

export type ScatterChartProps = {
  points: readonly SleepMoodPoint[];
  width: number;
  height?: number;
  /** Called with the night's day key ("2026-10-24") from the tooltip's "Ver dia" action. */
  onPressPoint?: (day: string) => void;
  /** Dashed least-squares line (drawn only with ≥ 3 nights and spread in hours). Default `true`. */
  showTrend?: boolean;
  /** Caption under the plot; `null` hides it. Defaults to a short "tap a dot" hint. */
  hint?: string | null;
};

/**
 * RF-64: scatter of hours slept (x) against the next day's mood (y, 1–5).
 * Each dot is one night (US-17 CA-01). Tapping near a dot selects it and opens
 * a small card with the date, hours and mood; tapping empty space clears it.
 * Screen readers get an adjustable element: swipe up/down to step through nights.
 */
export function ScatterChart({ points, width, height = 190, onPressPoint, showTrend = true, hint = DEFAULT_HINT }: ScatterChartProps) {
  const c = useColors();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const [selection, setSelection] = useState<{ day: string; viaA11y: boolean } | null>(null);
  const selectedDay = selection?.day ?? null;
  // Measured tooltip height (it grows with the system font scale); TOOLTIP_H until laid out.
  const [tooltipH, setTooltipH] = useState(TOOLTIP_H);

  const { minX, maxX } = sleepDomain(points);
  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
  const x = (value: number) => PAD_LEFT + ((value - minX) / (maxX - minX)) * plotW;
  const y = (mood: number) => PAD_TOP + (1 - (mood - MOOD_AXIS_MIN) / (MOOD_AXIS_MAX - MOOD_AXIS_MIN)) * plotH;
  const step = maxX - minX > 8 ? 2 : 1;
  const hourTicks = Array.from({ length: Math.floor((maxX - minX) / step) + 1 }, (_, index) => minX + index * step);

  const dots = points.map((point) => ({ x: x(point.sleepHours), y: y(point.mood) }));
  const selectedIndex = selectedDay === null ? -1 : points.findIndex((point) => point.day === selectedDay);
  const selected = selectedIndex >= 0 ? points[selectedIndex] : null;
  const details = selected ? describePoint(selected) : null;

  const fit = showTrend ? leastSquares(points) : null;
  const segment = fit ? trendSegment(fit, minX, maxX) : null;

  // One shared clock drives the initial reveal: dots sweep in left to right, then the trend line draws.
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      reveal.set(1);
      return;
    }
    reveal.set(withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, reveal]);

  const stagger = points.length <= STAGGER_LIMIT;
  const xRange = maxX - minX;

  const select = (index: number | null, viaA11y = false) => setSelection(index === null ? null : { day: points[index].day, viaA11y });

  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const index = nearestPointIndex(dots, { x: locationX, y: locationY }, MIN_TOUCH * 0.7);
    if (index === null || index === selectedIndex) select(null);
    else select(index);
  };

  const handleA11yAction = (actionName: string) => {
    const current = selectedIndex >= 0 ? selectedIndex : null;
    if (actionName === 'increment') select(stepIndex(current, 1, points.length), true);
    else if (actionName === 'decrement') select(stepIndex(current, -1, points.length), true);
    else if (actionName === 'activate' && selected && onPressPoint) onPressPoint(selected.day);
  };

  // Tooltip: above the dot when there is room, otherwise below it; never past the chart edges.
  const tooltipW = Math.min(TOOLTIP_MAX_W, width - 8);
  const sel = selectedIndex >= 0 ? dots[selectedIndex] : null;
  const tooltipLeft = sel ? Math.min(Math.max(sel.x - tooltipW / 2, 4), width - tooltipW - 4) : 0;
  const tooltipTop = sel ? (sel.y - tooltipH - 14 >= 0 ? sel.y - tooltipH - 14 : Math.max(0, Math.min(sel.y + 14, height - tooltipH))) : 0;

  return (
    <View>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          {MOOD_TICKS.map((mood) => (
            <Line key={`gy-${mood}`} x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={y(mood)} y2={y(mood)} stroke={c.border} strokeWidth={1} />
          ))}
          {MOOD_TICKS.map((mood) => (
            <SvgText
              key={`ly-${mood}`}
              x={PAD_LEFT - 8}
              y={y(mood) + 4}
              fontSize={11}
              fontFamily={MenteFonts.regular}
              fill={selected && Math.round(selected.mood) === mood ? c.text : c.textMuted}
              textAnchor="end">
              {mood}
            </SvgText>
          ))}
          {hourTicks.map((hour) => (
            <SvgText key={`lx-${hour}`} x={x(hour)} y={height - 8} fontSize={11} fontFamily={MenteFonts.regular} fill={c.textMuted} textAnchor="middle">
              {`${hour}h`}
            </SvgText>
          ))}

          {segment ? (
            <TrendLine
              reveal={reveal}
              x1={x(segment.x1)}
              y1={y(segment.y1)}
              x2={x(segment.x2)}
              y2={y(segment.y2)}
              color={c.accent}
            />
          ) : null}

          {sel ? (
            <G>
              <Line x1={sel.x} x2={sel.x} y1={sel.y} y2={PAD_TOP + plotH} stroke={c.mood} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 3" />
              <Line x1={PAD_LEFT} x2={sel.x} y1={sel.y} y2={sel.y} stroke={c.mood} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 3" />
            </G>
          ) : null}

          <DotsLayer reveal={reveal} stagger={stagger}>
            {points.map((point, index) => (
              <Dot
                key={point.day}
                reveal={reveal}
                stagger={stagger}
                // Left-to-right sweep: a dot's start delay follows its position on the hours axis.
                delay={xRange > 0 ? ((point.sleepHours - minX) / xRange) * 0.5 : 0}
                cx={dots[index].x}
                cy={dots[index].y}
                fill={c.mood}
                ring={c.surface}
                dimmed={selected !== null && index !== selectedIndex}
              />
            ))}
          </DotsLayer>

          {sel ? <SelectedDot key={selectedDay} cx={sel.x} cy={sel.y} fill={c.mood} ring={c.surface} reduceMotion={reduceMotion} /> : null}
        </Svg>

        {/* Transparent touch layer above the plot: nearest-dot lookup gives every night a ≥ 44pt target. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Gráfico de dispersão com ${points.length} ${points.length === 1 ? 'noite' : 'noites'}`}
          accessibilityValue={{ text: details ? details.accessibilityLabel : 'Nenhuma noite selecionada' }}
          accessibilityHint="Toque em um ponto para ver os detalhes. Deslize para cima ou para baixo para percorrer as noites."
          accessibilityActions={[
            { name: 'increment', label: 'Próxima noite' },
            { name: 'decrement', label: 'Noite anterior' },
            ...(onPressPoint && selected ? [{ name: 'activate', label: 'Ver dia' }] : []),
          ]}
          onAccessibilityAction={(event) => handleA11yAction(event.nativeEvent.actionName)}
        />

        {details && selected ? (
          <Animated.View
            key={selected.day}
            entering={reduceMotion ? undefined : FadeIn.duration(180)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
            onLayout={(event) => setTooltipH(Math.ceil(event.nativeEvent.layout.height))}
            // Only "Ver dia" catches touches: taps on the card body fall through to the plot below.
            pointerEvents="box-none"
            style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop, width: tooltipW }]}>
            <View style={styles.tooltipText} pointerEvents="none">
              <Text
                style={styles.tooltipDate}
                numberOfLines={1}
                maxFontSizeMultiplier={1.6}
                // Stepping with the adjustable action is already read through accessibilityValue.
                accessibilityLiveRegion={selection?.viaA11y ? 'none' : 'polite'}
                accessibilityLabel={details.accessibilityLabel}>
                {details.date}
              </Text>
              <Text style={styles.tooltipMeta} numberOfLines={1} maxFontSizeMultiplier={1.6} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                {details.sleep} · {details.mood}
              </Text>
            </View>
            {onPressPoint ? (
              <Pressable
                onPress={() => onPressPoint(selected.day)}
                accessibilityRole="button"
                accessibilityLabel={`Ver dia ${details.date}`}
                hitSlop={4}
                style={({ pressed }) => [styles.tooltipAction, pressed && styles.tooltipActionPressed]}>
                <Text style={styles.tooltipActionText} maxFontSizeMultiplier={1.6}>
                  Ver dia
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Fades the whole layer in at once when there are too many dots to stagger. */
function DotsLayer({ reveal, stagger, children }: { reveal: SharedValue<number>; stagger: boolean; children: ReactNode }) {
  const animatedProps = useAnimatedProps(() => ({ opacity: stagger ? 1 : reveal.get() }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

function Dot({
  reveal,
  stagger,
  delay,
  cx,
  cy,
  fill,
  ring,
  dimmed,
}: {
  reveal: SharedValue<number>;
  stagger: boolean;
  /** 0–0.5: share of the reveal that passes before this dot starts to appear. */
  delay: number;
  cx: number;
  cy: number;
  fill: string;
  ring: string;
  dimmed: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    if (!stagger) return { r: DOT_R, opacity: 1 };
    const t = interpolate(reveal.get(), [delay, delay + 0.5], [0, 1], 'clamp');
    return { r: DOT_R * (0.4 + 0.6 * t), opacity: t };
  });
  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={cx}
      cy={cy}
      r={DOT_R}
      fill={fill}
      fillOpacity={dimmed ? 0.3 : 0.75}
      stroke={ring}
      strokeWidth={1.5}
    />
  );
}

/** The chosen night: a solid, slightly larger dot with a halo; springs up when it mounts. */
function SelectedDot({ cx, cy, fill, ring, reduceMotion }: { cx: number; cy: number; fill: string; ring: string; reduceMotion: boolean }) {
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) grow.set(withSpring(1, { damping: 14, stiffness: 220 }));
  }, [grow, reduceMotion]);
  const dotProps = useAnimatedProps(() => ({ r: DOT_R + (SELECTED_R - DOT_R) * grow.get() }));
  const haloProps = useAnimatedProps(() => ({ r: SELECTED_R + 7 * grow.get(), opacity: 0.25 * grow.get() }));
  return (
    <G>
      <AnimatedCircle animatedProps={haloProps} cx={cx} cy={cy} r={SELECTED_R + 7} fill={fill} opacity={0.25} />
      <AnimatedCircle animatedProps={dotProps} cx={cx} cy={cy} r={SELECTED_R} fill={fill} stroke={ring} strokeWidth={2.5} />
    </G>
  );
}

/** Dashed least-squares line that draws itself from left to right after the dots appear. */
function TrendLine({
  reveal,
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  reveal: SharedValue<number>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = interpolate(reveal.get(), [0.35, 1], [0, 1], 'clamp');
    return { x2: x1 + (x2 - x1) * t, y2: y1 + (y2 - y1) * t, opacity: t === 0 ? 0 : 0.85 };
  });
  return (
    <AnimatedLine
      animatedProps={animatedProps}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={2}
      strokeDasharray="6 5"
      strokeLinecap="round"
    />
  );
}

const useStyles = makeStyles((c) => ({
  tooltip: {
    position: 'absolute',
    minHeight: TOOLTIP_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: MenteRadius.input,
    // Page background + a visible border: surface-on-surface vanished in dark mode.
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: `${c.textMuted}66`,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tooltipText: { flex: 1, minWidth: 0 },
  tooltipDate: { ...MenteType.smallStrong, color: c.text },
  tooltipMeta: { ...MenteType.small, color: c.textMuted },
  tooltipAction: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: 12,
    borderRadius: MenteRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  tooltipActionPressed: { opacity: 0.8 },
  tooltipActionText: { ...MenteType.smallStrong, color: c.onPrimary },
  hint: { ...MenteType.small, color: c.textMuted, marginTop: 6, textAlign: 'center' },
}));

