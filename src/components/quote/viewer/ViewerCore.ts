import {
  ACESFilmicToneMapping,
  AlwaysStencilFunc,
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DecrementWrapStencilOp,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  IncrementWrapStencilOp,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NotEqualStencilFunc,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Ray,
  Raycaster,
  RepeatWrapping,
  ReplaceStencilOp,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MeshBVH } from 'three-mesh-bvh';
import prepWorkerUrl from './viewerPrep.worker.ts?worker&url';
import {
  DEFAULT_AZIMUTH_DEG,
  DEFAULT_ELEVATION_DEG,
  VIEW_PRESETS,
  boxRadius,
  directionFromAngles,
  orthographicHalfHeight,
  perspectiveFrameDistance,
  plateSizeFor,
  type ViewPresetId,
} from './camera';
import { AXIS_LABEL, oversizeAxes } from './dimensions';
import { fillHeatmap, type HeatLayer, type HeatmapPalette } from './heatmap';
import type { MaterialLook } from './materialLook';
import { CREASE_ANGLE_DEG } from './normals';
import type { PrepMessage, PrepRequest } from './prepProtocol';
import { Stage, type StageColors } from './stage';
import {
  SNAP_RADIUS_PX,
  buildEndpointIndex,
  chainCollinear,
  describeMeasurement,
  measureBetween,
  pointSegmentDistance,
  snapToVertex,
  type EndpointIndex,
  type Measurement,
  type Vec3,
} from './tools/measure';
import { sectionPlane, type SectionAxis } from './tools/section';

/*
 * The viewer engine (framework-free; ModelViewer.tsx owns the UI state).
 *
 * - Rendering is on demand: a frame is drawn only after a change (orbit,
 *   tool, theme), never in a permanent loop. Camera moves animate for 300 ms
 *   unless reduced motion is requested.
 * - The positions buffer is shared with the quote session and never copied
 *   on the main thread. A prep worker gets one copy and returns creased
 *   normals, feature edges and the picking BVH; until then the part is drawn
 *   with flat shading, edges and measuring report "wird vorbereitet".
 * - Above LARGE_MODEL_TRIANGLES the pixel ratio drops to 1 while the camera
 *   moves and returns to full resolution when it stops.
 */

export type DisplayMode = 'standard' | 'edges' | 'wire' | 'xray';
export type CutTool = { kind: 'none' } | { kind: 'section'; axis: SectionAxis; offset: number; flipped: boolean } | { kind: 'layers'; heightMm: number };

export interface PrepState {
  normals: 'pending' | 'ready' | 'failed';
  edges: 'pending' | 'ready' | 'failed';
  bvh: 'pending' | 'ready' | 'failed';
}

export interface ViewerPerf {
  triangles: number;
  /** Synchronous setup in the constructor (scene, environment, first shadow), ms. */
  setupMs: number | null;
  /** Constructor start to the first drawn frame, ms. */
  firstFrameMs: number | null;
  /** Duration of the first renderer.render call (shader compilation included), ms. */
  firstRenderMs: number | null;
  normalsMs: number | null;
  edgesMs: number | null;
  bvhMs: number | null;
  lastPickMs: number | null;
}

export interface ViewerCallbacks {
  /** Short German text for the aria-live region. */
  onAnnounce: (text: string) => void;
  onMeasurements: (list: readonly Measurement[], pending: boolean) => void;
  onPrepState: (state: PrepState) => void;
  /** Size of the part in the current pose (world axes), mm. */
  onPoseSize: (size: [number, number, number]) => void;
  onPerf: (perf: ViewerPerf) => void;
}

export interface ViewerOptions {
  reducedMotion: boolean;
  buildVolumeMm: readonly [number, number, number];
  /** FDM layer height for the layer-line look, mm. */
  layerHeightMm: number;
}

