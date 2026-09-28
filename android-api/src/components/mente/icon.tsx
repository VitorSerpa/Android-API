import { StyleSheet, View } from 'react-native';

import { MenteColors } from '@/constants/mente-theme';

/**
 * The prototype's glyphs, drawn with plain views instead of the exported SVGs —
 * same approach as `botanical-hero`, and it keeps the project free of
 * `react-native-svg`.
 *
 * Every shape is authored inside a 20×20 box and scaled to the requested size,
 * so an icon can be dropped in at any dimension without re-measuring.
 */
const BOX = 20;

type Side = 'top' | 'right' | 'bottom' | 'left';

type Shape =
  | {
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      /** Corner radius; `w / 2` on a square gives a circle. */
      r?: number;
      rotate?: number;
      /** Painted in `cutColor` instead of the icon colour, to punch a hole. */
      cut?: boolean;
    }
  | {
      type: 'ring';
      x: number;
      y: number;
      d: number;
      thickness?: number;
      rotate?: number;
      /** Sides left unpainted, which turns the ring into an arc. */
      open?: Side[];
    }
  | { type: 'triangle'; x: number; y: number; w: number; h: number };

const circle = (x: number, y: number, d: number, cut = false): Shape => ({
  type: 'rect',
  x,
  y,
  w: d,
  h: d,
  r: d / 2,
  cut,
});

