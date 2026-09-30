import { describe, expect, it } from 'vitest';
import { MATERIAL_CATALOG } from '../src/lib/quote/materials';
import { evaluatePrintCheck, type Finding, type PrintCheckMaterial } from '../src/lib/printcheck/evaluate';
import { TRI_FLAG } from '../src/lib/printcheck/flags';
import { toPrintCheckMaterial } from '../src/lib/printcheck/material';
import { bounds, massProperties, topology, weld } from '../src/lib/printcheck/mesh';
import { runPrintCheck, type PipelineResult } from '../src/lib/printcheck/pipeline';
import { POSES, poseMatrix } from '../src/lib/printcheck/pose';
import { MATERIAL_TRAITS, achievableIsoClass, isoTolerance } from '../src/lib/printcheck/standards';
import { buildPrintCheckSummary, MAX_PRINTCHECK_SUMMARY_CHARS } from '../src/lib/printcheck/summary';
import { DEFAULT_PRINTCHECK_LIMITS, type PrintCheckOptions } from '../src/lib/printcheck/types';
import {
  barWithHole,
  box,
  boxPositions,
  boxUnion,
  concat,
  extrudeXZ,
  flipTriangles,
} from './helpers/printcheckMeshes';

/*
 * Printability check on synthetic parts with known answers. Expected values
 * are derived by hand in the comments; voxel-based values carry the raster
 * error of one voxel (0.1 mm for parts up to ~25 mm).
 */

// Smaller cell budget than production: same algorithms, a third of the memory and time per case.
const OPTIONS: PrintCheckOptions = { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS, voxelMaxCells: 6_000_000 };
const CALLBACKS = { onProgress: () => undefined, onPartial: () => undefined };

const PLA: PrintCheckMaterial = {
  id: 'pla',
  name: 'PLA',
  polymer: 'PLA',
  densityGPerCm3: 1.24,
  familySlug: 'pla',
  familyName: 'PLA',
};
const material = (polymer: string, familySlug: string | null = null): PrintCheckMaterial => ({
  ...PLA,
  id: polymer.toLowerCase(),
  name: polymer,
  polymer,
  familySlug,
  familyName: familySlug ? polymer : null,
});

const run = (positions: Float32Array, options: PrintCheckOptions = OPTIONS): PipelineResult =>
  runPrintCheck(positions, options, CALLBACKS);

function finding(findings: readonly Finding[], id: string): Finding {
  const found = findings.find((entry) => entry.id === id);
  if (!found) throw new Error(`finding ${id} missing`);
  return found;
}

