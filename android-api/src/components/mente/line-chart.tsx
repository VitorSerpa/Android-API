import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { MenteFonts, MenteRadius, MenteType } from '@/constants/mente-theme';
import {
  areaPath,
  hasValueAt,
  linePath,
  linearTrend,
  nearestIndex,
  pointSummary,
  pointValueText,
  pointX,
  pointY,
  stepIndex,
  tooltipLeft,
  valueRuns,
  type CurveKind,
  type PlotBox,
} from '@/lib/line-chart-math';
import { makeStyles, useColors } from '@/theme';

export type Series = {
  /** One value per point, normalised to 0 (bottom) … 1 (top). `null` leaves a gap. */
  values: readonly (number | null)[];
  color: string;
  /** Draws a dot at every point, as the prototype does for the mood line. */
  dots?: boolean;
  /** Name shown in the tooltip row ("Humor", a profile name…). */
  label?: string;
  /** Ready-made tooltip text per index (wins over `format`). */
  displayValues?: readonly (string | null)[];
  /** Tooltip text for the raw value at `index`; return `null` to fall back to a percentage. */
  format?: (index: number) => string | null;
  /** Soft gradient fill under the line. */
  area?: boolean;
  /** Dashed least-squares trend line across the period. */
  trend?: boolean;
};

export type LineChartProps = {
  width: number;
  height: number;
  series: readonly Series[];
  /** One label per index, used as the tooltip title ("Seg, 3 nov"). */
  labels?: readonly string[];
  /** Tapping the tooltip calls this with the selected index (e.g. open that day). */
  onPressPoint?: (index: number) => void;
  /** Call to action inside the tooltip when `onPressPoint` is set. Default: "Ver detalhes". */
  tooltipActionLabel?: string;
  /** Reveal the lines left-to-right on mount / when the period changes. Default: true. */
  initialAnimation?: boolean;
  /** `smooth` (monotone, never overshoots) or `linear`. Default: smooth. */
  curve?: CurveKind;
  /** Number of horizontal grid lines. Default: 5. */
  gridLines?: number;
  /** Notified whenever the selected index changes (`null` = cleared). */
  onSelect?: (index: number | null) => void;
  /**
   * When set, the plot becomes its own "adjustable" accessibility element: swipe up/down
   * steps through the points. Leave unset when a parent view is already `accessible`.
   */
  accessibilityLabel?: string;
};

const STROKE = 2;
const DOT = 7;
const SELECTED_DOT = 12;
const PAD = SELECTED_DOT / 2 + 1;
/** Movement (pt) before a drag counts as a horizontal scrub or a scroll. */
const SLOP = 8;
const TOOLTIP_WIDTH = 176;
const TOOLTIP_GAP = 8;
const REVEAL_MS = 650;

/**
 * Line chart used on the Histórico tab. Tap or drag horizontally over it to inspect a
 * point: a guide line and highlighted dots mark the index, and a tooltip card above the
 * plot lists every series. Tap the same point again to dismiss.
 *
 * Touch handling uses React Native's responder system (no gesture-handler root here):
 * - the plot claims the touch on start but lets a vertical drag go to the page ScrollView;
 * - a mostly horizontal drag is claimed by the outer view, which then blocks scrolling
 *   and refuses to hand the touch back until the finger lifts.
 */
