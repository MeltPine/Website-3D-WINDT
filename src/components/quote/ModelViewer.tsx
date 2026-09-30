import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Camera,
  Crosshair,
  Expand,
  Eye,
  Flame,
  Grid3x3,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  Ruler,
  Scan,
  Scissors,
  Square,
  BoxSelect,
  X,
} from 'lucide-react';
import type { HighlightSpec } from '../../lib/printcheck/evaluate';
import { useTheme } from '../../lib/theme';
import { trackEvent } from '../../lib/tracking';
import { VIEW_PRESETS, type ViewPresetId } from './viewer/camera';
import { HEATMAP_PALETTES } from './viewer/heatmap';
import type { MaterialLook } from './viewer/materialLook';
import { readStageColors } from './viewer/stage';
import { formatHours, layerCountFor, layerState, type AreaProfile } from './viewer/tools/layers';
import { formatDimension } from './viewer/dimensions';
import { describeMeasurement, type Measurement } from './viewer/tools/measure';
import { SECTION_AXES, clampOffset, sectionRange, type SectionAxis } from './viewer/tools/section';
import { ViewerCore, type DisplayMode, type PrepState, type ViewerPerf } from './viewer/ViewerCore';

/*
 * 3D viewer with tools (lazy chunk with three.js). The engine lives in
 * viewer/ViewerCore.ts; this component owns the tool state, the toolbar, the
 * keyboard shortcuts and the text equivalents (aria-live, measurement list).
 */

export interface ViewerHighlight {
  flags: Uint16Array;
  spec: HighlightSpec;
}

export interface PoseChoice {
  value: string;
  label: string;
  matrix: readonly number[] | null;
}

interface ModelViewerProps {
  positions: Float32Array;
  /** Accessible description, e.g. file name and dimensions. */
  label: string;
  look: MaterialLook;
  highlight: ViewerHighlight | null;
  /** H toggles the printability heatmap (null = no check data yet). */
  onToggleHeatmap: (() => void) | null;
  poses: readonly PoseChoice[];
  poseValue: string;
  onPoseChange: (value: string) => void;
  /** Reason line under the pose select (e.g. why a pose is recommended). */
  poseReason: string | null;
  /** Cross-section profile of the printability check and the pose value it belongs to. */
  layerProfile: { profile: AreaProfile; poseValue: string } | null;
  printTime: { totalHours: number; fixedHours: number } | null;
  layerHeightMm: number;
  buildVolumeMm: readonly [number, number, number];
}

type Tool = 'none' | 'measure' | 'section' | 'layers';

const MODES: ReadonlyArray<{ id: DisplayMode; label: string; key: string; icon: typeof Box }> = [
  { id: 'standard', label: 'Standard', key: '1', icon: Box },
  { id: 'edges', label: 'Kanten', key: '2', icon: Square },
  { id: 'wire', label: 'Draht', key: '3', icon: Grid3x3 },
  { id: 'xray', label: 'Röntgen', key: '4', icon: Scan },
];

const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ['Pfeiltasten', 'Drehen'],
  ['Umschalt + Pfeile', 'Verschieben'],
  ['+ / −', 'Zoomen'],
  ['1 – 4', 'Standard, Kanten, Draht, Röntgen'],
  ['F', 'Einpassen'],
  ['B', 'Im Bauraum'],
  ['O', 'Orthografisch / perspektivisch'],
  ['M', 'Messen'],
  ['S', 'Schnitt'],
  ['L', 'Schichten'],
  ['H', 'Druckbarkeits-Markierung'],
  ['P', 'Ausrichtung wählen'],
  ['Esc', 'Werkzeug beenden'],
  ['?', 'Diese Übersicht'],
];

const LAYER_PLAY_MS = 6000;