export const LARGE_MODEL_TRIANGLES = 1_000_000;
const TRANSITION_MS = 300;
const PERSPECTIVE_FOV = 35;
const MAX_PIXEL_RATIO = 2;

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function makeHatchTexture(line: string, fill: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = fill;
    context.fillRect(0, 0, 32, 32);
    context.strokeStyle = line;
    context.lineWidth = 3;
    context.beginPath();
    // 45° hatch, seamless when tiled
    for (let o = -32; o <= 32; o += 16) {
      context.moveTo(o, 32);
      context.lineTo(o + 32, 0);
    }
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export class ViewerCore {
  readonly renderer: WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly stage: Stage;
  private readonly perspective = new PerspectiveCamera(PERSPECTIVE_FOV, 1, 0.1, 50_000);
  private readonly orthographic = new OrthographicCamera(-1, 1, 1, -1, -50_000, 50_000);
  private camera: PerspectiveCamera | OrthographicCamera = this.perspective;
  private readonly controls: OrbitControls;
  private readonly geometry = new BufferGeometry();
  private readonly material: MeshPhysicalMaterial;
  private readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private readonly wireMaterial = new MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.35 });
  private readonly wireMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly edgeMaterial = new LineBasicMaterial();
  private edges: LineSegments | null = null;
  private edgeSegments: Float32Array | null = null;
  private edgeSegmentOfTriangle: Int32Array | null = null;
  private endpointIndex: EndpointIndex | null = null;
  private bvh: MeshBVH | null = null;
  private worker: Worker | null = null;

  // cut (section / layers) with stencil caps
  private readonly clipPlane = new Plane(new Vector3(0, 0, -1), 0);
  private readonly stencilGroup = new Group();
  private readonly capMaterial: MeshBasicMaterial;
  private readonly cap: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private hatchTexture: CanvasTexture | null = null;
  private cut: CutTool = { kind: 'none' };

  // measuring
  private measureActive = false;
  private readonly measureGroup = new Group();
  private readonly measureLineMaterial = new LineBasicMaterial({ depthTest: false, transparent: true });
  private readonly measurePointMaterial = new PointsMaterial({ size: 7, sizeAttenuation: false, depthTest: false, transparent: true });
  private measurements: Measurement[] = [];
  private pendingPoint: Vec3 | null = null;

  private colors: StageColors | null = null;
  private look: MaterialLook | null = null;
  private displayMode: DisplayMode = 'standard';
  private highlightActive = false;
  private inBuildVolume = false;
  private dimensionsVisible = true;
  private poseMatrix: readonly number[] | null = null;
  private readonly triangles: number;
  private readonly options: ViewerOptions;
  private readonly callbacks: ViewerCallbacks;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private frameRequested = false;
  private animation: { cancel: () => void } | null = null;
  private disposed = false;
  private readonly perf: ViewerPerf;
  private readonly prep: PrepState = { normals: 'pending', edges: 'pending', bvh: 'pending' };
  private pointerDown: { x: number; y: number } | null = null;
  private readonly started = performance.now();

  constructor(container: HTMLElement, positions: Float32Array, options: ViewerOptions, callbacks: ViewerCallbacks) {
    this.container = container;
    this.options = options;
    this.callbacks = callbacks;
    this.triangles = Math.floor(positions.length / 9);
    this.perf = {
      triangles: this.triangles,
      setupMs: null,
      firstFrameMs: null,
      firstRenderMs: null,
      normalsMs: null,
      edgesMs: null,
      bvhMs: null,
      lastPickMs: null,
    };

    // throws if WebGL is unavailable; the React wrapper shows the text fallback
    this.renderer = new WebGLRenderer({ antialias: true, stencil: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);
    this.labelRenderer.domElement.className = 'viewer-labels';
    container.appendChild(this.labelRenderer.domElement);

    this.stage = new Stage(this.renderer);

    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.material = new MeshPhysicalMaterial({ metalness: 0, flatShading: true, side: FrontSide });
    this.material.onBeforeCompile = (shader) => this.patchShader(shader);
    this.material.customProgramCacheKey = () =>
      `${this.highlightActive ? 'p' : ''}${this.material.flatShading ? 'f' : ''}${this.options.layerHeightMm}`;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.layers.enable(1); // contact shadow layer
    this.stage.scene.add(this.mesh);
    this.wireMesh = new Mesh(this.geometry, this.wireMaterial);
    this.wireMesh.visible = false;
    this.mesh.add(this.wireMesh);

    // stencil caps for the cut: back faces increment, front faces decrement
    const stencilBase = new MeshBasicMaterial({ depthWrite: false, depthTest: false, colorWrite: false, stencilWrite: true, stencilFunc: AlwaysStencilFunc });
    const back = stencilBase.clone();
    back.side = BackSide;
    back.clippingPlanes = [this.clipPlane];
    back.stencilFail = IncrementWrapStencilOp;
    back.stencilZFail = IncrementWrapStencilOp;
    back.stencilZPass = IncrementWrapStencilOp;
    const front = stencilBase.clone();
    front.side = FrontSide;
    front.clippingPlanes = [this.clipPlane];
    front.stencilFail = DecrementWrapStencilOp;
    front.stencilZFail = DecrementWrapStencilOp;
    front.stencilZPass = DecrementWrapStencilOp;
    stencilBase.dispose();
    const backMesh = new Mesh(this.geometry, back);
    const frontMesh = new Mesh(this.geometry, front);
    backMesh.renderOrder = 1;
    frontMesh.renderOrder = 1;
    this.stencilGroup.add(backMesh, frontMesh);
    this.stencilGroup.visible = false;
    this.mesh.add(this.stencilGroup);
    this.capMaterial = new MeshBasicMaterial({
      side: DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilZPass: ReplaceStencilOp,
      toneMapped: false,
    });
    this.cap = new Mesh(new PlaneGeometry(1, 1), this.capMaterial);
    this.cap.renderOrder = 1.1;
    this.cap.visible = false;
    this.cap.onAfterRender = (renderer) => renderer.clearStencil();
    this.stage.scene.add(this.cap);

    this.measureGroup.renderOrder = 10;
    this.stage.scene.add(this.measureGroup);

    this.perspective.up.set(0, 0, 1);
    this.orthographic.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.perspective, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => {
      this.cancelAnimation();
      if (this.triangles > LARGE_MODEL_TRIANGLES) this.renderer.setPixelRatio(1);
    });
    this.controls.addEventListener('end', () => {
      if (this.triangles > LARGE_MODEL_TRIANGLES) {
        this.renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio));
        this.resize();
      }
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.applyPose(null);
    this.resize();
    this.frameCamera(false, directionFromAngles(DEFAULT_AZIMUTH_DEG, DEFAULT_ELEVATION_DEG));
    this.startPrepWorker(positions);
    this.perf.setupMs = performance.now() - this.started;
  }

  /* ---------------------------------------------------------- shaders */

  private patchShader(shader: WebGLProgramParametersWithUniforms): void {
    shader.uniforms.uLayerHeight = { value: this.options.layerHeightMm };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vWorldZ;\n#ifdef USE_PATTERN\nattribute float aPattern;\nvarying float vPattern;\n#endif',
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWorldZ = (modelMatrix * vec4(transformed, 1.0)).z;\n#ifdef USE_PATTERN\nvPattern = aPattern;\n#endif',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uLayerHeight;\nvarying float vWorldZ;\n#ifdef USE_PATTERN\nvarying float vPattern;\n#endif',
      )
      .replace(
        '#include <color_fragment>',
        [
          '#include <color_fragment>',
          '#ifdef USE_PATTERN',
          // diagonal hatch in screen space on critical areas: readable without colour
          'if (vPattern > 0.5 && mod(gl_FragCoord.x + gl_FragCoord.y, 9.0) < 3.0) diffuseColor.rgb *= 0.25;',
          '#endif',
        ].join('\n'),
      )
      .replace(
        '#include <normal_fragment_maps>',
        [
          '#include <normal_fragment_maps>',
          // FDM layer lines: normal modulated with the layer period along world Z,
          // faded out when one period is shorter than ~2 px (no moire)
          'float layerCoord = vWorldZ / uLayerHeight;',
          'float layersPerPixel = fwidth(layerCoord);',
          'float layerFade = 1.0 - smoothstep(0.25, 0.5, layersPerPixel);',
          'vec3 layerAxis = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);',
          'normal = normalize(normal + layerAxis * sin(layerCoord * 6.2831853) * 0.22 * layerFade);',
        ].join('\n'),
      );
  }

  /* ---------------------------------------------------------- prep worker */

  private startPrepWorker(positions: Float32Array): void {
    let worker: Worker;
    try {
      worker = new Worker(prepWorkerUrl, { type: 'module' });
    } catch {
      this.prep.normals = 'failed';
      this.prep.edges = 'failed';
      this.prep.bvh = 'failed';
      this.callbacks.onPrepState({ ...this.prep });
      return;
    }
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<PrepMessage>) => this.onPrepMessage(event.data);
    worker.onerror = (event) => {
      event.preventDefault();
      for (const key of ['normals', 'edges', 'bvh'] as const) if (this.prep[key] === 'pending') this.prep[key] = 'failed';
      this.callbacks.onPrepState({ ...this.prep });
      this.stopWorker();
    };
    const request: PrepRequest = { positions: positions.slice(), creaseDeg: CREASE_ANGLE_DEG, buildBvh: true };
    worker.postMessage(request, [request.positions.buffer]);
  }

  private stopWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private onPrepMessage(message: PrepMessage): void {
    if (this.disposed) return;
    switch (message.type) {
      case 'normals':
        this.geometry.setAttribute('normal', new BufferAttribute(message.normals, 3));
        this.material.flatShading = false;
        this.material.needsUpdate = true;
        this.prep.normals = 'ready';
        this.perf.normalsMs = message.ms;
        this.requestRender();
        break;
      case 'edges':
        this.edgeSegments = message.segments;
        this.edgeSegmentOfTriangle = message.edgeSegment;
        this.prep.edges = 'ready';
        this.perf.edgesMs = message.ms;
        this.syncDisplayMode();
        break;
      case 'bvh':
        this.bvh = MeshBVH.deserialize(message.bvh as unknown as Parameters<typeof MeshBVH.deserialize>[0], this.geometry, { setIndex: false });
        this.prep.bvh = 'ready';
        this.perf.bvhMs = message.ms;
        this.stopWorker();
        break;
      case 'error':
        this.prep[message.stage] = 'failed';
        if (message.stage === 'normals') {
          this.prep.edges = 'failed';
        }
        break;
      default: {
        const exhaustive: never = message;
        throw new Error(`Unknown prep message ${JSON.stringify(exhaustive)}`);
      }
    }
    this.callbacks.onPrepState({ ...this.prep });
    this.callbacks.onPerf({ ...this.perf });
  }

  /* ------------------------------------------------------------ render */

  requestRender(): void {
    if (this.frameRequested || this.disposed) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.renderNow();
    });
  }

  private renderNow(): void {
    if (this.disposed) return;
    if (this.cut.kind !== 'none') this.updateCap();
    const renderStart = performance.now();
    this.renderer.render(this.stage.scene, this.camera);
    if (this.perf.firstRenderMs === null) this.perf.firstRenderMs = performance.now() - renderStart;
    this.labelRenderer.render(this.stage.scene, this.camera);
    if (this.perf.firstFrameMs === null) {
      this.perf.firstFrameMs = performance.now() - this.started;
      this.callbacks.onPerf({ ...this.perf });
    }
  }

  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.labelRenderer.setSize(width, height);
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
    this.updateOrthographicFrustum();
    this.requestRender();
  }

  private updateOrthographicFrustum(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const aspect = width / height;
    const halfHeight = orthographicHalfHeight(this.frameRadius(), aspect);
    this.orthographic.left = -halfHeight * aspect;
    this.orthographic.right = halfHeight * aspect;
    this.orthographic.top = halfHeight;
    this.orthographic.bottom = -halfHeight;
    this.orthographic.updateProjectionMatrix();
  }

  /* -------------------------------------------------------------- look */

  setColors(colors: StageColors): void {
    this.colors = colors;
    this.stage.applyColors(colors);
    this.measureLineMaterial.color = new Color().setStyle(colors.accent, SRGBColorSpace);
    this.measurePointMaterial.color = new Color().setStyle(colors.accent, SRGBColorSpace);
    this.updateCapLook();
    this.refreshShadow();
  }

  setLook(look: MaterialLook): void {
    this.look = look;
    this.material.roughness = look.roughness;
    this.material.clearcoat = look.clearcoat;
    this.material.clearcoatRoughness = look.clearcoatRoughness;
    if (!this.highlightActive) this.material.color = new Color().setStyle(look.color, SRGBColorSpace);
    // edges and wireframe contrast with the part, not with the stage
    const partColor = new Color().setStyle(look.color, SRGBColorSpace);
    const lineColor = partColor.r * 0.2126 + partColor.g * 0.7152 + partColor.b * 0.0722 < 0.25 ? '#d7dbdf' : '#1f2328';
    this.edgeMaterial.color = new Color().setStyle(lineColor, SRGBColorSpace);
    this.wireMaterial.color = new Color().setStyle(lineColor, SRGBColorSpace);
    this.updateCapLook();
    this.requestRender();
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.syncDisplayMode();
  }

  private syncDisplayMode(): void {
    const mode = this.displayMode;
    const transparent = mode === 'wire' || mode === 'xray';
    this.material.transparent = transparent;
    this.material.opacity = mode === 'wire' ? 0.2 : mode === 'xray' ? 0.25 : 1;
    this.material.depthWrite = mode !== 'xray';
    this.material.side = mode === 'xray' ? DoubleSide : FrontSide;
    this.material.needsUpdate = true;
    this.wireMesh.visible = mode === 'wire';
    const wantEdges = mode === 'edges' || mode === 'xray';
    if (wantEdges && !this.edges && this.edgeSegments) {
      const edgeGeometry = new BufferGeometry();
      edgeGeometry.setAttribute('position', new Float32BufferAttribute(this.edgeSegments, 3));
      this.edges = new LineSegments(edgeGeometry, this.edgeMaterial);
      this.edges.renderOrder = 2;
      this.mesh.add(this.edges);
    }
    if (this.edges) this.edges.visible = wantEdges;
    this.syncClipping();
    this.requestRender();
  }

  /* ------------------------------------------------------------- heatmap */

  setHighlight(flags: Uint16Array | null, layers: readonly HeatLayer[], palette: HeatmapPalette): number {
    const active = Boolean(flags && flags.length === this.triangles && layers.length > 0);
    if (active && flags) {
      const colorAttribute = this.geometry.getAttribute('color') as BufferAttribute | undefined;
      const patternAttribute = this.geometry.getAttribute('aPattern') as BufferAttribute | undefined;
      const target =
        colorAttribute && patternAttribute
          ? { colors: colorAttribute.array as Uint8Array, pattern: patternAttribute.array as Uint8Array }
          : undefined;
      const result = fillHeatmap(flags, layers, palette, target);
      if (!colorAttribute || colorAttribute.array !== result.colors) {
        this.geometry.setAttribute('color', new BufferAttribute(result.colors, 3, true));
        this.geometry.setAttribute('aPattern', new BufferAttribute(result.pattern, 1, true));
      } else {
        colorAttribute.needsUpdate = true;
        if (patternAttribute) patternAttribute.needsUpdate = true;
      }
      this.material.vertexColors = true;
      this.material.color = new Color(0xffffff);
      this.material.defines = { ...this.material.defines, USE_PATTERN: '' };
      this.highlightActive = true;
      this.material.needsUpdate = true;
      this.requestRender();
      return result.counts.critical + result.counts.hint;
    }
    if (this.highlightActive) {
      this.material.vertexColors = false;
      const defines = { ...this.material.defines };
      delete defines.USE_PATTERN;
      this.material.defines = defines;
      this.highlightActive = false;
      if (this.look) this.material.color = new Color().setStyle(this.look.color, SRGBColorSpace);
      this.material.needsUpdate = true;
      this.requestRender();
    }
    return 0;
  }

  /**
   * Moves the camera to the flagged region (keeps the view direction). Only
   * when the region is clearly smaller than the part; otherwise auto-frame.
   */
  focusFlagged(flags: Uint16Array, mask: number): void {
    if (flags.length !== this.triangles) return;
    const positions = this.geometry.getAttribute('position').array as Float32Array;
    const box = new Box3();
    const point = new Vector3();
    let count = 0;
    for (let t = 0; t < this.triangles; t += 1) {
      if ((flags[t] & mask) === 0) continue;
      count += 1;
      for (let k = 0; k < 3; k += 1) {
        const o = t * 9 + k * 3;
        box.expandByPoint(point.set(positions[o], positions[o + 1], positions[o + 2]));
      }
    }
    if (count === 0) return;
    box.applyMatrix4(this.mesh.matrixWorld);
    const size = box.getSize(new Vector3());
    const regionRadius = Math.max(boxRadius([size.x, size.y, size.z]), this.frameRadius() * 0.35);
    if (regionRadius >= this.frameRadius() * 0.8) {
      this.frameCamera(true);
      return;
    }
    const dir = this.perspective.position.clone().sub(this.controls.target).normalize();
    const aspect = this.perspective.aspect > 0 ? this.perspective.aspect : 1;
    const distance = perspectiveFrameDistance(regionRadius, PERSPECTIVE_FOV, aspect);
    const target = box.getCenter(new Vector3());
    this.moveCamera(target.clone().add(dir.multiplyScalar(distance)), target, true);
  }

  /* -------------------------------------------------------------- pose */

  /** Row-major 3×3 rotation into the print pose (null = as loaded). */
  setPose(matrix: readonly number[] | null, animate: boolean): void {
    const same =
      (matrix === null && this.poseMatrix === null) ||
      (matrix !== null && this.poseMatrix !== null && matrix.every((value, index) => value === this.poseMatrix?.[index]));
    if (same) return;
    const from = this.mesh.quaternion.clone();
    const to = new Quaternion().setFromRotationMatrix(this.rotationMatrix(matrix));
    this.poseMatrix = matrix;
    if (!animate || this.options.reducedMotion) {
      this.applyPose(matrix);
      this.frameCamera(false);
      return;
    }
    this.cancelAnimation();
    const started = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / TRANSITION_MS);
      this.mesh.quaternion.slerpQuaternions(from, to, easeOut(t));
      this.seatOnPlate();
      this.renderNow();
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        this.animation = null;
        this.applyPose(matrix);
        this.frameCamera(true);
      }
    };
    frame = requestAnimationFrame(step);
    this.animation = { cancel: () => cancelAnimationFrame(frame) };
  }

  private rotationMatrix(matrix: readonly number[] | null): Matrix4 {
    const rotation = new Matrix4();
    if (matrix) {
      const m = matrix;
      rotation.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    }
    return rotation;
  }

  private seatOnPlate(): Box3 {
    this.mesh.position.set(0, 0, 0);
    this.mesh.updateMatrixWorld(true);
    const box = this.worldBox();
    this.mesh.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
    this.mesh.updateMatrixWorld(true);
    return this.worldBox();
  }

  /** World bounding box from the geometry box (rotation is an axis permutation or a slerp step). */
  private worldBox(): Box3 {
    const local = this.geometry.boundingBox ?? new Box3();
    return local.clone().applyMatrix4(this.mesh.matrixWorld);
  }

  private applyPose(matrix: readonly number[] | null): void {
    this.mesh.setRotationFromMatrix(this.rotationMatrix(matrix));
    const box = this.seatOnPlate();
    const size: [number, number, number] = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z];
    this.callbacks.onPoseSize(size);
    this.stage.setDimensions(
      { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] },
      oversizeAxes(size, this.options.buildVolumeMm),
      AXIS_LABEL,
    );
    this.stage.setDimensionsVisible(this.dimensionsVisible);
    this.updatePlate(size);
    this.stage.setKeyLight(boxRadius(size));
    this.clearMeasurements(false);
    if (this.cut.kind !== 'none') this.setCut(this.cut);
    this.refreshShadow();
  }

  private updatePlate(size: [number, number, number]): void {
    if (this.inBuildVolume) {
      this.stage.setPlate([this.options.buildVolumeMm[0], this.options.buildVolumeMm[1]]);
    } else {
      const side = plateSizeFor([size[0], size[1]]);
      this.stage.setPlate([side, side]);
    }
  }

  private refreshShadow(): void {
    const box = this.worldBox();
    const size: [number, number] = [box.max.x - box.min.x, box.max.y - box.min.y];
    this.stage.renderContactShadow(size, box.max.z - box.min.z);
    this.requestRender();
  }

  /* ------------------------------------------------------------ camera */

  private frameRadius(): number {
    if (this.inBuildVolume) return boxRadius(this.options.buildVolumeMm);
    const box = this.worldBox();
    return boxRadius([box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]);
  }

  private frameTarget(): Vector3 {
    if (this.inBuildVolume) return new Vector3(0, 0, this.options.buildVolumeMm[2] / 2);
    const box = this.worldBox();
    return box.getCenter(new Vector3());
  }

  /** Auto-frame: bounding sphere fills 70 % of the stage; keeps the view direction unless one is given. */
  frameCamera(animate: boolean, direction?: readonly [number, number, number]): void {
    const target = this.frameTarget();
    const radius = this.frameRadius();
    const dir = direction
      ? new Vector3(direction[0], direction[1], direction[2]).normalize()
      : this.perspective.position.clone().sub(this.controls.target).normalize();
    if (!Number.isFinite(dir.x) || dir.lengthSq() === 0) dir.set(...directionFromAngles(DEFAULT_AZIMUTH_DEG, DEFAULT_ELEVATION_DEG));
    const aspect = this.perspective.aspect > 0 ? this.perspective.aspect : 1;
    const distance = perspectiveFrameDistance(radius, PERSPECTIVE_FOV, aspect);
    const position = target.clone().add(dir.multiplyScalar(distance));
    this.perspective.near = Math.max(0.05, distance / 500);
    this.perspective.far = distance * 20 + radius * 4;
    this.perspective.updateProjectionMatrix();
    this.orthographic.zoom = 1;
    this.updateOrthographicFrustum();
    this.moveCamera(position, target, animate);
  }

  private moveCamera(position: Vector3, target: Vector3, animate: boolean): void {
    this.cancelAnimation();
    const apply = (p: Vector3, t: Vector3) => {
      this.perspective.position.copy(p);
      // the orthographic camera shares position and target; its zoom handles the scale
      this.orthographic.position.copy(p);
      this.controls.target.copy(t);
      this.controls.update();
    };
    if (!animate || this.options.reducedMotion) {
      apply(position, target);
      this.requestRender();
      return;
    }
    const fromPosition = this.perspective.position.clone();
    const fromTarget = this.controls.target.clone();
    const started = performance.now();
    let frame = 0;
    const step = () => {
      const t = easeOut(Math.min(1, (performance.now() - started) / TRANSITION_MS));
      apply(fromPosition.clone().lerp(position, t), fromTarget.clone().lerp(target, t));
      this.renderNow();
      if (t < 1) frame = requestAnimationFrame(step);
      else this.animation = null;
    };
    frame = requestAnimationFrame(step);
    this.animation = { cancel: () => cancelAnimationFrame(frame) };
  }

  private cancelAnimation(): void {
    this.animation?.cancel();
    this.animation = null;
  }

  viewPreset(id: ViewPresetId): void {
    const preset = VIEW_PRESETS.find((entry) => entry.id === id);
    if (!preset) throw new Error(`Unknown view preset ${id}`);
    // straight top/bottom views stay just off the pole (Z-up orbit controls)
    const elevation = Math.max(-89.9, Math.min(89.9, preset.elevationDeg));
    this.frameCamera(true, directionFromAngles(preset.azimuthDeg, elevation));
    this.callbacks.onAnnounce(`Ansicht ${preset.label}`);
  }

  setOrthographic(on: boolean): void {
    const next = on ? this.orthographic : this.perspective;
    if (next === this.camera) return;
    this.orthographic.position.copy(this.perspective.position);
    this.camera = next;
    this.controls.object = next;
    this.updateOrthographicFrustum();
    this.controls.update();
    this.requestRender();
  }

  setInBuildVolume(on: boolean): void {
    this.inBuildVolume = on;
    this.stage.setBuildVolume(on ? this.options.buildVolumeMm : null);
    const box = this.worldBox();
    this.updatePlate([box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]);
    this.frameCamera(true);
  }

  setDimensionsVisible(visible: boolean): void {
    this.dimensionsVisible = visible;
    this.stage.setDimensionsVisible(visible);
    this.requestRender();
  }

  /** Keyboard orbit in degrees (azimuth right, elevation up). */
  orbitBy(azimuthDeg: number, elevationDeg: number): void {
    this.cancelAnimation();
    const offset = this.perspective.position.clone().sub(this.controls.target);
    const radius = offset.length();
    const azimuth = (Math.atan2(offset.x, -offset.y) * 180) / Math.PI + azimuthDeg;
    const elevation = Math.max(-89.9, Math.min(89.9, (Math.asin(offset.z / radius) * 180) / Math.PI + elevationDeg));
    const dir = directionFromAngles(azimuth, elevation);
    const position = this.controls.target.clone().add(new Vector3(dir[0], dir[1], dir[2]).multiplyScalar(radius));
    this.perspective.position.copy(position);
    this.orthographic.position.copy(position);
    this.controls.update();
    this.requestRender();
  }

  /** Keyboard pan as a fraction of the framed radius. */
  panBy(right: number, up: number): void {
    this.cancelAnimation();
    const radius = this.frameRadius();
    const camera = this.camera;
    const x = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(right * radius);
    const y = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(up * radius);
    const delta = x.add(y);
    this.perspective.position.add(delta);
    this.orthographic.position.copy(this.perspective.position);
    this.controls.target.add(delta);
    this.controls.update();
    this.requestRender();
  }

  zoomBy(factor: number): void {
    this.cancelAnimation();
    if (this.camera === this.orthographic) {
      this.orthographic.zoom = Math.max(0.05, Math.min(50, this.orthographic.zoom / factor));
      this.orthographic.updateProjectionMatrix();
    } else {
      const offset = this.perspective.position.clone().sub(this.controls.target).multiplyScalar(factor);
      this.perspective.position.copy(this.controls.target.clone().add(offset));
    }
    this.controls.update();
    this.requestRender();
  }

  /* --------------------------------------------------------------- cut */

  setCut(cut: CutTool): void {
    this.cut = cut;
    if (cut.kind === 'none') {
      this.stencilGroup.visible = false;
      this.cap.visible = false;
    } else {
      if (cut.kind === 'section') {
        const plane = sectionPlane(cut.axis, cut.offset, cut.flipped);
        this.clipPlane.normal.set(...plane.normal);
        this.clipPlane.constant = plane.constant;
      } else {
        // layers: keep z <= height above the plate
        this.clipPlane.normal.set(0, 0, -1);
        this.clipPlane.constant = cut.heightMm;
      }
      this.stencilGroup.visible = true;
      this.cap.visible = true;
      const radius = this.frameRadius();
      this.cap.scale.set(radius * 4, radius * 4, 1);
      this.updateCapLook();
    }
    this.syncClipping();
    this.requestRender();
  }

  private syncClipping(): void {
    const planes = this.cut.kind === 'none' ? null : [this.clipPlane];
    for (const material of [this.material, this.wireMaterial, this.edgeMaterial] as Material[]) {
      material.clippingPlanes = planes;
      material.needsUpdate = true;
    }
    // x-ray shows back faces, which would fill the stencil wrongly: no caps then
    this.stencilGroup.visible = planes !== null && this.displayMode !== 'xray';
    this.cap.visible = this.stencilGroup.visible;
  }

  /** Cap plane in the cut plane, centred on the part, facing the removed side. */
  private updateCap(): void {
    const normal = this.clipPlane.normal;
    this.clipPlane.projectPoint(this.frameTarget(), this.cap.position);
    this.cap.lookAt(this.cap.position.x - normal.x, this.cap.position.y - normal.y, this.cap.position.z - normal.z);
  }

  private updateCapLook(): void {
    if (!this.colors) return;
    if (this.cut.kind === 'layers') {
      this.capMaterial.map = null;
      this.capMaterial.color = new Color().setStyle(this.colors.accent, SRGBColorSpace);
    } else {
      this.hatchTexture?.dispose();
      this.hatchTexture = makeHatchTexture(this.colors.dimension, this.look?.color ?? '#c9cdd2');
      const radius = this.frameRadius();
      // hatch spacing about radius / 20 (like a drawing, independent of the part size)
      const repeat = Math.max(4, Math.round((radius * 4) / Math.max(1, radius / 20) / 2));
      this.hatchTexture.repeat.set(repeat, repeat);
      this.capMaterial.map = this.hatchTexture;
      this.capMaterial.color = new Color(0xffffff);
    }
    this.capMaterial.needsUpdate = true;
  }

  /* ----------------------------------------------------------- measure */

  setMeasureActive(active: boolean): void {
    this.measureActive = active;
    if (!active && this.pendingPoint) {
      this.pendingPoint = null;
      this.redrawMeasurements();
    }
    this.renderer.domElement.style.cursor = active ? 'crosshair' : '';
  }

  clearMeasurements(announce = true): void {
    this.measurements = [];
    this.pendingPoint = null;
    this.redrawMeasurements();
    if (announce) this.callbacks.onAnnounce('Messungen gelöscht');
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!this.measureActive || !down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pick(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  };

  private screenOf(point: Vector3, width: number, height: number): [number, number] {
    const p = point.clone().project(this.camera);
    return [((p.x + 1) / 2) * width, ((1 - p.y) / 2) * height];
  }

  private pick(x: number, y: number, width: number, height: number): void {
    const started = performance.now();
    const ndc = new Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
    const worldRay = new Ray();
    if (this.camera === this.orthographic) {
      worldRay.origin.set(ndc.x, ndc.y, -1).unproject(this.camera);
      worldRay.direction.set(0, 0, -1).transformDirection(this.camera.matrixWorld);
    } else {
      worldRay.origin.setFromMatrixPosition(this.camera.matrixWorld);
      worldRay.direction.set(ndc.x, ndc.y, 0.5).unproject(this.camera).sub(worldRay.origin).normalize();
    }
    const inverse = this.mesh.matrixWorld.clone().invert();
    const localRay = worldRay.clone().applyMatrix4(inverse);
    const cutActive = this.cut.kind !== 'none';
    let hit: Intersection | null = null;
    if (this.bvh) {
      const hits = cutActive ? this.bvh.raycast(localRay, DoubleSide) : [this.bvh.raycastFirst(localRay, DoubleSide)].filter(Boolean);
      for (const candidate of hits as Intersection[]) {
        const world = candidate.point.clone().applyMatrix4(this.mesh.matrixWorld);
        if (cutActive && this.clipPlane.distanceToPoint(world) < 0) continue;
        const distance = world.distanceTo(worldRay.origin);
        if (!hit || distance < hit.distance) hit = { ...candidate, point: world, distance };
      }
    } else {
      // BVH not ready yet: plain three.js raycast (slower on big meshes)
      const raycaster = new Raycaster(worldRay.origin, worldRay.direction);
      for (const candidate of raycaster.intersectObject(this.mesh, false)) {
        if (cutActive && this.clipPlane.distanceToPoint(candidate.point) < 0) continue;
        if (!hit || candidate.distance < hit.distance) hit = candidate;
      }
    }
    this.perf.lastPickMs = performance.now() - started;
    this.callbacks.onPerf({ ...this.perf });
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) {
      this.callbacks.onAnnounce('Kein Punkt am Bauteil getroffen');
      return;
    }
    const triangle = hit.faceIndex;
    const positions = this.geometry.getAttribute('position').array as Float32Array;
    const corners = [0, 1, 2].map((k) =>
      new Vector3(positions[triangle * 9 + k * 3], positions[triangle * 9 + k * 3 + 1], positions[triangle * 9 + k * 3 + 2]).applyMatrix4(this.mesh.matrixWorld),
    );
    const screen = corners.map((corner) => this.screenOf(corner, width, height));
    const snapped = snapToVertex(
      [x, y],
      corners.map((corner, k) => ({ world: [corner.x, corner.y, corner.z] as Vec3, screen: screen[k] })),
    );
    if (!snapped && this.edgeSegments && this.edgeSegmentOfTriangle && !this.pendingPoint) {
      for (let k = 0; k < 3; k += 1) {
        const segment = this.edgeSegmentOfTriangle[triangle * 3 + k];
        if (segment < 0) continue;
        if (pointSegmentDistance([x, y], screen[k], screen[(k + 1) % 3]) <= SNAP_RADIUS_PX) {
          this.endpointIndex ??= buildEndpointIndex(this.edgeSegments);
          const chain = chainCollinear(this.edgeSegments, segment, this.endpointIndex);
          const a = new Vector3(...chain.a).applyMatrix4(this.mesh.matrixWorld);
          const b = new Vector3(...chain.b).applyMatrix4(this.mesh.matrixWorld);
          this.addMeasurement(measureBetween([a.x, a.y, a.z], [b.x, b.y, b.z], 'edge'));
          return;
        }
      }
    }
    const point: Vec3 = snapped ? snapped.world : [hit.point.x, hit.point.y, hit.point.z];
    if (!this.pendingPoint) {
      this.pendingPoint = point;
      this.redrawMeasurements();
      this.callbacks.onAnnounce(snapped ? 'Erster Punkt auf Eckpunkt gesetzt, zweiten Punkt wählen' : 'Erster Punkt gesetzt, zweiten Punkt wählen');
      return;
    }
    const measurement = measureBetween(this.pendingPoint, point, 'points');
    this.pendingPoint = null;
    this.addMeasurement(measurement);
  }

  private addMeasurement(measurement: Measurement): void {
    this.measurements = [...this.measurements, measurement];
    this.redrawMeasurements();
    this.callbacks.onAnnounce(describeMeasurement(measurement));
  }

  private redrawMeasurements(): void {
    for (const child of [...this.measureGroup.children]) {
      this.measureGroup.remove(child);
      if (child instanceof LineSegments || child instanceof Points) child.geometry.dispose();
      if (child instanceof CSS2DObject) child.element.remove();
    }
    const points: number[] = [];
    const lines: number[] = [];
    this.measurements.forEach((measurement, index) => {
      lines.push(...measurement.a, ...measurement.b);
      points.push(...measurement.a, ...measurement.b);
      const element = document.createElement('div');
      element.className = 'viewer-measure-label';
      element.textContent = `${index + 1}: ${describeMeasurement(measurement).split(' · ')[0].replace(/^(Abstand|Kante) /, '')}`;
      const label = new CSS2DObject(element);
      label.position.set((measurement.a[0] + measurement.b[0]) / 2, (measurement.a[1] + measurement.b[1]) / 2, (measurement.a[2] + measurement.b[2]) / 2);
      this.measureGroup.add(label);
    });
    if (this.pendingPoint) points.push(...this.pendingPoint);
    if (lines.length > 0) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(lines, 3));
      const object = new LineSegments(geometry, this.measureLineMaterial);
      object.renderOrder = 10;
      this.measureGroup.add(object);
    }
    if (points.length > 0) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
      const object = new Points(geometry, this.measurePointMaterial);
      object.renderOrder = 11;
      this.measureGroup.add(object);
    }
    this.callbacks.onMeasurements(this.measurements, this.pendingPoint !== null);
    this.requestRender();
  }

  /* ----------------------------------------------------------- snapshot */

  /** PNG of the current view (rendered once more, so no preserveDrawingBuffer is needed). */
  snapshot(): Promise<Blob | null> {
    this.renderer.render(this.stage.scene, this.camera);
    return new Promise((resolve) => this.renderer.domElement.toBlob((blob) => resolve(blob), 'image/png'));
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  get labelLayer(): HTMLElement {
    return this.labelRenderer.domElement;
  }

  /* ----------------------------------------------------------- dispose */

  dispose(): void {
    this.disposed = true;
    this.cancelAnimation();
    this.stopWorker();
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.clearMeasurements(false);
    this.edges?.geometry.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.wireMaterial.dispose();
    this.edgeMaterial.dispose();
    this.stencilGroup.children.forEach((child) => (child as Mesh).material instanceof MeshBasicMaterial && ((child as Mesh).material as MeshBasicMaterial).dispose());
    this.cap.geometry.dispose();
    this.capMaterial.dispose();
    this.hatchTexture?.dispose();
    this.measureLineMaterial.dispose();
    this.measurePointMaterial.dispose();
    this.stage.dispose();
    this.renderer.dispose();
    canvas.remove();
    this.labelRenderer.domElement.remove();
    this.bvh = null;
  }
}