/** Triangles whose centroid satisfies the predicate. */
function trianglesWhere(positions: Float32Array, predicate: (x: number, y: number, z: number) => boolean): number[] {
  const out: number[] = [];
  for (let t = 0; t < positions.length / 9; t += 1) {
    const i = t * 9;
    const x = (positions[i] + positions[i + 3] + positions[i + 6]) / 3;
    const y = (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3;
    const z = (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3;
    if (predicate(x, y, z)) out.push(t);
  }
  return out;
}

describe('mesh topology', () => {
  it('reports a closed cube as watertight, consistent, one shell, no sharp inner edges', () => {
    const pos = boxPositions(20, 20, 20);
    const box3 = bounds(pos);
    const flags = new Uint16Array(12);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, flags, { splinterVolumeMm3: 1, sharpInnerEdgeDeg: 60 });
    expect(topo).toMatchObject({
      triangles: 12,
      vertices: 8,
      boundaryEdges: 0,
      nonManifoldEdges: 0,
      manifoldEdges: 18,
      flippedTriangles: 0,
      shells: 1,
      sharpInnerEdges: 0,
      watertight: true,
    });
    expect(massProperties(pos, box3).volume).toBeCloseTo(8000, 6);
    expect(massProperties(pos, box3).centroid).toEqual([10, 10, 10]);
    expect(Array.from(flags).every((f) => f === 0)).toBe(true);
  });

  it('finds the four open edges of a box with a missing face and flags their triangles', () => {
    const pos = boxPositions(10, 10, 10).slice(0, 10 * 9); // left face (triangles 10, 11) removed
    const box3 = bounds(pos);
    const flags = new Uint16Array(10);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, flags, { splinterVolumeMm3: 1, sharpInnerEdgeDeg: 60 });
    expect(topo.boundaryEdges).toBe(4);
    expect(topo.watertight).toBe(false);
    expect(Array.from(flags).filter((f) => f & TRI_FLAG.OPEN_EDGE).length).toBeGreaterThanOrEqual(4);
  });

  it('names exactly the flipped triangles instead of only counting contradicting edges', () => {
    const pos = flipTriangles(boxPositions(10, 10, 10), 2, 4); // top face flipped
    const box3 = bounds(pos);
    const flags = new Uint16Array(12);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, flags, { splinterVolumeMm3: 1, sharpInnerEdgeDeg: 60 });
    expect(topo.flippedTriangles).toBe(2);
    expect(topo.inconsistentEdges).toBe(4);
    expect(Array.from(flags).map((f, t) => (f & TRI_FLAG.FLIPPED ? t : -1)).filter((t) => t >= 0)).toEqual([2, 3]);
  });

  it('reports a fully inside-out box as inverted', () => {
    const pos = flipTriangles(boxPositions(10, 10, 10), 0, 12);
    const box3 = bounds(pos);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, new Uint16Array(12), { splinterVolumeMm3: 1, sharpInnerEdgeDeg: 60 });
    expect(topo.invertedComponents).toBe(1);
    expect(topo.flippedTriangles).toBe(12);
  });

  it('accepts an inward-facing cavity shell nested in a solid (hollow part) as correctly oriented', () => {
    const outer = boxPositions(20, 20, 20);
    const cavity = flipTriangles(boxPositions(10, 10, 10, 5, 5, 5), 0, 12);
    const pos = concat(outer, cavity);
    const box3 = bounds(pos);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, new Uint16Array(24), { splinterVolumeMm3: 1, sharpInnerEdgeDeg: 60 });
    expect(topo.shells).toBe(2);
    expect(topo.flippedTriangles).toBe(0);
    expect(topo.invertedComponents).toBe(0);
  });

  it('finds the two 20 mm inner corners of a T profile as sharp inner edges', () => {
    const pos = boxUnion([box([15, 0, 0], [25, 20, 20]), box([0, 0, 20], [40, 20, 25])]);
    const box3 = bounds(pos);
    const topo = topology(pos, weld(pos, box3, 1e-5), box3, new Uint16Array(pos.length / 9), {
      splinterVolumeMm3: 1,
      sharpInnerEdgeDeg: 60,
    });
    expect(topo.sharpInnerEdges).toBe(2);
    expect(topo.sharpInnerEdgeLengthMm).toBeCloseTo(40, 3);
  });
});

describe('pose permutations', () => {
  it('are proper rotations (determinant +1) with the expected resting side', () => {
    for (const pose of POSES) {
      const m = poseMatrix(pose);
      const det =
        m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
      expect(det).toBe(1);
    }
    expect(POSES.map((pose) => pose.downSide)).toEqual(['−Z', '+Z', '−Y', '+Y', '+X', '−X']);
  });
});