const ICONS = {
  home: [
    { type: 'triangle', x: 1, y: 2.5, w: 18, h: 9 },
    { type: 'rect', x: 5, y: 10, w: 10, h: 8, r: 1.5 },
  ],
  // Geometry lifted from the Figma bottom nav (19px box, scaled to 20).
  diary: [
    { type: 'rect', x: 2.73, y: 1.82, w: 11.82, h: 16.36, r: 1.82 },
    { type: 'rect', x: 15, y: 4.55, w: 2.73, h: 10.91, r: 1.36 },
  ],
  chart: [
    { type: 'rect', x: 1.82, y: 10.91, w: 3.64, h: 7.27, r: 1.36 },
    { type: 'rect', x: 8.18, y: 5.45, w: 3.64, h: 12.73, r: 1.36 },
    { type: 'rect', x: 14.55, y: 1.82, w: 3.64, h: 16.36, r: 1.36 },
  ],
  // Four-point sparkle: a plus crossed with a smaller diagonal plus.
  tools: [
    { type: 'rect', x: 8.9, y: 0.5, w: 2.2, h: 19, r: 1.1 },
    { type: 'rect', x: 0.5, y: 8.9, w: 19, h: 2.2, r: 1.1 },
    { type: 'rect', x: 9.2, y: 4, w: 1.6, h: 12, r: 0.8, rotate: 45 },
    { type: 'rect', x: 4, y: 9.2, w: 12, h: 1.6, r: 0.8, rotate: 45 },
  ],
  user: [circle(6, 2, 8), { type: 'rect', x: 3, y: 12, w: 14, h: 7, r: 5 }],
  chevronLeft: [
    { type: 'rect', x: 8.4, y: 2.3, w: 2.2, h: 9, r: 1.1, rotate: 45 },
    { type: 'rect', x: 8.4, y: 8.7, w: 2.2, h: 9, r: 1.1, rotate: -45 },
  ],
  chevronRight: [
    { type: 'rect', x: 8.4, y: 2.3, w: 2.2, h: 9, r: 1.1, rotate: -45 },
    { type: 'rect', x: 8.4, y: 8.7, w: 2.2, h: 9, r: 1.1, rotate: 45 },
  ],
  /** Concentric rings — the breathing exercises and the quick-relief FAB. */
  breath: [{ type: 'ring', x: 1, y: 1, d: 18, thickness: 1.8 }, circle(7, 7, 6)],
  moon: [{ type: 'ring', x: 2, y: 2, d: 16, thickness: 2.4, open: ['top', 'right'], rotate: -30 }],
  alert: [
    { type: 'triangle', x: 1, y: 3, w: 18, h: 15 },
    { type: 'rect', x: 9, y: 8, w: 2, h: 4.5, r: 1, cut: true },
    circle(9, 14, 2, true),
  ],
  photo: [
    { type: 'rect', x: 1.5, y: 3.5, w: 17, h: 13, r: 2.5 },
    circle(4, 6, 3.5, true),
    { type: 'triangle', x: 5, y: 8.5, w: 11, h: 6 },
  ],
  // Geometry lifted from the Figma journal editor (15px box, scaled to 20).
  mic: [
    { type: 'rect', x: 7.27, y: 1.82, w: 5.45, h: 10, r: 2.73 },
    { type: 'rect', x: 9.09, y: 13.64, w: 1.82, h: 4.55, r: 0.9 },
    { type: 'rect', x: 4.55, y: 14.55, w: 10.91, h: 1.82, r: 0.9 },
  ],
  expand: [
    { type: 'rect', x: 1.82, y: 1.82, w: 7.27, h: 1.82, r: 0.9 },
    { type: 'rect', x: 1.82, y: 1.82, w: 1.82, h: 7.27, r: 0.9 },
    { type: 'rect', x: 10.91, y: 16.36, w: 7.27, h: 1.82, r: 0.9 },
    { type: 'rect', x: 16.36, y: 10.91, w: 1.82, h: 7.27, r: 0.9 },
  ],
  lock: [
    { type: 'ring', x: 6, y: 2.5, d: 8, thickness: 2, open: ['bottom'] },
    { type: 'rect', x: 3.5, y: 8.5, w: 13, h: 9.5, r: 2.5 },
  ],
  cloud: [
    circle(2, 8, 8),
    circle(6.5, 4, 10),
    circle(11, 8, 8),
    { type: 'rect', x: 3, y: 11, w: 14, h: 5, r: 2.5 },
  ],
  people: [
    circle(2, 4, 6),
    circle(12, 4, 6),
    { type: 'rect', x: 0.5, y: 11, w: 9, h: 6, r: 3 },
    { type: 'rect', x: 10.5, y: 11, w: 9, h: 6, r: 3 },
  ],
  phone: [
    { type: 'rect', x: 4, y: 1.5, w: 12, h: 17, r: 2.5 },
    { type: 'rect', x: 6, y: 4, w: 8, h: 10.5, r: 1, cut: true },
    circle(9, 15.5, 2, true),
  ],
  music: [
    circle(2.5, 12.5, 5.5),
    { type: 'rect', x: 6.5, y: 2, w: 2, h: 12.5, r: 1 },
    { type: 'rect', x: 6.5, y: 2, w: 10, h: 2.4, r: 1.2 },
  ],
  /** Google Fit — a health plus. */
  fit: [
    { type: 'rect', x: 8.5, y: 2, w: 3, h: 16, r: 1.5 },
    { type: 'rect', x: 2, y: 8.5, w: 16, h: 3, r: 1.5 },
  ],
  doc: [
    { type: 'rect', x: 4, y: 1.5, w: 12, h: 17, r: 2 },
    { type: 'rect', x: 6.5, y: 5, w: 7, h: 1.6, r: 0.8, cut: true },
    { type: 'rect', x: 6.5, y: 8.5, w: 7, h: 1.6, r: 0.8, cut: true },
    { type: 'rect', x: 6.5, y: 12, w: 4.5, h: 1.6, r: 0.8, cut: true },
  ],
  share: [
    { type: 'rect', x: 5.5, y: 5.2, w: 9, h: 1.6, r: 0.8, rotate: -28 },
    { type: 'rect', x: 5.5, y: 13.2, w: 9, h: 1.6, r: 0.8, rotate: 28 },
    circle(12.5, 1.5, 5.5),
    circle(12.5, 13, 5.5),
    circle(2, 7.25, 5.5),
  ],
  target: [
    { type: 'ring', x: 1, y: 1, d: 18, thickness: 2 },
    { type: 'ring', x: 5.5, y: 5.5, d: 9, thickness: 2 },
    circle(8.5, 8.5, 3),
  ],
  bulb: [
    circle(5, 1.5, 10),
    { type: 'rect', x: 7.5, y: 12, w: 5, h: 2, r: 1 },
    { type: 'rect', x: 8, y: 15.5, w: 4, h: 2, r: 1 },
  ],
  wave: [
    { type: 'rect', x: 2, y: 6, w: 16, h: 2.4, r: 1.2 },
    { type: 'rect', x: 2, y: 11.5, w: 11, h: 2.4, r: 1.2 },
  ],
  anchor: [
    circle(7.5, 1, 5),
    { type: 'rect', x: 9, y: 5.5, w: 2, h: 13, r: 1 },
    { type: 'rect', x: 4, y: 7.5, w: 12, h: 2, r: 1 },
  ],
  heart: [
    { type: 'rect', x: 4, y: 5.5, w: 12, h: 12, r: 1.5, rotate: 45 },
    circle(2.2, 3.2, 9.6),
    circle(8.2, 3.2, 9.6),
  ],
  close: [
    { type: 'rect', x: 8.9, y: 1, w: 2.2, h: 18, r: 1.1, rotate: 45 },
    { type: 'rect', x: 8.9, y: 1, w: 2.2, h: 18, r: 1.1, rotate: -45 },
  ],
  bell: [
    circle(8.5, 0.5, 3),
    { type: 'rect', x: 5, y: 3, w: 10, h: 11, r: 5 },
    { type: 'rect', x: 2.5, y: 12.5, w: 15, h: 2.2, r: 1.1 },
    circle(7.5, 15.5, 5),
  ],
  /** "Registrar esta crise" — a clipboard. */
  clipboard: [
    { type: 'rect', x: 4, y: 3, w: 12, h: 16, r: 2 },
    { type: 'rect', x: 7, y: 1, w: 6, h: 3.5, r: 1.2 },
    { type: 'rect', x: 6.5, y: 8, w: 7, h: 1.6, r: 0.8, cut: true },
    { type: 'rect', x: 6.5, y: 12, w: 4.5, h: 1.6, r: 0.8, cut: true },
  ],
  // A paint palette: the outer ring, a thumb hole, and three wells of colour.
  palette: [
    { type: 'ring', x: 1, y: 1, d: 18, thickness: 2.2 },
    circle(4.5, 5, 2.6),
    circle(9, 3.5, 2.6),
    circle(13.4, 6, 2.6),
    circle(12, 11.5, 3.4),
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Fill used by shapes flagged `cut`, so punched-out details read correctly. */
  cutColor?: string;
};

export function Icon({
  name,
  size = 20,
  color = MenteColors.textMuted,
  cutColor = MenteColors.surface,
}: IconProps) {
  const scale = size / BOX;
  // `as const` above keeps each entry's literal type, which hides the optional
  // members from narrowing; widen back to the union before rendering.
  const shapes: readonly Shape[] = ICONS[name];

  return (
    <View style={{ width: size, height: size }}>
      {shapes.map((shape, index) => {
        const key = `${name}-${index}`;

        if (shape.type === 'triangle') {
          return (
            <View
              key={key}
              style={[
                styles.shape,
                {
                  left: shape.x * scale,
                  top: shape.y * scale,
                  borderLeftWidth: (shape.w / 2) * scale,
                  borderRightWidth: (shape.w / 2) * scale,
                  borderBottomWidth: shape.h * scale,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: color,
                },
              ]}
            />
          );
        }

        if (shape.type === 'ring') {
          const open = shape.open ?? [];
          return (
            <View
              key={key}
              style={[
                styles.shape,
                {
                  left: shape.x * scale,
                  top: shape.y * scale,
                  width: shape.d * scale,
                  height: shape.d * scale,
                  borderRadius: (shape.d / 2) * scale,
                  borderWidth: (shape.thickness ?? 2) * scale,
                  borderColor: color,
                  borderTopColor: open.includes('top') ? 'transparent' : color,
                  borderRightColor: open.includes('right') ? 'transparent' : color,
                  borderBottomColor: open.includes('bottom') ? 'transparent' : color,
                  borderLeftColor: open.includes('left') ? 'transparent' : color,
                  transform: shape.rotate ? [{ rotate: `${shape.rotate}deg` }] : undefined,
                },
              ]}
            />
          );
        }

        return (
          <View
            key={key}
            style={[
              styles.shape,
              {
                left: shape.x * scale,
                top: shape.y * scale,
                width: shape.w * scale,
                height: shape.h * scale,
                borderRadius: (shape.r ?? 0) * scale,
                backgroundColor: shape.cut ? cutColor : color,
                transform: shape.rotate ? [{ rotate: `${shape.rotate}deg` }] : undefined,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shape: {
    position: 'absolute',
  },
});
