import { describe, expect, it } from 'vitest';
import {
  VIEW_PRESETS,
  boxRadius,
  directionFromAngles,
  orthographicHalfHeight,
  perspectiveFrameDistance,
  plateSizeFor,
  upForDirection,
} from '../src/components/quote/viewer/camera';
import { formatDimension, oversizeAxes } from '../src/components/quote/viewer/dimensions';
import { HEATMAP_PALETTES, fillHeatmap } from '../src/components/quote/viewer/heatmap';
import { MATERIAL_LOOKS, POLYMER_LOOK, lookForPolymer } from '../src/components/quote/viewer/materialLook';
import { creasedNormals } from '../src/components/quote/viewer/normals';
import { formatHours, layerCountFor, layerState, volumeShareBelow } from '../src/components/quote/viewer/tools/layers';
import {
  chainCollinear,
  describeMeasurement,
  measureBetween,
  pointSegmentDistance,
  snapToVertex,
} from '../src/components/quote/viewer/tools/measure';
import { clampOffset, keeps, sectionPlane, sectionRange } from '../src/components/quote/viewer/tools/section';
import { TRI_FLAG } from '../src/lib/printcheck/flags';
import { POLYMER_PRICE_GROUP } from '../src/lib/quote/materials';
import { MATERIAL_TRAITS } from '../src/lib/printcheck/standards';

describe('camera framing', () => {
  it('fills the requested share of the view height', () => {
    const radius = 50;
    const distance = perspectiveFrameDistance(radius, 40, 16 / 9, 0.7);
    // angular radius of the sphere seen from the camera
    const angular = Math.asin(radius / distance);
    expect(Math.tan(angular) / Math.tan((20 * Math.PI) / 180)).toBeCloseTo(0.7, 9);
  });

  it('uses the width when the stage is portrait', () => {
    const landscape = perspectiveFrameDistance(50, 40, 1.5);
    const portrait = perspectiveFrameDistance(50, 40, 0.5);
    expect(portrait).toBeGreaterThan(landscape);
    expect(orthographicHalfHeight(50, 0.5)).toBeCloseTo((50 / 0.7) * 2, 9);
    expect(orthographicHalfHeight(50, 2)).toBeCloseTo(50 / 0.7, 9);
  });

  it('rejects degenerate input', () => {
    expect(() => perspectiveFrameDistance(0, 40, 1)).toThrow(RangeError);
    expect(() => perspectiveFrameDistance(10, 180, 1)).toThrow(RangeError);
    expect(() => orthographicHalfHeight(10, 0)).toThrow(RangeError);
  });

  it('defines front, right and top views in CAD convention (Z up)', () => {
    const byId = Object.fromEntries(VIEW_PRESETS.map((preset) => [preset.id, directionFromAngles(preset.azimuthDeg, preset.elevationDeg)]));
    expect(byId.front.map((v) => Math.round(v) + 0)).toEqual([0, -1, 0]);
    expect(byId.right.map((v) => Math.round(v) + 0)).toEqual([1, 0, 0]);
    expect(byId.top.map((v) => Math.round(v) + 0)).toEqual([0, 0, 1]);
    expect(upForDirection(byId.top)).toEqual([0, 1, 0]);
    expect(upForDirection(byId.iso)).toEqual([0, 0, 1]);
    // iso looks at the front and the right side from above
    expect(byId.iso[0]).toBeGreaterThan(0);
    expect(byId.iso[1]).toBeLessThan(0);
    expect(byId.iso[2]).toBeGreaterThan(0);
  });

  it('sizes the plate to the footprint + 40 % on the 10 mm grid', () => {
    expect(plateSizeFor([150, 86.7])).toBe(210);
    expect(plateSizeFor([10, 10])).toBe(50);
    expect(boxRadius([150, 86.7, 26])).toBeCloseTo(Math.hypot(150, 86.7, 26) / 2, 9);
  });
});

describe('dimension callouts', () => {
  it('marks the axes that do not fit, independent of orientation', () => {
    expect(oversizeAxes([150, 86.7, 26], [350, 350, 300])).toEqual([false, false, false]);
    // 320 high fits lying down: only if another axis is > 300 the smallest machine axis limits
    expect(oversizeAxes([100, 100, 320], [350, 350, 300])).toEqual([false, false, false]);
    expect(oversizeAxes([400, 100, 100], [350, 350, 300])).toEqual([true, false, false]);
    expect(oversizeAxes([340, 340, 340], [350, 350, 300])).toEqual([false, false, true]);
    expect(formatDimension(86.66)).toBe('86,7');
  });
});

