import { useEffect, useRef, useState } from 'react';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  GridHelper,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import { trackEvent } from '../../lib/tracking';

/*
 * Lazy-loaded three.js preview (this module and three.js are only fetched
 * once a model has been analysed). Renders on demand instead of a permanent
 * animation loop. Z is up, the part sits centred on the build plate of the
 * largest machine, whose build volume is drawn as a wireframe.
 */

interface ModelViewerProps {
  positions: Float32Array;
  /** Accessible description, e.g. file name and dimensions. */
  label: string;
}

let viewerLoadTracked = false;

const ModelViewer = ({ positions, label }: ModelViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

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
    scene.background = new Color(0xf1f5f9);
    scene.add(new HemisphereLight(0xffffff, 0x99a3b0, 2.2));
    const keyLight = new DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1, -1.5, 2);
    scene.add(keyLight);

    const grid = new GridHelper(Math.max(buildX, buildY), 14, 0x94a3b8, 0xcbd5e1);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
    const volumeGeometry = new BoxGeometry(buildX, buildY, buildZ);
    const volumeEdgesGeometry = new EdgesGeometry(volumeGeometry);
    const volumeMaterial = new LineBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.3 });
    const volumeEdges = new LineSegments(volumeEdgesGeometry, volumeMaterial);
    volumeEdges.position.set(0, 0, buildZ / 2);
    scene.add(volumeEdges);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const material = new MeshStandardMaterial({
      color: 0x0f766e,
      metalness: 0.05,
      roughness: 0.55,
      flatShading: positions.length / 9 < 150_000,
    });
    const mesh = new Mesh(geometry, material);
    let sizeZ = 0;
    let radius = 50;
    if (box) {
      const centerX = (box.min.x + box.max.x) / 2;
      const centerY = (box.min.y + box.max.y) / 2;
      mesh.position.set(-centerX, -centerY, -box.min.z);
      sizeZ = box.max.z - box.min.z;
      radius = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, sizeZ, 1);
    }
    scene.add(mesh);

    const camera = new PerspectiveCamera(40, 1, 0.1, 20_000);
    camera.up.set(0, 0, 1);
    const distance = Math.max(80, radius * 2.2);
    camera.position.set(distance, -distance * 0.85, distance * 0.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, sizeZ / 2);
    controls.enableDamping = false;

    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    controls.update();

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
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      volumeGeometry.dispose();
      volumeEdgesGeometry.dispose();
      volumeMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [positions]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-600">
        Die 3D-Vorschau benötigt WebGL, das in diesem Browser nicht verfügbar ist. Maße und Richtpreis
        werden trotzdem berechnet.
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