describe('printability pipeline on synthetic parts', () => {
  it('solid 20 mm cube: no thin wall, no overhang, fits, direct verdict (FDM-INSPECT reference)', () => {
    const { geometry: g } = run(boxPositions(20, 20, 20));
    expect(Object.values(g.stages).every((stage) => stage.state === 'done')).toBe(true);
    // medial axis: one centre, 20 mm - the naive "2 x distance" method reports ~10 % thin wall here
    expect(g.walls?.shareBelowRecommended).toBe(0);
    expect(g.walls?.min).toBeCloseTo(20, 1);
    expect(g.gaps?.features).toHaveLength(0);
    // plate faces are not overhangs: FDM-INSPECT's "16.7 % critical" pitfall
    expect(g.orientation?.poses[0].criticalShare).toBe(0);
    expect(g.orientation?.recommendedId).toBe(0);
    expect(g.fit?.fitsAsLoaded).toBe(true);
    expect(g.support?.grossVolume).toBe(0);
    expect(g.voxel?.leakyRowShare).toBe(0);
    expect(Math.abs(g.voxel!.voxelVolume - 8000)).toBeLessThan(8000 * 0.005);
    // Raster quantisation, not a section error: the layer counts cell centres, so
    // a 20 mm edge becomes floor(20 / h) cells; the area error is bounded by
    // perimeter x h / 2 = 40 h (h = 0.1123 mm here -> 178 cells, 399.33 mm²).
    expect(Math.abs(g.layers!.firstLayerArea - 400)).toBeLessThanOrEqual(40 * g.voxel!.h);
    const report = evaluatePrintCheck(g, PLA);
    expect(report.verdict.level).toBe('direct');
    expect(report.counts.critical).toBe(0);
    expect(finding(report.findings, 'walls.thickness').status).toBe('ok');
  });

  it('0.6 mm plate: every wall below 0.8 mm -> hint, printable with adjustments', () => {
    const { geometry: g } = run(boxPositions(40, 40, 0.6));
    expect(g.walls?.min).toBeCloseTo(0.6, 5);
    expect(g.walls?.shareBelowRecommended).toBeCloseTo(100, 5);
    expect(g.walls?.shareBelowCritical).toBe(0);
    const report = evaluatePrintCheck(g, PLA);
    const walls = finding(report.findings, 'walls.thickness');
    expect(walls).toMatchObject({ status: 'hint', impact: 'adjust', highlight: 'thin' });
    expect(report.verdict.level).toBe('adjust');
  });

  it('0.3 mm plate (odd voxel span): measured 0.3 mm, not 0.4 mm', () => {
    const { geometry: g } = run(boxPositions(30, 30, 0.3));
    expect(g.walls?.min).toBeCloseTo(0.3, 5);
    expect(g.walls?.shareBelowCritical).toBeCloseTo(100, 5);
  });

  it('0.2 mm foil: below one extrusion width everywhere -> not suitable for FDM, all triangles flagged', () => {
    const pos = boxPositions(40, 40, 0.2);
    const { geometry: g, flags } = run(pos);
    expect(g.walls?.shareBelowCritical).toBeCloseTo(100, 5);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'walls.thickness')).toMatchObject({ status: 'critical', impact: 'unsuitable' });
    expect(report.verdict.level).toBe('unsuitable');
    expect(Array.from(flags).every((f) => (f & TRI_FLAG.THIN_CRITICAL) !== 0)).toBe(true);
  });

  it('overhang wedge: 37.6 % critical as loaded, 0 % flipped; flipped pose recommended', () => {
    // bottom 10 mm, top 40 mm wide, 5 mm high, 20 mm deep: flanks at atan(15/5) = 71.6° from vertical.
    // judged surface = 1882.5 - 200 (plate) mm², flanks 2 x 316.2 mm² -> 37.59 %
    const pos = extrudeXZ([[15, 0], [25, 0], [40, 5], [0, 5]], 20);
    const { geometry: g, flags } = run(pos);
    const loaded = g.orientation!.poses[0];
    expect(loaded.criticalShare).toBeCloseTo(37.59, 1);
    expect(loaded.worstAngle).toBeCloseTo(71.57, 1);
    expect(g.orientation!.recommendedId).toBe(1);
    expect(g.orientation!.poses[1].criticalShare).toBe(0);
    // overhang flags belong to the recommended pose: none
    expect(Array.from(flags).some((f) => f & TRI_FLAG.OVERHANG_CRITICAL)).toBe(false);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'overhang.support').status).toBe('ok');
    expect(report.recommendedPose?.reasons.join(' ')).toContain('geringster Stützbedarf');
  });

  it('T profile: 18.75 % cap overhang as loaded, flipped pose needs no support', () => {
    const pos = boxUnion([box([15, 0, 0], [25, 20, 20]), box([0, 0, 20], [40, 20, 25])]);
    const { geometry: g } = run(pos);
    // flipped (cap on the plate) removes the 15 mm cap overhangs on both sides
    expect(g.orientation!.poses[0].criticalShare).toBeCloseTo(18.75, 1);
    expect(g.orientation!.recommendedId).toBe(1);
    expect(g.support!.grossVolume).toBe(0);
  });

  it('open mesh: critical, volume checks not run and reported as "nicht geprüft"', () => {
    const { geometry: g } = run(boxPositions(10, 10, 10).slice(0, 10 * 9));
    expect(g.stages.walls.state).toBe('skipped');
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'mesh.closed')).toMatchObject({ status: 'critical', highlight: 'open' });
    expect(finding(report.findings, 'walls.thickness').status).toBe('not-checked');
    expect(report.verdict.level).toBe('adjust');
    expect(report.verdict.text).toContain('Nicht geprüft werden konnten');
  });

  it('0.2 mm pin on a plate: pin found as a too fine feature and highlighted', () => {
    const pos = boxUnion([box([0, 0, 0], [20, 20, 3]), box([10, 10, 3], [10.2, 10.2, 9])]);
    const { geometry: g, flags } = run(pos);
    expect(g.slender!.featureDiameter).toBeCloseTo(0.226, 2);
    expect(g.slender!.featureHeight).toBeCloseTo(6, 1);
    expect(g.walls!.pointsBelowCritical).toBeGreaterThan(100);
    const pinSides = trianglesWhere(pos, (x, y, z) => x >= 9.99 && x <= 10.21 && y >= 9.99 && y <= 10.21 && z > 4);
    expect(pinSides.length).toBeGreaterThan(0);
    expect(pinSides.every((t) => (flags[t] & TRI_FLAG.THIN_CRITICAL) !== 0)).toBe(true);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'features.fine')).toMatchObject({ status: 'critical', impact: 'redesign' });
    expect(report.verdict.level).toBe('redesign');
    expect(report.showRedesignCta).toBe(true);
  });

  it('400 x 400 x 5 plate exceeds the build volume in every pose: split into 2', () => {
    const { geometry: g } = run(boxPositions(400, 400, 5));
    expect(g.fit).toMatchObject({ fitsAsLoaded: false, fittingPoses: [], diagonalPoses: [], splitPieces: 2 });
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'size.buildVolume')).toMatchObject({ status: 'critical', impact: 'redesign' });
  });

  it('450 x 20 x 5 bar fits only diagonally (42°), recommendation stays within fitting poses', () => {
    const { geometry: g } = run(boxPositions(450, 20, 5));
    expect(g.fit!.fittingPoses).toEqual([]);
    expect(g.fit!.diagonalPoses).toEqual([0, 1, 2, 3]);
    expect(g.fit!.diagonalAngle).toBe(42);
    expect(g.fit!.diagonalPoses).toContain(g.orientation!.recommendedId);
    expect(finding(evaluatePrintCheck(g, PLA).findings, 'size.buildVolume').status).toBe('hint');
  });

  it('horizontal Ø8 hole in an 80 mm bar: found, horizontal, teardrop hint on the hole wall', () => {
    const pos = barWithHole(20, 4, 80, 0);
    const { geometry: g, flags } = run(pos);
    const hole = g.gaps!.features.find((feature) => feature.shape === 'hole');
    expect(hole).toBeDefined();
    expect(hole!.width).toBeGreaterThan(7.5);
    expect(hole!.width).toBeLessThan(8.3);
    expect(hole!.horizontal).toBe(true);
    const wall = trianglesWhere(pos, (x, y, z) => Math.hypot(y - 10, z - 10) < 4.1 && x > 20 && x < 60);
    expect(wall.length).toBeGreaterThan(0);
    expect(wall.some((t) => (flags[t] & TRI_FLAG.HORIZONTAL_HOLE) !== 0)).toBe(true);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'holes.horizontal')).toMatchObject({ status: 'hint', highlight: 'hole-horizontal' });
  });

  it('vertical Ø2 hole in a plate: small hole hint (drill/ream)', () => {
    const { geometry: g } = run(barWithHole(30, 1, 5, 2));
    const hole = g.gaps!.features.find((feature) => feature.shape === 'hole');
    expect(hole!.vertical).toBe(true);
    expect(hole!.width).toBeGreaterThan(1.7);
    expect(hole!.width).toBeLessThan(2.2);
    expect(finding(evaluatePrintCheck(g, PLA).findings, 'holes.small').status).toBe('hint');
  });

  it('0.3 mm slot between two blocks: gap grows shut -> critical', () => {
    // U-channel: two 10 mm walls joined at the bottom, 0.3 mm apart
    const pos = boxUnion([box([0, 0, 0], [20.3, 20, 3]), box([0, 0, 3], [10, 20, 10]), box([10.3, 0, 3], [20.3, 20, 10])]);
    const { geometry: g } = run(pos);
    expect(g.gaps!.narrowest).not.toBeNull();
    expect(g.gaps!.narrowest!).toBeLessThan(0.4);
    const gaps = finding(evaluatePrintCheck(g, PLA).findings, 'features.gaps');
    expect(gaps.status).toBe('critical');
  });

  it('two overlapping boxes: overlap volume found (nonzero winding), 2 shells', () => {
    // overlap region 10 x 20 x 20 = 4000 mm³
    const { geometry: g } = run(concat(boxPositions(20, 20, 20), boxPositions(20, 20, 20, 10, 0, 0)));
    expect(g.topology!.shells).toBe(2);
    expect(g.voxel!.fillMode).toBe('nonzero');
    expect(g.voxel!.overlapVolume).toBeGreaterThan(3800);
    expect(g.voxel!.overlapVolume).toBeLessThan(4200);
    expect(finding(evaluatePrintCheck(g, PLA).findings, 'mesh.overlap').status).toBe('hint');
  });

  it('hollow box with a closed cavity: one enclosed void of ~1000 mm³', () => {
    const pos = concat(boxPositions(20, 20, 20), flipTriangles(boxPositions(10, 10, 10, 5, 5, 5), 0, 12));
    const { geometry: g } = run(pos);
    expect(g.voids!.count).toBe(1);
    expect(g.voids!.volume).toBeGreaterThan(950);
    expect(g.voids!.volume).toBeLessThan(1050);
    expect(finding(evaluatePrintCheck(g, PLA).findings, 'stress.voids').status).toBe('hint');
  });

  it('flipped triangles fall back to even-odd rasterisation and skip the overlap check honestly', () => {
    const { geometry: g } = run(flipTriangles(boxPositions(10, 10, 10), 2, 4));
    expect(g.voxel!.fillMode).toBe('even-odd');
    expect(g.voxel!.voxelVolume).toBeCloseTo(1000, -1);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'mesh.orientation').status).toBe('hint');
    expect(finding(report.findings, 'mesh.overlap').status).toBe('not-checked');
  });

  it('1 mm cube: unit plausibility hint (cm or inch?)', () => {
    const { geometry: g } = run(boxPositions(1, 1, 1));
    const units = finding(evaluatePrintCheck(g, PLA).findings, 'mesh.units');
    expect(units.status).toBe('hint');
    expect(units.explanation).toContain('in Zoll 25,4 mm');
  });

  it('large coarse part: wall check says "nicht geprüft" instead of passing when the raster is too coarse', () => {
    const pos = boxPositions(300, 300, 280);
    const { geometry: g } = run(pos, { ...OPTIONS, voxelMaxCells: 2_000_000 });
    expect(g.voxel!.h).toBeGreaterThan(0.4);
    const report = evaluatePrintCheck(g, PLA);
    expect(finding(report.findings, 'walls.thickness').status).toBe('not-checked');
    expect(report.verdict.level).not.toBe('direct');
    expect(report.verdict.text).toContain('Nicht geprüft werden konnten: Wandstärke');
  });

  it('stages that did not run are "nicht geprüft", never OK', () => {
    const { geometry: g } = run(boxPositions(20, 20, 20), { ...OPTIONS, maxTopologyTriangles: 1 });
    expect(g.stages.mesh.state).toBe('skipped');
    const report = evaluatePrintCheck(g, PLA);
    for (const id of ['mesh.closed', 'mesh.manifold', 'mesh.orientation', 'mesh.shells', 'stress.sharpCorners']) {
      expect(finding(report.findings, id).status).toBe('not-checked');
    }
    expect(report.verdict.level).toBe('incomplete');
  });

  it('reports progress per stage and partial results in order', () => {
    const stages: string[] = [];
    let partials = 0;
    runPrintCheck(boxPositions(10, 10, 10), OPTIONS, {
      onProgress: (stage) => {
        if (stages[stages.length - 1] !== stage) stages.push(stage);
      },
      onPartial: () => {
        partials += 1;
      },
    });
    expect(stages).toEqual(['mesh', 'orientation', 'voxel', 'layers', 'walls', 'gaps', 'support', 'highlight']);
    expect(partials).toBeGreaterThanOrEqual(8);
  });
});

