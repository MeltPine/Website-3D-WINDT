import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  OrthographicCamera,
  PMREMGenerator,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { formatDimension } from './dimensions';

/*
 * Studio stage of the viewer: theme-matched background, build plate with a
 * 10/50 mm grid, image-based light from a locally generated RoomEnvironment
 * (no HDR download, CSP unchanged), one key light, a contact shadow that is
 * rendered once per pose/look change (not per frame), the build volume and
 * the bounding-box dimension callouts.
 *
 * Colours come from CSS variables of the `.tech` scope (src/index.css), so the
 * stage follows the theme without rebuilding the scene.
 */

export interface StageColors {
  top: string;
  bottom: string;
  plate: string;
  plateMinor: string;
  plateMajor: string;
  dimension: string;
  /** Dimension lines lie on the dark plate: light colour in both themes. */
  dimensionLine: string;
  accent: string;
  critical: string;
  lineStrong: string;
}

/** Used only if the viewer is rendered outside a `.tech` scope (explicit, light values). */
export const STAGE_COLOR_FALLBACK: StageColors = {
  top: '#eef0f2',
  bottom: '#f8f9fa',
  plate: '#3a3f45',
  plateMinor: '#4a5058',
  plateMajor: '#5d646d',
  dimension: '#0e1113',
  dimensionLine: '#e3e6e9',
  accent: '#0f766e',
  critical: '#b91c1c',
  lineStrong: '#9aa1a9',
};

const STAGE_VARS: Readonly<Record<keyof StageColors, string>> = {
  top: '--stage-top',
  bottom: '--stage-bottom',
  plate: '--stage-plate',
  plateMinor: '--stage-plate-minor',
  plateMajor: '--stage-plate-major',
  dimension: '--stage-dimension',
  dimensionLine: '--stage-dimension-line',
  accent: '--stage-accent',
  critical: '--status-crit',
  lineStrong: '--border-strong',
};

export function readStageColors(element: Element): StageColors {
  const style = getComputedStyle(element);
  const result = { ...STAGE_COLOR_FALLBACK };
  (Object.keys(STAGE_VARS) as Array<keyof StageColors>).forEach((key) => {
    const value = style.getPropertyValue(STAGE_VARS[key]).trim();
    if (value) result[key] = value;
  });
  return result;
}

function color(value: string): Color {
  const c = new Color();
  c.setStyle(value, SRGBColorSpace);
  return c;
}

/* ------------------------------------------------------------ background */

export function paintBackground(canvas: HTMLCanvasElement, colors: StageColors): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, colors.top);
  gradient.addColorStop(1, colors.bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

/* ----------------------------------------------------------------- plate */

const PLATE_TEXTURE_PX = 2048;

function paintPlate(canvas: HTMLCanvasElement, sizeMm: [number, number], colors: StageColors): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const [w, d] = sizeMm;
  const scale = PLATE_TEXTURE_PX / Math.max(w, d);
  canvas.width = Math.max(2, Math.round(w * scale));
  canvas.height = Math.max(2, Math.round(d * scale));
  context.fillStyle = colors.plate;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const drawLines = (stepMm: number, stroke: string, width: number) => {
    context.strokeStyle = stroke;
    context.lineWidth = width;
    context.beginPath();
    // lines through the plate centre (= world origin) so the grid is centred on the part
    for (let x = 0; x <= w / 2; x += stepMm) {
      for (const sx of x === 0 ? [0] : [x, -x]) {
        const px = (sx + w / 2) * scale;
        context.moveTo(px, 0);
        context.lineTo(px, canvas.height);
      }
    }
    for (let y = 0; y <= d / 2; y += stepMm) {
      for (const sy of y === 0 ? [0] : [y, -y]) {
        const py = (sy + d / 2) * scale;
        context.moveTo(0, py);
        context.lineTo(canvas.width, py);
      }
    }
    context.stroke();
  };
  drawLines(10, colors.plateMinor, Math.max(1, scale * 0.25));
  drawLines(50, colors.plateMajor, Math.max(1.5, scale * 0.5));
}

/* -------------------------------------------------------------- the stage */

export interface StageHandles {
  scene: Scene;
  plate: Mesh;
  buildVolume: Group;
  keyLight: DirectionalLight;
  shadowPlane: Mesh;
  dimensions: Group;
}

const SHADOW_RESOLUTION = 512;
const SHADOW_DARKNESS = 1.4;
const SHADOW_BLUR = 3.5;
const SHADOW_OPACITY = 0.55;

export class Stage {
  readonly scene = new Scene();

