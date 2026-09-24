import type { ModelFormat } from './types';

const EXTENSION_TO_FORMAT: Readonly<Record<string, ModelFormat>> = {
  stl: 'stl',
  obj: 'obj',
  '3mf': '3mf',
  step: 'step',
  stp: 'step',
};

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) {
    return '';
  }
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Maps a file name to a model format that the in-browser analysis supports.
 * Returns null for files that can be uploaded but not analysed (e.g. SVG).
 */
export function detectModelFormat(fileName: string): ModelFormat | null {
  return EXTENSION_TO_FORMAT[fileExtension(fileName)] ?? null;
}

export const MODEL_FORMAT_LABEL: Readonly<Record<ModelFormat, string>> = {
  stl: 'STL',
  obj: 'OBJ',
  '3mf': '3MF',
  step: 'STEP',
};