describe('material-dependent evaluation', () => {
  it('has process traits for every polymer the calculator offers', () => {
    const polymers = [...new Set(MATERIAL_CATALOG.map((entry) => entry.polymer))];
    expect(polymers.filter((polymer) => !MATERIAL_TRAITS[polymer])).toEqual([]);
  });

  it('maps calculator materials to their library family page', () => {
    const petg = MATERIAL_CATALOG.find((entry) => entry.id === 'group-petg');
    expect(petg).toBeDefined();
    expect(toPrintCheckMaterial(petg!)).toMatchObject({ polymer: 'PETG', familySlug: 'petg-pctg' });
  });

  it('warping: large ABS plate is critical even with a heated chamber and links to the family page', () => {
    const { geometry: g } = run(boxPositions(300, 300, 5), { ...OPTIONS, voxelMaxCells: 2_000_000 });
    // diagonal 424 mm, warp 4, chamber factor 0.4 -> index 6.8
    const warp = finding(evaluatePrintCheck(g, material('ABS', 'abs')).findings, 'stress.warping');
    expect(warp.status).toBe('critical');
    expect(warp.measured).toContain('Index 6,8');
    expect(warp.link?.href).toBe('/werkstoffe/abs/');
    const small = finding(evaluatePrintCheck(run(boxPositions(20, 20, 20)).geometry, material('ABS', 'abs')).findings, 'stress.warping');
    expect(small.status).toBe('ok');
  });

  it('TPU: thin walls become a material hint', () => {
    const { geometry: g } = run(boxPositions(40, 40, 0.9));
    const fit = finding(evaluatePrintCheck(g, material('TPU', 'tpu')).findings, 'material.fit');
    expect(fit.status).toBe('hint');
    expect(fit.explanation).toContain('1,20 mm');
    expect(finding(evaluatePrintCheck(g, PLA).findings, 'material.fit').status).toBe('ok');
  });

  it('unknown polymer: material-dependent checks are "nicht geprüft", not guessed', () => {
    const { geometry: g } = run(boxPositions(20, 20, 20));
    const report = evaluatePrintCheck(g, material('PEEK'));
    expect(finding(report.findings, 'material.fit').status).toBe('not-checked');
    expect(finding(report.findings, 'stress.warping').status).toBe('not-checked');
    expect(finding(report.findings, 'holes.tolerance').status).toBe('not-checked');
  });

  it('tolerances: ISO 2768-1 table lookup and FDM expectation per main dimension', () => {
    expect(isoTolerance(20, 'm')).toBe(0.2);
    expect(isoTolerance(200, 'c')).toBe(1.2);
    expect(isoTolerance(2, 'v')).toBeNull();
    // 0.1 + 100 * 0.003 / 3 = 0.2 -> class m (±0.3 for 30-120 mm)
    expect(achievableIsoClass(100, 0.2)).toBe('m');
    const { geometry: g } = run(boxPositions(100, 20, 10));
    const report = evaluatePrintCheck(g, PLA);
    expect(report.toleranceRows!.map((row) => Number(row.expectedDeviation.toFixed(3)))).toEqual([0.2, 0.12, 0.11]);
    expect(finding(report.findings, 'holes.tolerance').status).toBe('ok');
    const abs = evaluatePrintCheck(g, material('ABS', 'abs'));
    // 0.1 + 100 * 0.008 / 3 = 0.367 > 0.2
    expect(finding(abs.findings, 'holes.tolerance').status).toBe('hint');
  });
});