  private readonly backgroundCanvas = document.createElement('canvas');
  private readonly backgroundTexture: CanvasTexture;
  private readonly plateCanvas = document.createElement('canvas');
  private readonly plateTexture: CanvasTexture;
  private readonly plate: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly keyLight = new DirectionalLight(0xffffff, 1.6);
  private readonly environment: Texture;
  private readonly buildVolume = new Group();
  private readonly buildVolumeMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.6 });
  private readonly buildVolumeLabel: CSS2DObject;
  private readonly dimensions = new Group();
  private readonly dimensionMaterials = { normal: new LineBasicMaterial(), critical: new LineBasicMaterial() };

  // contact shadow
  private readonly shadowTarget = new WebGLRenderTarget(SHADOW_RESOLUTION, SHADOW_RESOLUTION);
  private readonly shadowBlurTarget = new WebGLRenderTarget(SHADOW_RESOLUTION, SHADOW_RESOLUTION);
  private readonly shadowCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly shadowPlane: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly blurPlane: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly depthMaterial = new MeshDepthMaterial();
  private readonly horizontalBlur = new ShaderMaterial({ ...HorizontalBlurShader, depthTest: false, side: DoubleSide });
  private readonly verticalBlur = new ShaderMaterial({ ...VerticalBlurShader, depthTest: false, side: DoubleSide });

  private plateSize: [number, number] = [100, 100];
  private colors: StageColors = STAGE_COLOR_FALLBACK;

  constructor(private readonly renderer: WebGLRenderer) {
    this.backgroundCanvas.width = 2;
    this.backgroundCanvas.height = 256;
    this.backgroundTexture = new CanvasTexture(this.backgroundCanvas);
    this.backgroundTexture.colorSpace = SRGBColorSpace;
    this.scene.background = this.backgroundTexture;

    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.55;
    // RoomEnvironment is Y-up; the viewer is Z-up
    this.scene.environmentRotation.set(Math.PI / 2, 0, 0);

    this.keyLight.position.set(-1, -0.6, 1.5);
    this.scene.add(this.keyLight, this.keyLight.target);

    this.plateTexture = new CanvasTexture(this.plateCanvas);
    this.plateTexture.colorSpace = SRGBColorSpace;
    this.plateTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.plate = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.plateTexture, toneMapped: false }));
    this.plate.renderOrder = -2;
    this.scene.add(this.plate);

    // contact shadow: mirrored in X because the shadow camera looks up from below
    this.shadowTarget.texture.generateMipmaps = false;
    this.shadowBlurTarget.texture.generateMipmaps = false;
    this.shadowPlane = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ map: this.shadowTarget.texture, transparent: true, opacity: SHADOW_OPACITY, depthWrite: false, side: DoubleSide }),
    );
    this.shadowPlane.scale.x = -1;
    this.shadowPlane.position.z = 0.02;
    this.shadowPlane.renderOrder = -1;
    this.scene.add(this.shadowPlane);
    this.blurPlane = new Mesh(new PlaneGeometry(1, 1), this.horizontalBlur);
    this.blurPlane.scale.x = -1;
    this.blurPlane.visible = false;
    this.shadowCamera.position.set(0, 0, 0);
    this.shadowCamera.up.set(0, 1, 0);
    this.shadowCamera.lookAt(0, 0, 1);
    this.shadowCamera.layers.set(1);
    this.depthMaterial.depthTest = false;
    this.depthMaterial.depthWrite = false;
    this.depthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = { value: SHADOW_DARKNESS };
      shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );',
      )}`;
    };

    const [bx, by, bz] = [1, 1, 1];
    const boxEdges = new LineSegments(new EdgesGeometry(new BoxGeometry(bx, by, bz)), this.buildVolumeMaterial);
    this.buildVolume.add(boxEdges);
    const label = document.createElement('div');
    label.className = 'viewer-volume-label';
    this.buildVolumeLabel = new CSS2DObject(label);
    this.buildVolume.add(this.buildVolumeLabel);
    this.buildVolume.visible = false;
    this.scene.add(this.buildVolume);
    this.scene.add(this.dimensions);
  }

  applyColors(colors: StageColors): void {
    this.colors = colors;
    paintBackground(this.backgroundCanvas, colors);
    this.backgroundTexture.needsUpdate = true;
    paintPlate(this.plateCanvas, this.plateSize, colors);
    this.plateTexture.needsUpdate = true;
    this.buildVolumeMaterial.color = color(colors.lineStrong);
    this.dimensionMaterials.normal.color = color(colors.dimensionLine);
    this.dimensionMaterials.critical.color = color(colors.critical);
  }

  /** Plate size in mm (footprint-based, or the full build plate). */
  setPlate(size: [number, number]): void {
    this.plateSize = size;
    this.plate.scale.set(size[0], size[1], 1);
    this.plate.position.set(0, 0, -0.05);
    paintPlate(this.plateCanvas, size, this.colors);
    this.plateTexture.dispose();
    this.plateTexture.needsUpdate = true;
  }

  setBuildVolume(size: readonly [number, number, number] | null): void {
    if (!size) {
      this.buildVolume.visible = false;
      return;
    }
    const [x, y, z] = size;
    this.buildVolume.children[0].scale.set(x, y, z);
    this.buildVolume.children[0].position.set(0, 0, z / 2);
    this.buildVolumeLabel.position.set(-x / 2, y / 2, z);
    this.buildVolumeLabel.element.textContent = `Bauraum ${x} × ${y} × ${z} mm`;
    this.buildVolume.visible = true;
  }

  /** Key light follows the part size so its shadow-free direction stays the same. */
  setKeyLight(radius: number): void {
    this.keyLight.position.set(-1 * radius * 3, -0.6 * radius * 3, 1.5 * radius * 3);
  }

  /**
   * Renders the contact shadow of the objects on layer 1 once into a texture
   * on the plate (call after pose/geometry changes, not per frame).
   */
  renderContactShadow(footprint: [number, number], heightMm: number): void {
    const size = Math.max(footprint[0], footprint[1]) * 1.6 + 10;
    this.shadowPlane.scale.set(-size, size, 1);
    this.blurPlane.scale.set(-size, size, 1);
    this.blurPlane.position.set(0, 0, 0.5);
    const half = size / 2;
    this.shadowCamera.left = -half;
    this.shadowCamera.right = half;
    this.shadowCamera.top = half;
    this.shadowCamera.bottom = -half;
    this.shadowCamera.near = 0;
    this.shadowCamera.far = Math.max(2, Math.min(heightMm, size * 0.35));
    this.shadowCamera.updateProjectionMatrix();

    const renderer = this.renderer;
    const previousTarget = renderer.getRenderTarget();
    const previousBackground = this.scene.background;
    const previousOverride = this.scene.overrideMaterial;
    const previousClearAlpha = renderer.getClearAlpha();
    const previousClipping = renderer.localClippingEnabled;
    this.scene.background = null;
    this.scene.overrideMaterial = this.depthMaterial;
    renderer.localClippingEnabled = false;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(this.shadowTarget);
    renderer.clear();
    renderer.render(this.scene, this.shadowCamera);
    this.scene.overrideMaterial = previousOverride;

    this.blurPlane.visible = true;
    const blurCamera = this.shadowCamera.clone();
    blurCamera.layers.enableAll();
    blurCamera.near = 0;
    blurCamera.far = 1;
    blurCamera.updateProjectionMatrix();
    for (const amount of [SHADOW_BLUR, SHADOW_BLUR * 0.4]) {
      this.blurPlane.material = this.horizontalBlur;
      this.horizontalBlur.uniforms.tDiffuse.value = this.shadowTarget.texture;
      this.horizontalBlur.uniforms.h.value = amount / 256;
      renderer.setRenderTarget(this.shadowBlurTarget);
      renderer.render(this.blurPlane, blurCamera);
      this.blurPlane.material = this.verticalBlur;
      this.verticalBlur.uniforms.tDiffuse.value = this.shadowBlurTarget.texture;
      this.verticalBlur.uniforms.v.value = amount / 256;
      renderer.setRenderTarget(this.shadowTarget);
      renderer.render(this.blurPlane, blurCamera);
    }
    this.blurPlane.visible = false;

    renderer.setRenderTarget(previousTarget);
    renderer.setClearAlpha(previousClearAlpha);
    renderer.localClippingEnabled = previousClipping;
    this.scene.background = previousBackground;
  }

  setShadowVisible(visible: boolean): void {
    this.shadowPlane.visible = visible;
  }

  /**
   * Dimension lines with arrow heads along X (front edge), Y (right edge) and
   * Z (front right corner), labels as DOM (CSS2D, sharp and selectable).
   */
  setDimensions(
    box: { min: [number, number, number]; max: [number, number, number] } | null,
    oversize: [boolean, boolean, boolean],
    labels: readonly string[],
  ): void {
    this.clearDimensions();
    if (!box) return;
    const { min, max } = box;
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const radius = Math.hypot(size[0], size[1], size[2]) / 2;
    const off = Math.max(4, radius * 0.12);
    const arrow = Math.max(1.5, radius * 0.035);
    const segments: Array<{ axis: 0 | 1 | 2; points: number[] }> = [];
    const push = (axis: 0 | 1 | 2, ...points: number[]) => segments.push({ axis, points });

    // X along the front edge, on the plate
    const yx = min[1] - off;
    push(0, min[0], min[1], 0, min[0], yx - off * 0.3, 0, max[0], min[1], 0, max[0], yx - off * 0.3, 0);
    push(0, min[0], yx, 0, max[0], yx, 0);
    push(0, min[0], yx, 0, min[0] + arrow, yx + arrow * 0.4, 0, min[0], yx, 0, min[0] + arrow, yx - arrow * 0.4, 0);
    push(0, max[0], yx, 0, max[0] - arrow, yx + arrow * 0.4, 0, max[0], yx, 0, max[0] - arrow, yx - arrow * 0.4, 0);
    // Y along the right edge, on the plate
    const xy = max[0] + off;
    push(1, max[0], min[1], 0, xy + off * 0.3, min[1], 0, max[0], max[1], 0, xy + off * 0.3, max[1], 0);
    push(1, xy, min[1], 0, xy, max[1], 0);
    push(1, xy, min[1], 0, xy + arrow * 0.4, min[1] + arrow, 0, xy, min[1], 0, xy - arrow * 0.4, min[1] + arrow, 0);
    push(1, xy, max[1], 0, xy + arrow * 0.4, max[1] - arrow, 0, xy, max[1], 0, xy - arrow * 0.4, max[1] - arrow, 0);
    // Z at the front right corner
    const zx = max[0] + off;
    const zy = min[1] - off;
    push(2, max[0], min[1], max[2], zx + off * 0.2, zy - off * 0.2, max[2]);
    push(2, zx, zy, 0, zx, zy, max[2]);
    push(2, zx, zy, 0, zx + arrow * 0.3, zy - arrow * 0.3, arrow, zx, zy, 0, zx - arrow * 0.3, zy + arrow * 0.3, arrow);
    push(2, zx, zy, max[2], zx + arrow * 0.3, zy - arrow * 0.3, max[2] - arrow, zx, zy, max[2], zx - arrow * 0.3, zy + arrow * 0.3, max[2] - arrow);

    for (const axis of [0, 1, 2] as const) {
      const points = segments.filter((segment) => segment.axis === axis).flatMap((segment) => segment.points);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
      const lines = new LineSegments(geometry, oversize[axis] ? this.dimensionMaterials.critical : this.dimensionMaterials.normal);
      lines.renderOrder = 5;
      this.dimensions.add(lines);
      const element = document.createElement('div');
      element.className = `viewer-dimension${oversize[axis] ? ' viewer-dimension--critical' : ''}`;
      element.textContent = formatDimension(size[axis]);
      element.setAttribute('aria-label', `${labels[axis]} ${formatDimension(size[axis])} mm${oversize[axis] ? ', größer als der Bauraum' : ''}`);
      const label = new CSS2DObject(element);
      if (axis === 0) label.position.set((min[0] + max[0]) / 2, yx, 0);
      if (axis === 1) label.position.set(xy, (min[1] + max[1]) / 2, 0);
      if (axis === 2) label.position.set(zx, zy, max[2] / 2);
      this.dimensions.add(label);
    }
  }

  setDimensionsVisible(visible: boolean): void {
    this.dimensions.visible = visible;
    this.dimensions.traverse((object: Object3D) => {
      if (object instanceof CSS2DObject) object.visible = visible;
    });
  }

  private clearDimensions(): void {
    for (const child of [...this.dimensions.children]) {
      this.dimensions.remove(child);
      if (child instanceof LineSegments) child.geometry.dispose();
      if (child instanceof CSS2DObject) child.element.remove();
    }
  }

  get handles(): StageHandles {
    return {
      scene: this.scene,
      plate: this.plate,
      buildVolume: this.buildVolume,
      keyLight: this.keyLight,
      shadowPlane: this.shadowPlane,
      dimensions: this.dimensions,
    };
  }

  dispose(): void {
    this.clearDimensions();
    this.buildVolumeLabel.element.remove();
    this.backgroundTexture.dispose();
    this.plateTexture.dispose();
    this.plate.geometry.dispose();
    this.plate.material.dispose();
    this.environment.dispose();
    this.shadowTarget.dispose();
    this.shadowBlurTarget.dispose();
    this.shadowPlane.geometry.dispose();
    this.shadowPlane.material.dispose();
    this.blurPlane.geometry.dispose();
    this.horizontalBlur.dispose();
    this.verticalBlur.dispose();
    this.depthMaterial.dispose();
    this.buildVolumeMaterial.dispose();
    this.dimensionMaterials.normal.dispose();
    this.dimensionMaterials.critical.dispose();
    this.buildVolume.traverse((object) => {
      if (object instanceof LineSegments) object.geometry.dispose();
    });
  }
}
