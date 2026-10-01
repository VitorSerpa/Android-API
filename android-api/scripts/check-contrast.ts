/**
 * Verifies WCAG contrast (≥ 4.5:1) for every text/background pair of every
 * palette in light and dark mode. Run with `npm run check:contrast`.
 */
import { PALETTES, TEXT_PAIRS, type ColorTokens } from '../src/theme/palettes.ts';

const MIN = 4.5;

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

let failures = 0;

for (const [paletteId, schemes] of Object.entries(PALETTES)) {
  for (const [scheme, tokens] of Object.entries(schemes) as [string, ColorTokens][]) {
    const pairs: [string, string, string][] = TEXT_PAIRS.map(([fg, bg]) => [
      `${fg} / ${bg}`,
      tokens[fg] as string,
      tokens[bg] as string,
    ]);
    tokens.moodScale.forEach((fill, index) =>
      pairs.push([`onMoodScale / moodScale[${index}]`, tokens.onMoodScale, fill]),
    );
    tokens.calmGradient.forEach((fill, index) => {
      pairs.push([`text / calmGradient[${index}]`, tokens.text, fill]);
      pairs.push([`textMuted / calmGradient[${index}]`, tokens.textMuted, fill]);
      pairs.push([`accent / calmGradient[${index}]`, tokens.accent, fill]);
    });

    for (const [label, fg, bg] of pairs) {
      const ratio = contrast(fg, bg);
      if (ratio < MIN) {
        failures += 1;
        console.log(`✗ ${paletteId}/${scheme}  ${label}  ${ratio.toFixed(2)}:1`);
      }
    }
    const worst = Math.min(...pairs.map(([, fg, bg]) => contrast(fg, bg)));
    console.log(`${paletteId}/${scheme}: ${pairs.length} pares, menor contraste ${worst.toFixed(2)}:1`);
  }
}

if (failures) {
  console.error(`\n${failures} par(es) abaixo de ${MIN}:1`);
  process.exit(1);
}
console.log(`\nTodos os pares têm contraste ≥ ${MIN}:1`);