let viewerLoadTracked = false;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const ToolButton = ({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  shortcut,
  pressed = true,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Box;
  label: string;
  shortcut?: string;
  pressed?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={pressed ? active : undefined}
    aria-keyshortcuts={shortcut}
    title={shortcut ? `${label} (${shortcut})` : label}
    className={`flex min-h-[44px] w-full items-center gap-2 rounded px-2 text-left text-[13px] leading-tight transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-45 ${
      active ? 'bg-accent text-accent-contrast' : 'text-ink hover:bg-panel-2'
    }`}
  >
    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span className="truncate">{label}</span>
  </button>
);

const ModelViewer = ({
  positions,
  label,
  look,
  highlight,
  onToggleHeatmap,
  poses,
  poseValue,
  onPoseChange,
  poseReason,
  layerProfile,
  printTime,
  layerHeightMm,
  buildVolumeMm,
}: ModelViewerProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<ViewerCore | null>(null);
  const poseSelectRef = useRef<HTMLSelectElement>(null);
  const { resolvedTheme } = useTheme();
  const reducedMotion = useMemo(prefersReducedMotion, []);

  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<DisplayMode>('standard');
  const [tool, setTool] = useState<Tool>('none');
  const [inBuildVolume, setInBuildVolume] = useState(false);
  const [orthographic, setOrthographic] = useState(false);
  const [dimensions, setDimensions] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [measurements, setMeasurements] = useState<readonly Measurement[]>([]);
  const [pendingPoint, setPendingPoint] = useState(false);
  const [prep, setPrep] = useState<PrepState>({ normals: 'pending', edges: 'pending', bvh: 'pending' });
  const [poseSize, setPoseSize] = useState<[number, number, number]>([0, 0, 0]);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>('x');
  const [sectionOffset, setSectionOffset] = useState<number | null>(null);
  const [sectionFlipped, setSectionFlipped] = useState(false);
  const [layer, setLayer] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [perf, setPerf] = useState<ViewerPerf | null>(null);

  const activePose = poses.find((pose) => pose.value === poseValue) ?? poses[0];

  /* ------------------------------------------------------------ engine */

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return undefined;
    let core: ViewerCore;
    try {
      core = new ViewerCore(
        host,
        positions,
        { reducedMotion, buildVolumeMm, layerHeightMm },
        {
          onAnnounce: setAnnouncement,
          onMeasurements: (list, pending) => {
            setMeasurements(list);
            setPendingPoint(pending);
          },
          onPrepState: setPrep,
          onPoseSize: setPoseSize,
          onPerf: setPerf,
        },
      );
    } catch {
      setFailed(true);
      return undefined;
    }
    coreRef.current = core;
    if (!viewerLoadTracked) {
      viewerLoadTracked = true;
      trackEvent('quote_viewer_loaded', { form: 'quote' });
    }
    return () => {
      coreRef.current = null;
      core.dispose();
    };
    // the engine is rebuilt per model only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  // theme colours come from the CSS variables of the .tech scope
  useEffect(() => {
    const core = coreRef.current;
    const stage = stageRef.current;
    if (!core || !stage) return;
    core.setColors(readStageColors(stage));
  }, [resolvedTheme, positions, failed]);

  useEffect(() => {
    coreRef.current?.setLook(look);
  }, [look, positions]);

  useEffect(() => {
    coreRef.current?.setDisplayMode(mode);
  }, [mode, positions]);

  useEffect(() => {
    const core = coreRef.current;
    if (!core) return;
    const palette = HEATMAP_PALETTES[resolvedTheme];
    core.setHighlight(highlight?.flags ?? null, highlight?.spec.layers ?? [], palette);
  }, [highlight, resolvedTheme, positions]);

  // layers tool shows the pose the printability check sliced
  const layerPose = tool === 'layers' && layerProfile ? layerProfile.poseValue : null;
  const effectivePose = layerPose ? (poses.find((pose) => pose.value === layerPose) ?? activePose) : activePose;
  useEffect(() => {
    coreRef.current?.setPose(effectivePose?.matrix ?? null, true);
  }, [effectivePose, positions]);

  useEffect(() => {
    coreRef.current?.setInBuildVolume(inBuildVolume);
  }, [inBuildVolume]);

  useEffect(() => {
    coreRef.current?.setOrthographic(orthographic);
  }, [orthographic]);

  useEffect(() => {
    coreRef.current?.setDimensionsVisible(dimensions);
  }, [dimensions]);

  useEffect(() => {
    coreRef.current?.setMeasureActive(tool === 'measure');
  }, [tool, positions]);

  /* -------------------------------------------------------------- cuts */

  const range = useMemo(() => {
    const half = poseSize.map((value) => value / 2);
    return sectionRange([-half[0], -half[1], 0], [half[0], half[1], poseSize[2]], sectionAxis);
  }, [poseSize, sectionAxis]);
  const offset = sectionOffset === null ? clampOffset((range.min + range.max) / 2, range) : clampOffset(sectionOffset, range);
  const layerCount = poseSize[2] > 0 ? layerCountFor(poseSize[2], layerHeightMm) : 1;
  const currentLayer = layer === null ? Math.max(1, Math.round(layerCount * 0.6)) : Math.min(layerCount, Math.max(1, layer));
  const layerInfo =
    poseSize[2] > 0
      ? layerState(currentLayer, poseSize[2], layerHeightMm, layerPose ? (layerProfile?.profile ?? null) : null, printTime)
      : null;

  useEffect(() => {
    const core = coreRef.current;
    if (!core) return;
    if (tool === 'section') core.setCut({ kind: 'section', axis: sectionAxis, offset, flipped: sectionFlipped });
    else if (tool === 'layers' && layerInfo) core.setCut({ kind: 'layers', heightMm: layerInfo.heightMm });
    else core.setCut({ kind: 'none' });
  }, [tool, sectionAxis, offset, sectionFlipped, layerInfo?.heightMm, positions]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Abspielen": layers from 1 to the top in 6 s (never under reduced motion)
  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const started = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / LAYER_PLAY_MS);
      setLayer(Math.max(1, Math.round(t * layerCount)));
      if (t < 1) frame = requestAnimationFrame(step);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion, layerCount]);

  /* ---------------------------------------------------------- actions */

  const chooseTool = useCallback((next: Tool) => {
    setPlaying(false);
    setTool((current) => {
      const value = current === next ? 'none' : next;
      if (value !== 'none') trackEvent('quote_viewer_tool', { form: 'quote', tool: value });
      return value;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const savePng = useCallback(async () => {
    const core = coreRef.current;
    if (!core) return;
    const blob = await core.snapshot();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${label.split(',')[0].replace(/\.[^.]+$/, '')}-ansicht.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement('Ansicht als PNG gespeichert');
  }, [label]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const core = coreRef.current;
    if (!core) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const step = event.shiftKey ? 0.08 : 5;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft':
        if (event.shiftKey) core.panBy(-step, 0);
        else core.orbitBy(-step, 0);
        break;
      case 'ArrowRight':
        if (event.shiftKey) core.panBy(step, 0);
        else core.orbitBy(step, 0);
        break;
      case 'ArrowUp':
        if (event.shiftKey) core.panBy(0, step);
        else core.orbitBy(0, step);
        break;
      case 'ArrowDown':
        if (event.shiftKey) core.panBy(0, -step);
        else core.orbitBy(0, -step);
        break;
      case '+':
      case '=':
        core.zoomBy(0.85);
        break;
      case '-':
      case '_':
        core.zoomBy(1 / 0.85);
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        setMode(MODES[Number(event.key) - 1].id);
        setAnnouncement(`Darstellung ${MODES[Number(event.key) - 1].label}`);
        break;
      case 'f':
      case 'F':
        core.frameCamera(true);
        setAnnouncement('Eingepasst');
        break;
      case 'b':
      case 'B':
        setInBuildVolume((value) => !value);
        break;
      case 'o':
      case 'O':
        setOrthographic((value) => !value);
        break;
      case 'm':
      case 'M':
        chooseTool('measure');
        break;
      case 's':
      case 'S':
        chooseTool('section');
        break;
      case 'l':
      case 'L':
        chooseTool('layers');
        break;
      case 'h':
      case 'H':
        if (onToggleHeatmap) onToggleHeatmap();
        else handled = false;
        break;
      case 'p':
      case 'P':
        poseSelectRef.current?.focus();
        break;
      case '?':
        setShowShortcuts((value) => !value);
        break;
      case 'Escape':
        if (showShortcuts) setShowShortcuts(false);
        else if (tool !== 'none') setTool('none');
        else handled = false;
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  };

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft">
        Die 3D-Vorschau braucht WebGL, das hier nicht verfügbar ist. Maße, Richtpreis und Druckbarkeit stehen trotzdem
        vollständig im Messprotokoll unten.
      </div>
    );
  }

  const edgesPending = prep.edges === 'pending';
  const legend = highlight?.spec.layers ?? [];

  return (
    <div
      ref={stageRef}
      className="viewer-stage relative flex h-full w-full flex-col overflow-hidden bg-canvas md:flex-row"
      data-first-frame-ms={perf?.firstFrameMs?.toFixed(0)}
      data-setup-ms={perf?.setupMs?.toFixed(0)}
      data-first-render-ms={perf?.firstRenderMs?.toFixed(0)}
      data-normals-ms={perf?.normalsMs?.toFixed(0)}
      data-edges-ms={perf?.edgesMs?.toFixed(0)}
      data-bvh-ms={perf?.bvhMs?.toFixed(0)}
      data-pick-ms={perf?.lastPickMs?.toFixed(1)}
      data-triangles={perf?.triangles}
    >
      {/* toolbar: vertical on desktop, compact row on phones */}
      <div className="order-2 flex shrink-0 gap-1 overflow-x-auto border-t border-line bg-panel p-1 md:order-1 md:w-36 md:flex-col md:overflow-visible md:border-r md:border-t-0">
        <div role="group" aria-label="Darstellung" className="flex gap-1 md:flex-col">
          <label className="sr-only md:hidden" htmlFor="viewer-mode-select">
            Darstellung
          </label>
          <select
            id="viewer-mode-select"
            value={mode}
            onChange={(event) => setMode(event.target.value as DisplayMode)}
            className="tech-field min-h-[48px] w-auto py-1 text-sm md:hidden"
          >
            {MODES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
          <div className="hidden md:flex md:flex-col md:gap-0.5">
            {MODES.map((entry) => (
              <ToolButton
                key={entry.id}
                active={mode === entry.id}
                onClick={() => setMode(entry.id)}
                icon={entry.icon}
                label={entry.id !== 'standard' && edgesPending && entry.id !== 'wire' ? `${entry.label} …` : entry.label}
                shortcut={entry.key}
              />
            ))}
          </div>
        </div>
        <div className="hidden h-px bg-line md:block" aria-hidden="true" />
        <div role="group" aria-label="Werkzeuge" className="flex gap-1 md:flex-col md:gap-0.5">
          <ToolButton active={tool === 'measure'} onClick={() => chooseTool('measure')} icon={Ruler} label="Messen" shortcut="M" />
          <ToolButton active={tool === 'section'} onClick={() => chooseTool('section')} icon={Scissors} label="Schnitt" shortcut="S" />
          <div className="hidden md:contents">
            <ToolButton active={tool === 'layers'} onClick={() => chooseTool('layers')} icon={Layers} label="Schichten" shortcut="L" />
            {onToggleHeatmap && (
              <ToolButton active={Boolean(highlight)} onClick={onToggleHeatmap} icon={Flame} label="Markierung" shortcut="H" />
            )}
          </div>
        </div>
        <div className="hidden h-px bg-line md:block" aria-hidden="true" />
        <div role="group" aria-label="Ansicht" className="hidden md:flex md:flex-col md:gap-0.5">
          <ToolButton active={false} pressed={false} onClick={() => coreRef.current?.frameCamera(true)} icon={Maximize2} label="Einpassen" shortcut="F" />
          <ToolButton active={inBuildVolume} onClick={() => setInBuildVolume((value) => !value)} icon={BoxSelect} label="Im Bauraum" shortcut="B" />
          <ToolButton active={dimensions} onClick={() => setDimensions((value) => !value)} icon={Ruler} label="Maße" />
          <ToolButton active={orthographic} onClick={() => setOrthographic((value) => !value)} icon={Crosshair} label="Orthografisch" shortcut="O" />
        </div>
        {/* phones: remaining tools in a menu */}
        <details className="relative md:hidden">
          <summary className="tech-btn tech-btn-secondary min-h-[48px] cursor-pointer list-none text-sm">Mehr</summary>
          <div className="absolute bottom-full left-0 z-20 mb-1 w-48 space-y-0.5 rounded-md border border-line bg-panel p-1 shadow-lg">
            <ToolButton active={tool === 'layers'} onClick={() => chooseTool('layers')} icon={Layers} label="Schichten" shortcut="L" />
            {onToggleHeatmap && (
              <ToolButton active={Boolean(highlight)} onClick={onToggleHeatmap} icon={Flame} label="Markierung" shortcut="H" />
            )}
            <ToolButton active={false} pressed={false} onClick={() => coreRef.current?.frameCamera(true)} icon={Maximize2} label="Einpassen" shortcut="F" />
            <ToolButton active={inBuildVolume} onClick={() => setInBuildVolume((value) => !value)} icon={BoxSelect} label="Im Bauraum" shortcut="B" />
            <ToolButton active={dimensions} onClick={() => setDimensions((value) => !value)} icon={Ruler} label="Maße" />
            {(['iso', 'front', 'top'] as ViewPresetId[]).map((id) => (
              <ToolButton
                key={id}
                active={false}
                pressed={false}
                onClick={() => coreRef.current?.viewPreset(id)}
                icon={Eye}
                label={`Ansicht ${VIEW_PRESETS.find((entry) => entry.id === id)?.label ?? ''}`}
              />
            ))}
          </div>
        </details>
      </div>

      <div className="order-1 flex min-h-0 flex-1 flex-col md:order-2">
      <div className="relative min-h-0 flex-1">
        <div
          ref={canvasHostRef}
          className="blueprint absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
          tabIndex={0}
          role="application"
          aria-roledescription="3D-Ansicht"
          aria-label={`3D-Ansicht: ${label}. Pfeiltasten drehen, Umschalt und Pfeile verschieben, Plus und Minus zoomen, Fragezeichen zeigt alle Tastenkürzel.`}
          aria-describedby="viewer-status"
          onKeyDown={onKeyDown}
        />

        {/* view presets ("Ansichtswürfel") */}
        <div className="absolute right-2 top-2 z-10 hidden grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line text-[11px] md:grid" role="group" aria-label="Normalansichten">
          {(['top', 'iso', 'back', 'left', 'front', 'right'] as ViewPresetId[]).map((id) => {
            const preset = VIEW_PRESETS.find((entry) => entry.id === id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => coreRef.current?.viewPreset(id)}
                className="min-h-[32px] min-w-[52px] bg-panel px-1.5 py-1 text-ink hover:bg-panel-2"
              >
                {preset?.label}
              </button>
            );
          })}
        </div>

        {highlight && legend.length > 0 && (
          <div className="absolute left-2 top-2 z-10 max-w-[70%] space-y-1 rounded border border-line bg-panel px-2.5 py-2 text-xs text-ink" aria-label="Legende der Markierung">
            {legend.map((entry) => (
              <p key={entry.label} className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-4 shrink-0 rounded-sm border border-line ${entry.tone === 'critical' ? 'viewer-swatch-critical' : 'viewer-swatch-hint'}`}
                  aria-hidden="true"
                />
                <span>
                  {entry.tone === 'critical' ? 'Kritisch' : 'Hinweis'}: {entry.label}
                </span>
              </p>
            ))}
            <p className="flex items-center gap-2 text-ink-muted">
              <span className="viewer-swatch-neutral inline-block h-3 w-4 shrink-0 rounded-sm border border-line" aria-hidden="true" />
              nicht betroffen
            </p>
          </div>
        )}

        {/* bottom bar: pose, PNG, fullscreen, help */}
        <div className="absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-end gap-2">
          <div className="min-w-0 max-w-full rounded border border-line bg-panel px-2 py-1.5">
            <label htmlFor="viewer-pose" className="label-caps block">
              Ausrichtung (P)
            </label>
            <select
              id="viewer-pose"
              ref={poseSelectRef}
              value={layerPose ?? poseValue}
              onChange={(event) => onPoseChange(event.target.value)}
              disabled={Boolean(layerPose)}
              className="mt-0.5 max-w-[16rem] bg-transparent text-sm text-ink"
            >
              {poses.map((pose) => (
                <option key={pose.value} value={pose.value}>
                  {pose.label}
                </option>
              ))}
            </select>
            {poseReason && !layerPose && <p className="mt-0.5 hidden max-w-[22rem] text-xs text-ink-muted md:block">{poseReason}</p>}
            {layerPose && <p className="mt-0.5 max-w-[22rem] text-xs text-ink-muted">Schichten zeigen die geprüfte Drucklage.</p>}
          </div>
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={savePng} className="tech-btn tech-btn-secondary px-2.5 text-sm" title="Ansicht als PNG speichern">
              <Camera className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">PNG</span>
            </button>
            <button type="button" onClick={toggleFullscreen} className="tech-btn tech-btn-secondary px-2.5" aria-label={fullscreen ? 'Vollbild beenden' : 'Vollbild'}>
              {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Expand className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => setShowShortcuts((value) => !value)}
              className="tech-btn tech-btn-secondary px-2.5"
              aria-label="Tastenkürzel"
              aria-expanded={showShortcuts}
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {showShortcuts && (
          <div className="absolute right-2 top-16 z-20 w-64 rounded border border-line bg-panel p-3 text-xs text-ink shadow-lg" role="dialog" aria-label="Tastenkürzel">
            <div className="mb-2 flex items-center justify-between">
              <p className="label-caps">Tastenkürzel</p>
              <button type="button" onClick={() => setShowShortcuts(false)} aria-label="Schließen" className="p-1 text-ink-muted hover:text-ink">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {SHORTCUTS.map(([key, text]) => (
                <div key={key} className="contents">
                  <dt className="num text-ink">{key}</dt>
                  <dd className="text-ink-soft">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* tool panel + live text, below the canvas (never over the pose box) */}
      <div className="viewer-toolpanel shrink-0 border-t border-line bg-panel px-3 py-2 text-sm" hidden={tool === 'none'}>
        {tool === 'measure' && (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink">
                {prep.bvh === 'pending' ? 'Messen (Netz wird vorbereitet, Klicks gehen trotzdem)' : 'Messen'}:{' '}
                <span className="font-normal text-ink-soft">
                  {pendingPoint ? 'zweiten Punkt anklicken' : 'Punkt oder Kante anklicken – Ecken rasten ein'}
                </span>
              </p>
              {measurements.length > 0 && (
                <button type="button" onClick={() => coreRef.current?.clearMeasurements()} className="ml-auto text-xs font-medium text-accent underline">
                  Messungen löschen
                </button>
              )}
            </div>
            {measurements.length > 0 && (
              <ol className="num space-y-0.5 text-xs text-ink">
                {measurements.map((measurement, index) => (
                  <li key={`${index}-${measurement.distance}`}>
                    {index + 1}. {describeMeasurement(measurement)}
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-ink-muted">Gemessen am Dreiecksnetz. Rundungen sind angenähert – für Passmaße gilt Ihre Zeichnung.</p>
            {announcement.startsWith('Kein Punkt') && <p className="text-xs text-warn">{announcement}</p>}
          </div>
        )}
        {tool === 'section' && (
          <div className="flex flex-wrap items-center gap-3">
            <fieldset className="flex items-center gap-1">
              <legend className="sr-only">Schnittachse</legend>
              {SECTION_AXES.map((axis) => (
                <label key={axis} className={`tech-btn min-h-[36px] cursor-pointer px-2.5 text-sm ${sectionAxis === axis ? 'tech-btn-primary' : 'tech-btn-secondary'}`}>
                  <input
                    type="radio"
                    name="viewer-section-axis"
                    value={axis}
                    checked={sectionAxis === axis}
                    onChange={() => {
                      setSectionAxis(axis);
                      setSectionOffset(null);
                      // default: remove the half that faces the default camera (front right, above)
                      setSectionFlipped(axis === 'y');
                    }}
                    className="sr-only"
                  />
                  {axis.toUpperCase()}
                </label>
              ))}
            </fieldset>
            <label className="flex min-w-[12rem] flex-1 items-center gap-2">
              <span className="sr-only">Schnittposition</span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={offset}
                onChange={(event) => setSectionOffset(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="sr-only">Schnittposition in mm</span>
              <input
                type="number"
                step={range.step}
                min={range.min}
                max={range.max}
                value={Number(offset.toFixed(1))}
                onChange={(event) => setSectionOffset(Number(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }}
                className="tech-field num min-h-[36px] w-24 py-1 text-right"
              />
              <span className="text-ink-muted">mm</span>
            </label>
            <button type="button" onClick={() => setSectionFlipped((value) => !value)} className="tech-btn tech-btn-secondary min-h-[36px] text-sm">
              Richtung umkehren
            </button>
          </div>
        )}
        {tool === 'layers' && layerInfo && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[12rem] flex-1 items-center gap-2">
              <span className="sr-only">Schicht</span>
              <input
                type="range"
                min={1}
                max={layerCount}
                step={1}
                value={currentLayer}
                onChange={(event) => {
                  setPlaying(false);
                  setLayer(Number(event.target.value));
                }}
                className="w-full accent-[var(--accent)]"
              />
            </label>
            <p className="num text-xs text-ink" aria-live="polite">
              Schicht {layerInfo.layer} / {layerInfo.layerCount} · {formatDimension(layerInfo.heightMm)} mm
              {layerInfo.hoursSoFar !== null && printTime ? ` · ca. ${formatHours(layerInfo.hoursSoFar)} von ${formatHours(printTime.totalHours)}` : ''}
            </p>
            {!reducedMotion && (
              <button type="button" onClick={() => setPlaying((value) => !value)} className="tech-btn tech-btn-secondary min-h-[36px] text-sm">
                <Eye className="h-4 w-4" aria-hidden="true" /> {playing ? 'Anhalten' : 'Abspielen'}
              </button>
            )}
            <p className="w-full text-xs text-ink-muted">
              {layerPose
                ? 'Zeitanteil aus der Querschnittsfläche der Druckbarkeitsprüfung geschätzt – kein Slicer.'
                : 'Ohne Druckbarkeitsprüfung nur Höhe und Schichtzahl, kein Zeitanteil.'}
            </p>
          </div>
        )}
      </div>
      </div>
      <p id="viewer-status" className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
};

export default ModelViewer;