describe('material looks', () => {
  it('has an explicit look for every priced polymer and every process trait', () => {
    for (const polymer of Object.keys(POLYMER_PRICE_GROUP)) expect(POLYMER_LOOK[polymer]).toBeDefined();
    for (const polymer of Object.keys(MATERIAL_TRAITS)) expect(POLYMER_LOOK[polymer]).toBeDefined();
    expect(lookForPolymer('PA6-CF').fibreNoise).toBe(true);
    expect(lookForPolymer('Unobtainium').key).toBe('unknown');
    expect(lookForPolymer(null).key).toBe('unknown');
  });

  it('follows the roughness/clearcoat table of the spec', () => {
    expect([MATERIAL_LOOKS.pla.roughness, MATERIAL_LOOKS.pla.clearcoat]).toEqual([0.45, 0.1]);
    expect([MATERIAL_LOOKS.petg.roughness, MATERIAL_LOOKS.petg.clearcoat]).toEqual([0.28, 0.35]);
    expect([MATERIAL_LOOKS.abs.roughness, MATERIAL_LOOKS.asa.roughness]).toEqual([0.62, 0.58]);
    expect([MATERIAL_LOOKS.pc.roughness, MATERIAL_LOOKS.pa.roughness, MATERIAL_LOOKS.cf.roughness]).toEqual([0.3, 0.7, 0.85]);
  });
});

describe('measure tool', () => {
  it('snaps to the nearest corner within 8 px, otherwise not', () => {
    const candidates = [
      { world: [0, 0, 0] as [number, number, number], screen: [100, 100] as [number, number] },
      { world: [10, 0, 0] as [number, number, number], screen: [106, 100] as [number, number] },
    ];
    expect(snapToVertex([104, 100], candidates)?.world).toEqual([10, 0, 0]);
    expect(snapToVertex([100, 109], candidates)).toBeNull();
  });

  it('computes distance and axis deltas and describes them in German to 0.01 mm', () => {
    const m = measureBetween([0, 0, 0], [150, 86.7, -26]);
    expect(m.distance).toBeCloseTo(Math.hypot(150, 86.7, 26), 9);
    expect(describeMeasurement(m)).toBe('Abstand 175,19 mm · ΔX 150,00 · ΔY 86,70 · ΔZ 26,00 mm');
    expect(describeMeasurement(measureBetween([0, 0, 0], [0, 0, 5], 'edge'))).toContain('Kante 5,00 mm');
  });

  it('measures point-to-segment distance on screen', () => {
    expect(pointSegmentDistance([5, 3], [0, 0], [10, 0])).toBeCloseTo(3, 12);
    expect(pointSegmentDistance([-4, 3], [0, 0], [10, 0])).toBeCloseTo(5, 12);
  });

  it('chains collinear segments of a split straight edge, stops at corners', () => {
    // straight edge 0..30 on X in three segments, then a corner up in Z
    const segments = [0, 0, 0, 10, 0, 0, 10, 0, 0, 20, 0, 0, 20, 0, 0, 30, 0, 0, 30, 0, 0, 30, 0, 15];
    const chain = chainCollinear(segments, 1);
    const xs = [chain.a[0], chain.b[0]].sort((a, b) => a - b);
    expect(xs).toEqual([0, 30]);
    expect(chain.segmentCount).toBe(3);
    const corner = chainCollinear(segments, 3);
    expect(corner.segmentCount).toBe(1);
    expect(() => chainCollinear(segments, 9)).toThrow(RangeError);
  });
});

describe('section tool', () => {
  it('cuts away the positive side by default and the other side when flipped', () => {
    const plane = sectionPlane('x', 10, false);
    expect(keeps(plane, [5, 0, 0])).toBe(true);
    expect(keeps(plane, [15, 0, 0])).toBe(false);
    const flipped = sectionPlane('z', 10, true);
    expect(keeps(flipped, [0, 0, 15])).toBe(true);
    expect(keeps(flipped, [0, 0, 5])).toBe(false);
    expect(() => sectionPlane('y', Number.NaN, false)).toThrow(RangeError);
  });

  it('clamps offsets to the part extent on a 0.1 mm grid', () => {
    const range = sectionRange([-75.04, 0, 0], [75.04, 86.7, 26], 'x');
    expect(range).toEqual({ min: -75.1, max: 75.1, step: 0.1 });
    expect(clampOffset(100, range)).toBeCloseTo(75.1, 9);
    expect(clampOffset(12.34, range)).toBeCloseTo(12.3, 9);
    expect(clampOffset(Number.NaN, range)).toBe(0);
  });
});

