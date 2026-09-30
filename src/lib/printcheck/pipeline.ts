import { STEP_TRIANGULATION } from '../geometry/step';
import { TRI_FLAG, type TriFlagName } from './flags';
import { dilateMarks, gapStats, markSlender, marksToTriangleFlags, slenderStats, wallStats } from './features';
import { bounds, massProperties, topology, weld } from './mesh';
import { buildVolumeFit, flagOverhangs, orientationStudy } from './orientation';
import { POSES } from './pose';
import { PRINTCHECK_RULES, PROCESS } from './standards';
import {
  PRINTCHECK_STAGES,
  type PrintCheckGeometry,
  type PrintCheckOptions,
  type PrintCheckStage,
  type StageState,
} from './types';
import {
  MARK,
  chooseVoxelSize,
  distanceTransform,
  enclosedVoids,
  layerProfile,
  rasterise,
  supportAnalysis,
  type VoxelGrid,
} from './voxel';

/*
 * The printability pipeline. DOM-free and synchronous per stage; the worker
 * wraps it and forwards progress and partial results. Every stage records
 * whether it ran, was skipped (with the reason) or failed - the report turns
 * anything that did not run into "nicht geprüft", never into a pass.
 */

export interface PipelineCallbacks {
  onProgress: (stage: PrintCheckStage, fraction: number) => void;
  /** Called after every stage with the measurements so far (flags excluded). */
  onPartial: (geometry: PrintCheckGeometry) => void;
}

export interface PipelineResult {
  geometry: PrintCheckGeometry;
  /** TRI_FLAG bits per triangle. */
  flags: Uint16Array;
}

/** The loaded pose wins when it is at most this many score points behind. */
const LOADED_POSE_BONUS = 2;

function reasonOf(error: unknown): string {
  if (error instanceof RangeError) return 'zu wenig Arbeitsspeicher im Browser';
  return 'interner Fehler bei der Berechnung';
}

