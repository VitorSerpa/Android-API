import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { MenteColors, MenteRadius } from '@/constants/mente-theme';

type Leaf = {
  /** Bounding box of the rotated ellipse, as laid out in Figma. */
  left: number;
  top: number;
  boxWidth: number;
  boxHeight: number;
  rotate: number;
  /** Size of the ellipse before rotation. */
  width: number;
  height: number;
  color: string;
  opacity: number;
};

type Pebble = {
  left: number;
  top: number;
  size: number;
  color: string;
  opacity: number;
};

const LEAVES: Leaf[] = [
  { left: 10.33, top: 20, boxWidth: 81.02, boxHeight: 107.99, rotate: 18, width: 54, height: 96, color: '#9CBFA4', opacity: 0.75 },
  { left: 96, top: -1.56, boxWidth: 62.88, boxHeight: 93.69, rotate: -12, width: 46, height: 86, color: '#B7CFA9', opacity: 0.8 },
  { left: 109.67, top: 34, boxWidth: 94.26, boxHeight: 108.99, rotate: 26, width: 60, height: 92, color: '#8FB59C', opacity: 0.65 },
  { left: 206, top: -1.05, boxWidth: 68.71, boxHeight: 90.22, rotate: -20, width: 44, height: 80, color: '#C2D3B3', opacity: 0.8 },
  { left: 231.7, top: 48, boxWidth: 75.03, boxHeight: 98.14, rotate: 12, width: 58, height: 88, color: '#9CBFA4', opacity: 0.6 },
  { left: 80, top: 69.63, boxWidth: 70.07, boxHeight: 77.08, rotate: -34, width: 40, height: 66, color: '#D8C8A8', opacity: 0.7 },
  { left: 149, top: 102, boxWidth: 63.91, boxHeight: 72.69, rotate: 30, width: 38, height: 62, color: '#E0CBB4', opacity: 0.75 },
];

const PEBBLES: Pebble[] = [
  { left: 62, top: 112, size: 16, color: '#C98C7A', opacity: 0.65 },
  { left: 138, top: 124, size: 12, color: '#C98C7A', opacity: 0.65 },
  { left: 214, top: 118, size: 15, color: '#C98C7A', opacity: 0.65 },
  { left: 268, top: 100, size: 11, color: '#C98C7A', opacity: 0.65 },
];

/** Percentage radii give a true ellipse; a numeric radius would clamp to a stadium. */
const ELLIPSE = '50%' as const;

/**
 * The decorative header illustration from the Figma prototype, drawn with plain
 * views instead of the exported SVGs — every shape is a flat-filled ellipse.
 */
export function BotanicalHero() {
  return (
    <LinearGradient
      colors={MenteColors.heroGradient}
      locations={[0, 0.769]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      {LEAVES.map((leaf, index) => (
        <View
          key={`leaf-${index}`}
          style={[
            styles.leafBox,
            { left: leaf.left, top: leaf.top, width: leaf.boxWidth, height: leaf.boxHeight },
          ]}>
          <View
            style={{
              width: leaf.width,
              height: leaf.height,
              borderRadius: ELLIPSE,
              backgroundColor: leaf.color,
              opacity: leaf.opacity,
              transform: [{ rotate: `${leaf.rotate}deg` }],
            }}
          />
        </View>
      ))}

      {PEBBLES.map((pebble, index) => (
        <View
          key={`pebble-${index}`}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: pebble.left,
            top: pebble.top,
            width: pebble.size,
            height: pebble.size,
            borderRadius: ELLIPSE,
            backgroundColor: pebble.color,
            opacity: pebble.opacity,
          }}
        />
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 168,
    width: '100%',
    borderRadius: MenteRadius.hero,
    overflow: 'hidden',
  },
  leafBox: {
    position: 'absolute',
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
