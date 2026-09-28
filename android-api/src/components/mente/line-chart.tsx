import { StyleSheet, View } from 'react-native';

import { MenteColors } from '@/constants/mente-theme';

export type Series = {
  /** One value per point, normalised to 0 (bottom) … 1 (top). */
  values: readonly number[];
  color: string;
  /** Draws a dot at every point, as the prototype does for the mood line. */
  dots?: boolean;
};

const GRID_LINES = 5;
const STROKE = 2;
const DOT = 7;

/**
 * The "Evolução" chart. Each segment is a rotated view, which keeps the project
 * free of `react-native-svg` — the same trade-off `icon.tsx` makes.
 */
export function LineChart({
  width,
  height,
  series,
}: {
  width: number;
  height: number;
  series: readonly Series[];
}) {
  const toPoint = (value: number, index: number, count: number) => ({
    x: count === 1 ? width / 2 : (index / (count - 1)) * width,
    y: (1 - value) * height,
  });

  return (
    <View style={{ width, height }}>
      {Array.from({ length: GRID_LINES }, (_, index) => (
        <View
          key={`grid-${index}`}
          style={[styles.grid, { top: (index / (GRID_LINES - 1)) * height, width }]}
        />
      ))}

      {series.map((line, lineIndex) =>
        line.values.map((value, index) => {
          const from = toPoint(value, index, line.values.length);
          const next = line.values[index + 1];
          const nodes = [];

          if (next !== undefined) {
            const to = toPoint(next, index + 1, line.values.length);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.hypot(dx, dy);

            nodes.push(
              <View
                key={`seg-${lineIndex}-${index}`}
                style={[
                  styles.segment,
                  {
                    width: length,
                    height: STROKE,
                    left: (from.x + to.x) / 2 - length / 2,
                    top: (from.y + to.y) / 2 - STROKE / 2,
                    backgroundColor: line.color,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  },
                ]}
              />,
            );
          }

          if (line.dots) {
            nodes.push(
              <View
                key={`dot-${lineIndex}-${index}`}
                style={[
                  styles.dot,
                  { left: from.x - DOT / 2, top: from.y - DOT / 2, backgroundColor: line.color },
                ]}
              />,
            );
          }

          return nodes;
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    position: 'absolute',
    left: 0,
    height: 1,
    backgroundColor: MenteColors.border,
  },
  segment: {
    position: 'absolute',
    borderRadius: STROKE / 2,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});