export function runPrintCheck(
  positions: Float32Array,
  options: PrintCheckOptions,
  callbacks: PipelineCallbacks,
): PipelineResult {
  if (positions.length === 0 || positions.length % 9 !== 0) {
    throw new Error('Invalid triangle soup.');
  }
  const nt = positions.length / 9;
  const flags = new Uint16Array(nt);
  const stages = Object.fromEntries(PRINTCHECK_STAGES.map((stage) => [stage, { state: 'pending' }])) as Record<
    PrintCheckStage,
    StageState
  >;
  const box = bounds(positions);
  const mass = massProperties(positions, box);
  const longest = Math.max(box.size[0], box.size[1], box.size[2]);
  const geometry: PrintCheckGeometry = {
    triangleCount: nt,
    bbox: box,
    volume: mass.volume,
    signedVolume: mass.signedVolume,
    area: mass.area,
    centroid: mass.centroid,
    zeroAreaTriangles: mass.zeroArea,
    topology: null,
    orientation: null,
    fit: null,
    voxel: null,
    layers: null,
    slender: null,
    walls: null,
    gaps: null,
    voids: null,
    support: null,
    flaggedArea: {},
    stages,
    // occt-import-js: 'bounding_box_ratio' = ratio of the average bounding-box size
    tessellationToleranceMm:
      options.format === 'step'
        ? (STEP_TRIANGULATION.linearDeflection * (box.size[0] + box.size[1] + box.size[2])) / 3
        : null,
  };

  const run = (stage: PrintCheckStage, body: () => void): boolean => {
    const started = Date.now();
    callbacks.onProgress(stage, 0);
    try {
      body();
      if (stages[stage].state === 'pending') stages[stage] = { state: 'done', ms: Date.now() - started };
    } catch (error) {
      stages[stage] = { state: 'failed', reason: reasonOf(error) };
    }
    callbacks.onProgress(stage, 1);
    callbacks.onPartial(geometry);
    return stages[stage].state === 'done';
  };
  const skip = (stage: PrintCheckStage, reason: string) => {
    stages[stage] = { state: 'skipped', reason };
    callbacks.onPartial(geometry);
  };

  /* --- 1. mesh topology ------------------------------------------- */
  if (nt > options.maxTopologyTriangles) {
    skip('mesh', `Netz mit ${nt.toLocaleString('de-DE')} Dreiecken ist für die Topologieprüfung im Browser zu groß`);
  } else {
    run('mesh', () => {
      const eps = Math.max(1e-5, longest * 1e-6);
      const welded = weld(positions, box, eps);
      callbacks.onProgress('mesh', 0.3);
      geometry.topology = topology(positions, welded, box, flags, {
        splinterVolumeMm3: PRINTCHECK_RULES.splinterVolumeMm3.value,
        sharpInnerEdgeDeg: PRINTCHECK_RULES.sharpInnerEdgeDeg.value,
        onProgress: (fraction) => callbacks.onProgress('mesh', 0.3 + fraction * 0.7),
      });
    });
  }

  /* --- 2. orientation + build volume ------------------------------- */
  run('orientation', () => {
    const angles = {
      plateTolMm: PROCESS.layerHeightMm,
      supportDeg: PRINTCHECK_RULES.overhangSupportDeg.value,
      criticalDeg: PRINTCHECK_RULES.overhangCriticalDeg.value,
    };
    geometry.fit = buildVolumeFit(box, PROCESS.buildVolumeMm);
    geometry.orientation = orientationStudy(positions, box, {
      ...angles,
      centroid: mass.centroid,
      loadedPoseBonus: LOADED_POSE_BONUS,
      // prefer poses that fit axis-aligned; diagonal placement only if nothing else fits
      eligiblePoses:
        geometry.fit.fittingPoses.length > 0 ? geometry.fit.fittingPoses : geometry.fit.diagonalPoses,
    });
    flagOverhangs(positions, box, POSES[geometry.orientation.recommendedId], flags, angles);
  });

  /* --- 3. voxel model in the recommended pose ---------------------- */
  let vox: VoxelGrid | null = null;
  const pose = POSES[geometry.orientation?.recommendedId ?? 0];
  if (!(longest > 0)) {
    skip('voxel', 'Bauteil hat keine räumliche Ausdehnung');
  } else {
    run('voxel', () => {
      const h = chooseVoxelSize(box.size, {
        targetMm: options.voxelTargetMm,
        maxCells: options.voxelMaxCells,
        minCellsLongest: 48,
      });
      // Nonzero winding needs a consistent orientation; otherwise even-odd.
      const nonzero = geometry.topology !== null && geometry.topology.orientationConsistent;
      const grid = rasterise(positions, box, pose, {
        h,
        nonzero,
        onProgress: (fraction) => callbacks.onProgress('voxel', fraction),
      });
      vox = grid;
      const cellVolume = h * h * h;
      geometry.voxel = {
        h,
        NX: grid.NX,
        NY: grid.NY,
        NZ: grid.NZ,
        cells: grid.NX * grid.NY * grid.NZ,
        fillMode: grid.fillMode,
        overlapVolume: grid.overlapCells * cellVolume,
        leakyRowShare: grid.scannedRows > 0 ? (grid.leakyRows / grid.scannedRows) * 100 : 0,
        voxelVolume: grid.filledCells * cellVolume,
        poseId: pose.id,
      };
    });
  }

  const finish = (): PipelineResult => {
    geometry.flaggedArea = flaggedAreas(positions, flags);
    callbacks.onPartial(geometry);
    return { geometry, flags };
  };

  const voxelStages: PrintCheckStage[] = ['layers', 'walls', 'gaps', 'support', 'highlight'];
  const grid = vox as VoxelGrid | null;
  if (!grid) {
    for (const stage of voxelStages) skip(stage, 'Voxelmodell nicht verfügbar');
    return finish();
  }
  if (grid.filledCells === 0) {
    for (const stage of voxelStages) skip(stage, 'Das Netz umschließt kein Volumen (offene Fläche)');
    return finish();
  }

  /* --- 4. layers and slender features ------------------------------ */
  run('layers', () => {
    const plateZ = grid.origin[2] + grid.h;
    const layers = layerProfile(grid, plateZ, (fraction) => callbacks.onProgress('layers', fraction));
    const first = layers.find((layer) => layer.area > 0) ?? null;
    geometry.layers = {
      layerCount: layers.filter((layer) => layer.area > 0).length,
      firstLayerArea: first ? first.area : 0,
      firstLayerIslands: first ? first.islands : 0,
      maxIslands: layers.reduce((max, layer) => Math.max(max, layer.islands), 0),
    };
    const poseSize = geometry.orientation?.poses[pose.id].size ?? [box.size[0], box.size[1], box.size[2]];
    const slender = slenderStats(
      layers,
      grid,
      [poseSize[0], poseSize[1]],
      poseSize[2],
      PRINTCHECK_RULES.slenderFeatureMaxDiameterMm.value,
    );
    geometry.slender = slender;
    if (slender.layerRange && slender.featureRatio > PRINTCHECK_RULES.slenderFeatureRatio.value) {
      markSlender(grid, slender.layerRange, Math.PI * (PRINTCHECK_RULES.slenderFeatureMaxDiameterMm.value / 2) ** 2);
    }
  });

  /* --- 5. wall thickness (medial axis) ------------------------------ */
  let dist: Float32Array | null = null;
  run('walls', () => {
    dist = distanceTransform(grid, true, null, (fraction) => callbacks.onProgress('walls', fraction * 0.9));
    geometry.walls = wallStats(
      dist,
      grid,
      PRINTCHECK_RULES.wallCriticalMm.value,
      PRINTCHECK_RULES.wallRecommendedMm.value,
    );
  });

  /* --- 6. gaps, slots, holes (medial axis of the empty space) ------- */
  run('gaps', () => {
    const buffer = distanceTransform(grid, false, dist, (fraction) => callbacks.onProgress('gaps', fraction * 0.8));
    geometry.gaps = gapStats(buffer, grid, {
      narrowHintMm: PRINTCHECK_RULES.gapHintMm.value,
      smallHoleMm: PRINTCHECK_RULES.smallHoleMm.value,
      horizontalHoleMm: PRINTCHECK_RULES.horizontalHoleTeardropMm.value,
    });
  });
  dist = null;

  /* --- 7. enclosed voids and support -------------------------------- */
  run('support', () => {
    const pockets = enclosedVoids(grid).filter((pocket) => pocket.volume > grid.h ** 3 * 8);
    geometry.voids = {
      count: pockets.length,
      volume: pockets.reduce((sum, pocket) => sum + pocket.volume, 0),
      largest: pockets.length > 0 ? pockets[0].size : null,
    };
    geometry.support = supportAnalysis(grid);
  });

  /* --- 8. marks -> triangle flags ----------------------------------- */
  run('highlight', () => {
    // thin-wall and slender marks cover the solid cells themselves: one cell reaches the surface samples
    dilateMarks(grid, MARK.THIN_WALL | MARK.THIN_CRITICAL | MARK.SLENDER | MARK.OVERLAP, 1);
    // gap marks sit on the centre line of the gap: grow them to both gap walls
    const gapRadius = Math.ceil(PRINTCHECK_RULES.gapHintMm.value / (2 * grid.h)) + 1;
    dilateMarks(grid, MARK.NARROW_GAP, gapRadius);
    marksToTriangleFlags(positions, grid, flags);
  });

  return finish();
}

/** Surface area per flag, mm². */
export function flaggedAreas(positions: Float32Array, flags: Uint16Array): Partial<Record<TriFlagName, number>> {
  const names = Object.keys(TRI_FLAG) as TriFlagName[];
  const sums = new Float64Array(names.length);
  for (let t = 0; t < flags.length; t += 1) {
    const f = flags[t];
    if (f === 0) continue;
    const i = t * 9;
    const e1x = positions[i + 3] - positions[i];
    const e1y = positions[i + 4] - positions[i + 1];
    const e1z = positions[i + 5] - positions[i + 2];
    const e2x = positions[i + 6] - positions[i];
    const e2y = positions[i + 7] - positions[i + 1];
    const e2z = positions[i + 8] - positions[i + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const area = Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
    for (let k = 0; k < names.length; k += 1) {
      if (f & TRI_FLAG[names[k]]) sums[k] += area;
    }
  }
  const result: Partial<Record<TriFlagName, number>> = {};
  names.forEach((name, k) => {
    if (sums[k] > 0) result[name] = sums[k];
  });
  return result;
}