describe('lead summary', () => {
  it('is compact, names verdict and non-OK findings, and stays within the lead field cap', () => {
    const { geometry: g } = run(boxUnion([box([0, 0, 0], [20, 20, 3]), box([10, 10, 3], [10.2, 10.2, 9])]));
    const report = evaluatePrintCheck(g, PLA);
    const summary = buildPrintCheckSummary([
      { fileName: 'halter.stl', sha256: 'ab'.repeat(32), report, missingReason: null },
      { fileName: 'deckel.step', sha256: null, report: null, missingReason: 'Prüfung abgebrochen' },
    ]);
    expect(summary).toContain('halter.stl [SHA-256 abababababab]: Konstruktive Überarbeitung empfohlen (PLA)');
    expect(summary).toContain('Kritisch: Feine Details');
    expect(summary).toContain('deckel.step: Druckbarkeits-Check nicht verfügbar (Prüfung abgebrochen)');
    expect(summary.length).toBeLessThanOrEqual(MAX_PRINTCHECK_SUMMARY_CHARS);
    const many = buildPrintCheckSummary(
      Array.from({ length: 12 }, (_, i) => ({ fileName: `teil-${i}.stl`, sha256: null, report, missingReason: null })),
    );
    expect(many.length).toBeLessThanOrEqual(MAX_PRINTCHECK_SUMMARY_CHARS);
  });
});

describe('layer area profile for the viewer layer preview', () => {
  it('reports the cross-section per slab from the plate up (volume share adds up)', () => {
    const { geometry } = run(boxPositions(20, 10, 8));
    const profile = geometry.layers?.areaProfile;
    expect(profile).toBeDefined();
    if (!profile) return;
    const volume = profile.areas.reduce((sum, area) => sum + area, 0) * profile.stepMm;
    // voxelised box: within a few percent of 20 × 10 × 8 mm³
    expect(volume / 1600).toBeGreaterThan(0.9);
    expect(volume / 1600).toBeLessThan(1.1);
    const filled = profile.areas.filter((area) => area > 0);
    expect(Math.max(...filled) / Math.min(...filled)).toBeLessThan(1.2);
  });
});
