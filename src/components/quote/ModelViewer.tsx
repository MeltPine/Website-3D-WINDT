import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { HighlightSpec, HighlightTone } from '../../lib/printcheck/evaluate';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import { useTheme, type ResolvedTheme } from '../../lib/theme';
import { trackEvent } from '../../lib/tracking';

/*
 * Lazy-loaded three.js preview (this module and three.js are only fetched
 * once a model has been analysed). Renders on demand instead of a permanent
 * animation loop. Z is up, the part sits centred on the build plate of the
 * largest machine, whose build volume is drawn as a wireframe.
 *
 * Printability findings are shown by colouring triangles (vertex colours on
 * the non-indexed geometry, updated in place) and, for pose-dependent
 * findings, by turning the part into the recommended print pose.
 */

export interface ViewerHighlight {
  flags: Uint16Array;
  spec: HighlightSpec;
}

interface ModelViewerProps {
  positions: Float32Array;
  /** Accessible description, e.g. file name and dimensions. */
  label: string;
  highlight?: ViewerHighlight | null;
  /** Row-major 3×3 rotation into the print pose (null = as loaded). */
  poseMatrix?: readonly number[] | null;
}

interface Palette {
  background: number;
  grid: number;
  volume: number;
  part: number;
  neutral: [number, number, number];
  tones: Record<HighlightTone, [number, number, number]>;
}

/* Status colours with a label in the legend; lighter tones on the dark background. */
const PALETTES: Record<ResolvedTheme, Palette> = {
  light: {
    background: 0xf1f5f9,
    grid: 0xb6c2d1,
    volume: 0x0f766e,
    part: 0x0f766e,
    neutral: [203, 213, 225],
    tones: { critical: [220, 38, 38], hint: [217, 119, 6] },
  },
  dark: {
    background: 0x0f172a,
    grid: 0x3b4a5f,
    volume: 0x2dd4bf,
    part: 0x14b8a6,
    neutral: [100, 116, 139],
    tones: { critical: [248, 113, 113], hint: [251, 191, 36] },
  },
};

interface SceneHandle {
  mesh: Mesh;
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  scene: Scene;
  grid: GridHelper;
  volumeMaterial: LineBasicMaterial;
  controls: OrbitControls;
  render: () => void;
}

let viewerLoadTracked = false;

const ModelViewer = ({ positions, label, highlight = null, poseMatrix = null }: ModelViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const palette = PALETTES[resolvedTheme];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return undefined;
    }
    if (!viewerLoadTracked) {
      viewerLoadTracked = true;
      trackEvent('quote_viewer_loaded', { form: 'quote' });
    }

    const [buildX, buildY, buildZ] = PRICING_CONFIG.buildVolumeMm;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0x99a3b0, 2.2));
    const keyLight = new DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1, -1.5, 2);
    scene.add(keyLight);

    // white vertex colours: the theme colour is applied through the material
    const grid = new GridHelper(Math.max(buildX, buildY), 14, 0xffffff, 0xffffff);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    const volumeGeometry = new BoxGeometry(buildX, buildY, buildZ);
    const volumeEdgesGeometry = new EdgesGeometry(volumeGeometry);
    const volumeMaterial = new LineBasicMaterial({ transparent: true, opacity: 0.3 });
    const volumeEdges = new LineSegments(volumeEdgesGeometry, volumeMaterial);
    volumeEdges.position.set(0, 0, buildZ / 2);
    scene.add(volumeEdges);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const material = new MeshStandardMaterial({
      metalness: 0.05,
      roughness: 0.55,
      flatShading: positions.length / 9 < 150_000,
    });
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const camera = new PerspectiveCamera(40, 1, 0.1, 20_000);
    camera.up.set(0, 0, 1);
    const box = geometry.boundingBox;
    const radius = box ? Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z, 1) : 50;
    const distance = Math.max(80, radius * 2.2);
    camera.position.set(distance, -distance * 0.85, distance * 0.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;

    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);

    handleRef.current = { mesh, geometry, material, scene, grid, volumeMaterial, controls, render };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    return () => {
      handleRef.current = null;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      volumeGeometry.dispose();
      volumeEdgesGeometry.dispose();
      volumeMaterial.dispose();
      grid.geometry.dispose();
      (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach((entry) => entry.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [positions]);

  // Pose: rotate into the print pose and re-seat the part on the plate.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const { mesh, controls, render } = handle;
    const rotation = new Matrix4();
    if (poseMatrix) {
      const m = poseMatrix;
      rotation.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    }
    mesh.position.set(0, 0, 0);
    mesh.setRotationFromMatrix(rotation);
    mesh.updateMatrixWorld(true);
    const box = new Box3().setFromObject(mesh);
    mesh.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
    controls.target.set(0, 0, (box.max.z - box.min.z) / 2);
    controls.update();
    render();
  }, [positions, poseMatrix]);

  // Colours: theme palette plus the active finding's triangles.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const { geometry, material, scene, grid, volumeMaterial, render } = handle;
    scene.background = new Color(palette.background);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((entry) => {
      (entry as LineBasicMaterial).color = new Color(palette.grid);
    });
    volumeMaterial.color = new Color(palette.volume);

    const triangleCount = positions.length / 9;
    if (highlight && highlight.flags.length === triangleCount && highlight.spec.layers.length > 0) {
      let colors = geometry.getAttribute('color') as BufferAttribute | undefined;
      if (!colors || colors.count !== triangleCount * 3) {
        colors = new BufferAttribute(new Uint8Array(triangleCount * 9), 3, true);
        geometry.setAttribute('color', colors);
      }
      const array = colors.array as Uint8Array;
      const { flags, spec } = highlight;
      for (let t = 0; t < triangleCount; t += 1) {
        let rgb = palette.neutral;
        const f = flags[t];
        if (f !== 0) {
          for (const layer of spec.layers) {
            if (f & layer.mask) {
              rgb = palette.tones[layer.tone];
              break;
            }
          }
        }
        const o = t * 9;
        for (let v = 0; v < 3; v += 1) {
          array[o + v * 3] = rgb[0];
          array[o + v * 3 + 1] = rgb[1];
          array[o + v * 3 + 2] = rgb[2];
        }
      }
      colors.needsUpdate = true;
      material.vertexColors = true;
      material.color = new Color(0xffffff);
    } else {
      material.vertexColors = false;
      material.color = new Color(palette.part);
    }
    material.needsUpdate = true;
    render();
  }, [positions, highlight, palette]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-600">
        Die 3D-Vorschau benötigt WebGL, das in diesem Browser nicht verfügbar ist. Maße, Richtpreis und
        Druckbarkeits-Check werden trotzdem berechnet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none"
      role="img"
      aria-label={`3D-Vorschau: ${label}. Mit Maus oder Finger drehen und zoomen.`}
    />
  );
};

export default ModelViewer;