describe('layer tool', () => {
  it('counts layers and computes the volume share from the area profile', () => {
    expect(layerCountFor(26, 0.2)).toBe(130);
    expect(layerCountFor(0.1, 0.2)).toBe(1);
    // a "step pyramid": 2 mm high, big bottom half, small top half
    const profile = { stepMm: 1, areas: [300, 100] };
    expect(volumeShareBelow(profile, 1)).toBeCloseTo(0.75, 12);
    expect(volumeShareBelow(profile, 1.5)).toBeCloseTo(0.875, 12);
    const state = layerState(5, 2, 0.2, profile, { totalHours: 1.2, fixedHours: 0.2 });
    expect(state).toMatchObject({ layer: 5, layerCount: 10, heightMm: 1 });
    expect(state.volumeShare).toBeCloseTo(0.75, 12);
    expect(state.hoursSoFar).toBeCloseTo(0.2 + 0.75 * 1, 12);
    expect(layerState(10, 2, 0.2, profile, null).volumeShare).toBe(1);
    expect(layerState(99, 2, 0.2, null, null)).toMatchObject({ layer: 10, volumeShare: null, hoursSoFar: null });
    expect(formatHours(1.2345)).toBe('1:14 h');
  });
});

describe('heatmap', () => {
  it('colours flagged triangles by the first matching layer and hatches critical ones', () => {
    const flags = new Uint16Array([0, TRI_FLAG.THIN_WALL, TRI_FLAG.THIN_CRITICAL | TRI_FLAG.THIN_WALL, TRI_FLAG.OPEN_EDGE]);
    const layers = [
      { mask: TRI_FLAG.THIN_CRITICAL, tone: 'critical' as const },
      { mask: TRI_FLAG.THIN_WALL, tone: 'hint' as const },
    ];
    const palette = HEATMAP_PALETTES.light;
    const { colors, pattern, counts } = fillHeatmap(flags, layers, palette);
    expect(Array.from(colors.slice(0, 3))).toEqual([...palette.neutral]);
    expect(Array.from(colors.slice(9, 12))).toEqual([...palette.tones.hint]);
    expect(Array.from(colors.slice(18, 21))).toEqual([...palette.tones.critical]);
    expect(Array.from(colors.slice(27, 30))).toEqual([...palette.neutral]);
    expect(Array.from(pattern)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0]);
    expect(counts).toEqual({ critical: 1, hint: 1 });
  });

  it('reuses target buffers of the right size', () => {
    const flags = new Uint16Array(2);
    const target = { colors: new Uint8Array(18), pattern: new Uint8Array(6) };
    const result = fillHeatmap(flags, [], HEATMAP_PALETTES.dark, target);
    expect(result.colors).toBe(target.colors);
    expect(result.pattern).toBe(target.pattern);
  });
});

describe('creased normals', () => {
  // two triangles of a flat quad plus one folded at 90°
  const quadAndFold = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0,
    0, 0, 0, 1, 1, 0, 0, 1, 0,
    1, 0, 0, 1, 0, 1, 1, 1, 0,
  ]);

  it('smooths coplanar neighbours and keeps the 90° fold sharp', () => {
    const normals = creasedNormals(quadAndFold, 30);
    for (let c = 0; c < 6; c += 1) {
      expect([normals[c * 3], normals[c * 3 + 1], normals[c * 3 + 2]].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 1]);
    }
    for (let c = 6; c < 9; c += 1) {
      expect(Math.abs(normals[c * 3])).toBeCloseTo(1, 6);
    }
  });

  it('averages across a shallow edge', () => {
    // fold of 20° < 30°: shared vertices get a blended normal
    const a = (20 * Math.PI) / 180;
    const soup = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1 + Math.cos(a), 0, Math.sin(a), 1, 1, 0]);
    const normals = creasedNormals(soup, 30);
    // corner 1 (shared vertex at x = 1) of the first triangle leans towards the second face
    expect(normals[3]).toBeLessThan(0);
    expect(normals[5]).toBeGreaterThan(0.9);
  });
});

describe('feature edges', () => {
  it('finds the 12 edges of a cube (split diagonals are not features)', async () => {
    const { buildAdjacency, featureEdgesFrom } = await import('../src/components/quote/viewer/normals');
    // unit cube, 12 triangles
    const v = [
      [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
    ];
    const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const soup: number[] = [];
    for (const [a, b, c, d] of quads) soup.push(...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d]);
    const positions = new Float32Array(soup);
    const edges = featureEdgesFrom(positions, buildAdjacency(positions));
    expect(edges.segments.length / 6).toBe(12);
    // every triangle has exactly two feature edges (its diagonal is not one)
    for (let t = 0; t < 12; t += 1) {
      const marked = [0, 1, 2].filter((k) => edges.edgeSegment[t * 3 + k] >= 0).length;
      expect(marked).toBe(2);
    }
  });

  it('reports open edges as features', async () => {
    const { buildAdjacency, featureEdgesFrom } = await import('../src/components/quote/viewer/normals');
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]);
    const edges = featureEdgesFrom(positions, buildAdjacency(positions));
    expect(edges.segments.length / 6).toBe(4);
  });
});
