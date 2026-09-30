import type { HighlightTone } from '../../../lib/printcheck/evaluate';

/*
 * Printability heatmap colours (pure). Source: the per-triangle TRI_FLAG bits
 * of the check (same triangle order as the viewer geometry). Triangles not
 * hit by the active finding are neutral grey, not material colour, so the
 * finding dominates. Critical triangles also get a pattern flag: the shader
 * draws diagonal hatching there, so the class is readable without colour.
 */

export type Rgb = readonly [number, number, number];

export interface HeatmapPalette {
  neutral: Rgb;
  tones: Readonly<Record<HighlightTone, Rgb>>;
}

/** Colour-vision-safe order blue → yellow → orange → red; critical = red + hatch. */
export const HEATMAP_PALETTES: Readonly<Record<'light' | 'dark', HeatmapPalette>> = {
  light: { neutral: [178, 184, 191], tones: { hint: [230, 159, 0], critical: [200, 40, 40] } },
  dark: { neutral: [110, 117, 125], tones: { hint: [240, 180, 40], critical: [240, 90, 90] } },
};

export interface HeatLayer {
  mask: number;
  tone: HighlightTone;
}

export interface HeatmapBuffers {
  /** RGB per vertex (9 bytes per triangle), normalised Uint8. */
  colors: Uint8Array;
  /** 1 per vertex of a critical triangle, else 0. */
  pattern: Uint8Array;
  /** Triangles per tone, for the legend. */
  counts: Record<HighlightTone, number>;
}

/**
 * Fills (or allocates) the colour and pattern buffers. The first layer whose
 * mask intersects a triangle's flags decides its tone.
 */
export function fillHeatmap(
  flags: Uint16Array,
  layers: readonly HeatLayer[],
  palette: HeatmapPalette,
  target?: { colors: Uint8Array; pattern: Uint8Array },
): HeatmapBuffers {
  const triangles = flags.length;
  const colors = target && target.colors.length === triangles * 9 ? target.colors : new Uint8Array(triangles * 9);
  const pattern = target && target.pattern.length === triangles * 3 ? target.pattern : new Uint8Array(triangles * 3);
  const counts: Record<HighlightTone, number> = { critical: 0, hint: 0 };
  for (let t = 0; t < triangles; t += 1) {
    let rgb: Rgb = palette.neutral;
    let critical = 0;
    const f = flags[t];
    if (f !== 0) {
      for (const layer of layers) {
        if (f & layer.mask) {
          rgb = palette.tones[layer.tone];
          counts[layer.tone] += 1;
          critical = layer.tone === 'critical' ? 1 : 0;
          break;
        }
      }
    }
    const o = t * 9;
    for (let v = 0; v < 3; v += 1) {
      colors[o + v * 3] = rgb[0];
      colors[o + v * 3 + 1] = rgb[1];
      colors[o + v * 3 + 2] = rgb[2];
      pattern[t * 3 + v] = critical;
    }
  }
  return { colors, pattern, counts };
}