export function LineChart({
  width,
  height,
  series,
  labels,
  onPressPoint,
  tooltipActionLabel = 'Ver detalhes',
  initialAnimation = true,
  curve = 'smooth',
  gridLines = 5,
  onSelect,
  accessibilityLabel,
}: LineChartProps) {
  const styles = useStyles();
  const c = useColors();
  const reduceMotion = useReducedMotion();
  // The label is kept with the index so a selection made on another x domain (the parent
  // switched period) is dropped instead of silently pointing at a different day.
  // `viaA11y` marks a change made with the adjustable action: TalkBack already reads the new
  // accessibilityValue, so the tooltip's live region stays quiet for it.
  const [selection, setSelection] = useState<{ index: number; label: string | undefined; viaA11y: boolean } | null>(null);

  const box: PlotBox = { width, height, padX: PAD, padY: PAD };
  const count = series.reduce((max, line) => Math.max(max, line.values.length), 0);
  const isSelectable = (index: number) => hasValueAt(series, index);
  // A stale index (period switched, fewer days, the day moved) simply reads as "nothing selected".
  const selected =
    selection !== null && selection.index < count && labels?.[selection.index] === selection.label && isSelectable(selection.index)
      ? selection.index
      : null;

  /* --------------------------- reveal animation --------------------------- */
  const animate = initialAnimation && !reduceMotion;
  const reveal = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) }));
  }, [animate, count, reveal]);
  const revealStyle = useAnimatedStyle(() => ({ width: reveal.get() * width }));

  /* ------------------------------ selection ------------------------------ */
  const select = (index: number | null, viaA11y = false) => {
    setSelection(index === null ? null : { index, label: labels?.[index], viaA11y });
    onSelect?.(index);
  };

  const titleOf = (index: number) => labels?.[index] ?? `Ponto ${index + 1}`;

  const announce = (index: number | null) => {
    // Android reads the tooltip through its live region; iOS needs an explicit announcement.
    if (Platform.OS === 'ios' && index !== null) {
      AccessibilityInfo.announceForAccessibility(pointSummary(titleOf(index), series, index));
    }
  };

  // Touch bookkeeping lives in a ref: it changes on every move and never affects rendering.
  const touch = useRef({ active: false, startX: 0, startPageX: 0, startPageY: 0, scrubbing: false, moved: false });

  const xFor = (event: GestureResponderEvent) => touch.current.startX + (event.nativeEvent.pageX - touch.current.startPageX);

  const scrubTo = (event: GestureResponderEvent) => {
    const index = nearestIndex(xFor(event), count, box, isSelectable);
    if (index !== null && index !== selected) select(index);
  };

  const isHorizontal = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - touch.current.startPageX;
    const dy = event.nativeEvent.pageY - touch.current.startPageY;
    return Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy);
  };

  // Inner plot: taps.
  const plotResponder = {
    onStartShouldSetResponder: (event: GestureResponderEvent) => {
      touch.current = {
        active: true,
        startX: event.nativeEvent.locationX,
        startPageX: event.nativeEvent.pageX,
        startPageY: event.nativeEvent.pageY,
        scrubbing: false,
        moved: false,
      };
      return count > 0;
    },
    // Returning false keeps native scrolling available until we know the direction.
    onResponderGrant: () => false,
    onResponderMove: (event: GestureResponderEvent) => {
      const dx = event.nativeEvent.pageX - touch.current.startPageX;
      const dy = event.nativeEvent.pageY - touch.current.startPageY;
      if (Math.hypot(dx, dy) > SLOP) touch.current.moved = true;
    },
    onResponderTerminationRequest: () => true,
    onResponderRelease: (event: GestureResponderEvent) => {
      touch.current.active = false;
      if (touch.current.moved) return;
      const index = nearestIndex(xFor(event), count, box, isSelectable);
      const next = index === selected ? null : index;
      select(next);
      announce(next);
    },
    onResponderTerminate: () => {
      touch.current.active = false;
    },
  };

  // Outer view: horizontal scrub (steals the touch from the plot once the drag is horizontal).
  const scrubResponder = {
    onMoveShouldSetResponder: (event: GestureResponderEvent) => touch.current.active && isHorizontal(event),
    // `true` blocks the native responder, i.e. the ScrollView stops scrolling while we scrub.
    onResponderGrant: (event: GestureResponderEvent) => {
      touch.current.scrubbing = true;
      touch.current.moved = true;
      scrubTo(event);
      return true;
    },
    onResponderMove: scrubTo,
    onResponderTerminationRequest: () => !touch.current.scrubbing,
    onResponderRelease: () => {
      touch.current.active = false;
      touch.current.scrubbing = false;
      announce(selected);
    },
    onResponderTerminate: () => {
      touch.current.active = false;
      touch.current.scrubbing = false;
    },
  };

  /* -------------------------------- drawing ------------------------------- */
  const baseline = pointY(0, box);
  const drawn = series.map((line) => {
    const runs = valueRuns(line.values).map((run) =>
      run.values.map((value, offset) => ({ x: pointX(run.start + offset, count, box), y: pointY(value, box) })),
    );
    const trend = line.trend ? linearTrend(line.values) : null;
    return { line, runs, trend };
  });

  const selectedX = selected === null ? 0 : pointX(selected, count, box);
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, width);

  const a11yProps = accessibilityLabel
    ? {
        accessible: true,
        accessibilityRole: 'adjustable' as const,
        accessibilityLabel,
        accessibilityHint: 'Deslize para cima ou para baixo para percorrer os pontos.',
        accessibilityValue: { text: selected === null ? 'Nenhum ponto selecionado' : pointSummary(titleOf(selected), series, selected) },
        accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }],
        onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
          const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
          select(stepIndex(selected, delta, count, isSelectable), true);
        },
      }
    : { accessible: false };

  return (
    <View style={{ width, height }} {...scrubResponder}>
      <View style={{ width, height }} {...plotResponder} {...a11yProps}>
        {/* Grid stays put; only the data is revealed. */}
        <Svg width={width} height={height} pointerEvents="none" style={styles.layer}>
          {Array.from({ length: gridLines }, (_, index) => {
            const y = gridLines === 1 ? baseline : PAD + (index / (gridLines - 1)) * (height - PAD * 2);
            return <Line key={`grid-${index}`} x1={0} x2={width} y1={y} y2={y} stroke={c.border} strokeWidth={1} />;
          })}
        </Svg>

        <Animated.View style={[styles.layer, styles.clip, { height }, revealStyle]} pointerEvents="none">
          <Svg width={width} height={height}>
            <Defs>
              {drawn.map(({ line }, lineIndex) =>
                line.area ? (
                  <LinearGradient key={`grad-${lineIndex}`} id={`area-${lineIndex}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={line.color} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={line.color} stopOpacity={0} />
                  </LinearGradient>
                ) : null,
              )}
            </Defs>

            {drawn.map(({ line, runs }, lineIndex) =>
              line.area
                ? runs.map((points, runIndex) => (
                    <Path key={`area-${lineIndex}-${runIndex}`} d={areaPath(points, baseline, curve)} fill={`url(#area-${lineIndex})`} />
                  ))
                : null,
            )}

            {drawn.map(({ line, trend }, lineIndex) =>
              trend ? (
                <Line
                  key={`trend-${lineIndex}`}
                  x1={pointX(0, count, box)}
                  x2={pointX(count - 1, count, box)}
                  y1={pointY(trend.from, box)}
                  y2={pointY(trend.to, box)}
                  stroke={line.color}
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              ) : null,
            )}

            {drawn.map(({ line, runs }, lineIndex) =>
              runs.map((points, runIndex) =>
                points.length > 1 ? (
                  <Path
                    key={`line-${lineIndex}-${runIndex}`}
                    d={linePath(points, curve)}
                    stroke={line.color}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={selected === null ? 1 : 0.85}
                  />
                ) : null,
              ),
            )}

            {drawn.map(({ line, runs }, lineIndex) =>
              runs.flatMap((points, runIndex) =>
                // A lone value between gaps would be invisible without a dot.
                line.dots || points.length === 1
                  ? points.map((point, pointIndex) => (
                      <Circle
                        key={`dot-${lineIndex}-${runIndex}-${pointIndex}`}
                        cx={point.x}
                        cy={point.y}
                        r={line.dots ? DOT / 2 : STROKE + 0.5}
                        fill={line.color}
                      />
                    ))
                  : [],
              ),
            )}
          </Svg>
        </Animated.View>

        {selected !== null ? (
          <>
            <Animated.View
              // Stable keys: the guide and dots stay mounted while scrubbing and only move;
              // the entering animation runs once, when a selection first appears.
              key="guide"
              entering={reduceMotion ? undefined : FadeIn.duration(140)}
              pointerEvents="none"
              style={[styles.guide, { left: selectedX - 0.5, height }]}
            />
            {series.map((line, lineIndex) => {
              const value = line.values[selected];
              if (value === null || value === undefined) return null;
              return (
                <Animated.View
                  key={`sel-${lineIndex}`}
                  entering={reduceMotion ? undefined : ZoomIn.duration(180)}
                  pointerEvents="none"
                  style={[
                    styles.selectedDot,
                    { left: selectedX - SELECTED_DOT / 2, top: pointY(value, box) - SELECTED_DOT / 2, backgroundColor: line.color },
                  ]}
                />
              );
            })}
          </>
        ) : null}
      </View>

      {selected !== null ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={[styles.tooltipWrap, { width: tooltipWidth, left: tooltipLeft(selectedX, tooltipWidth, width), bottom: height + TOOLTIP_GAP }]}>
          <Pressable
            onPress={() => (onPressPoint ? onPressPoint(selected) : select(null))}
            accessibilityRole="button"
            accessibilityLabel={pointSummary(titleOf(selected), series, selected)}
            accessibilityHint={onPressPoint ? tooltipActionLabel : 'Toque para fechar'}
            // One live region for the whole point summary (not one per row).
            accessibilityLiveRegion={selection?.viaA11y ? 'none' : 'polite'}
            style={({ pressed }) => [styles.tooltip, pressed && styles.pressed]}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle} numberOfLines={1}>
                {titleOf(selected)}
              </Text>
              {onPressPoint ? (
                <Text style={styles.tooltipAction} numberOfLines={1}>
                  {`${tooltipActionLabel} ›`}
                </Text>
              ) : null}
            </View>
            {series.map((line, lineIndex) => (
              <View key={`row-${lineIndex}`} style={styles.tooltipRow}>
                <View style={[styles.tooltipDot, { backgroundColor: line.color }]} />
                <Text style={styles.tooltipLabel} numberOfLines={1}>
                  {line.label ?? `Série ${lineIndex + 1}`}
                </Text>
                <Text style={styles.tooltipValue} numberOfLines={1}>
                  {pointValueText(line, selected)}
                </Text>
              </View>
            ))}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  clip: {
    overflow: 'hidden',
  },
  guide: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: c.textMuted,
    opacity: 0.45,
  },
  selectedDot: {
    position: 'absolute',
    width: SELECTED_DOT,
    height: SELECTED_DOT,
    borderRadius: SELECTED_DOT / 2,
    borderWidth: 2,
    borderColor: c.surface,
  },
  tooltipWrap: {
    position: 'absolute',
    zIndex: 10,
    elevation: 6,
  },
  tooltip: {
    minHeight: 44,
    // Page background, not the card's surface: the tooltip floats over card text and must
    // read as a separate layer in dark mode too, where the shadow is invisible.
    backgroundColor: c.background,
    borderRadius: MenteRadius.input,
    borderWidth: 1,
    borderColor: `${c.textMuted}66`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
    boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.16)',
  },
  pressed: {
    opacity: 0.75,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipTitle: {
    ...MenteType.smallStrong,
    color: c.text,
    flex: 1,
  },
  tooltipAction: {
    ...MenteType.link,
    fontFamily: MenteFonts.semiBold,
    color: c.accent,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipLabel: {
    ...MenteType.small,
    color: c.textMuted,
    flex: 1,
  },
  tooltipValue: {
    ...MenteType.smallStrong,
    color: c.text,
  },
}));
