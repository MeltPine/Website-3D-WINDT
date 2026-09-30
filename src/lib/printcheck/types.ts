import type { TriFlagName } from './flags';
import type { BuildVolumeFit, OrientationStudy } from './orientation';
import type { GapStats, SlenderStats, WallStats } from './features';
import type { Bounds, Topology, Vec3 } from './mesh';
import type { SupportStats } from './voxel';

/*
 * Material-independent measurements produced by the worker. The report
 * (findings, verdict) is derived from this on the main thread, so changing
 * the material in the calculator re-evaluates instantly without re-running
 * the geometry analysis.
 */

export const PRINTCHECK_STAGES = ['mesh', 'orientation', 'voxel', 'layers', 'walls', 'gaps', 'support', 'highlight'] as const;
export type PrintCheckStage = (typeof PRINTCHECK_STAGES)[number];

export type StageState =
  | { state: 'pending' }
  | { state: 'done'; ms: number }
  | { state: 'skipped'; reason: string }
  | { state: 'failed'; reason: string };

export const STAGE_LABEL: Readonly<Record<PrintCheckStage, string>> = {
  mesh: 'Netz und Topologie prüfen',
  orientation: 'Lagen vergleichen',
  voxel: 'Bauteil rastern',
  layers: 'Schichtprofil berechnen',
  walls: 'Wandstärken messen',
  gaps: 'Spalte und Bohrungen suchen',
  support: 'Hohlräume und Stützbedarf',
  highlight: '3D-Markierungen vorbereiten',
};

export interface VoxelSummary {
  h: number;
  NX: number;
  NY: number;
  NZ: number;
  cells: number;
  fillMode: 'nonzero' | 'even-odd';
  /** Volume enclosed twice or more (overlapping bodies), mm³. */
  overlapVolume: number;
  /** Share of scan rows whose contour did not close (open mesh), %. */
  leakyRowShare: number;
  /** Voxel volume, mm³ (compare with the mesh volume). */
  voxelVolume: number;
  poseId: number;
}

export interface LayerSummary {
  layerCount: number;
  firstLayerArea: number;
  firstLayerIslands: number;
  /** Largest number of separate islands in any layer. */
  maxIslands: number;
}

export interface VoidSummary {
  count: number;
  volume: number;
  largest: Vec3 | null;
}

export interface PrintCheckGeometry {
  triangleCount: number;
  bbox: Bounds;
  volume: number;
  signedVolume: number;
  area: number;
  centroid: Vec3;
  zeroAreaTriangles: number;
  topology: Topology | null;
  orientation: OrientationStudy | null;
  fit: BuildVolumeFit | null;
  voxel: VoxelSummary | null;
  layers: LayerSummary | null;
  slender: SlenderStats | null;
  walls: WallStats | null;
  gaps: GapStats | null;
  voids: VoidSummary | null;
  support: SupportStats | null;
  /** Surface area per TRI_FLAG name, mm² (filled when the pipeline finishes). */
  flaggedArea: Partial<Record<TriFlagName, number>>;
  stages: Record<PrintCheckStage, StageState>;
  /** Chord tolerance of the STEP tessellation, mm (null for mesh formats). */
  tessellationToleranceMm: number | null;
}

export interface PrintCheckOptions {
  /** Source format; STEP adds the tessellation tolerance to the report. */
  format: 'stl' | 'obj' | '3mf' | 'step';
  voxelTargetMm: number;
  voxelMaxCells: number;
  /** Topology is skipped above this triangle count (memory). */
  maxTopologyTriangles: number;
}

export const DEFAULT_PRINTCHECK_LIMITS = {
  voxelTargetMm: 0.1,
  voxelMaxCells: 16_000_000,
  maxTopologyTriangles: 12_000_000,
} as const;
