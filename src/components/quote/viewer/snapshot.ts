import type { ViewCapture } from './ViewerCore';

/*
 * PNG of the current view with a title strip (file, dimensions, material,
 * date, reference, logo), composed locally on a 2D canvas. Nothing leaves
 * the browser.
 */

export interface SnapshotTitle {
  file: string;
  dimensions: string;
  material: string;
  reference: string;
  date: string;
}

export const LOGO_PNG_PATH = '/logo/3dw-logo-mark.png';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed to load: ${src}`));
    image.src = src;
  });
}

export async function composeSnapshot(capture: ViewCapture, title: SnapshotTitle, scale: number): Promise<Blob> {
  const view = await loadImage(capture.dataUrl);
  const logo = await loadImage(LOGO_PNG_PATH).catch(() => null);
  const strip = Math.round(64 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = capture.widthPx;
  canvas.height = capture.heightPx + strip;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas not available.');
  context.drawImage(view, 0, 0);
  const top = capture.heightPx;
  context.fillStyle = '#ffffff';
  context.fillRect(0, top, canvas.width, strip);
  context.fillStyle = '#0e1113';
  context.fillRect(0, top, canvas.width, Math.max(1, Math.round(scale)));
  let x = Math.round(12 * scale);
  if (logo) {
    const size = strip - Math.round(20 * scale);
    context.drawImage(logo, x, top + Math.round(10 * scale), (logo.width / logo.height) * size, size);
    x += (logo.width / logo.height) * size + Math.round(12 * scale);
  }
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#0e1113';
  context.font = `500 ${Math.round(14 * scale)}px "IBM Plex Sans", system-ui, sans-serif`;
  context.fillText(title.file, x, top + Math.round(26 * scale));
  context.font = `400 ${Math.round(12 * scale)}px "IBM Plex Mono", ui-monospace, monospace`;
  context.fillText(`${title.dimensions} · ${title.material}`, x, top + Math.round(46 * scale));
  context.textAlign = 'right';
  const right = canvas.width - Math.round(12 * scale);
  context.fillText(`RP-ID ${title.reference || '–'} · ${title.date}`, right, top + Math.round(26 * scale));
  context.fillStyle = '#5a626b';
  context.font = `400 ${Math.round(11 * scale)}px "IBM Plex Sans", system-ui, sans-serif`;
  context.fillText('3D-WINDT · lokal erzeugt, Datei wurde nicht übertragen', right, top + Math.round(46 * scale));
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed.'))), 'image/png'),
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
