import { GeometryParseError, type TriangleMesh } from './types';

/*
 * STEP tessellation via occt-import-js (OpenCascade compiled to WebAssembly,
 * LGPL-2.1, loaded as an unmodified separate module). This file only contains
 * the conversion from the occt result to our triangle soup; loading the WASM
 * module is the caller's job so that the same code runs in the browser worker
 * and in Node tests.
 */

export interface OcctMesh {
  attributes: { position: { array: ArrayLike<number> } };
  index?: { array: ArrayLike<number> };
}

export interface OcctResult {
  success: boolean;
  meshes: OcctMesh[];
}

export interface OcctTriangulationParams {
  linearUnit: 'millimeter';
  linearDeflectionType: 'bounding_box_ratio';
  linearDeflection: number;
  angularDeflection: number;
}

export interface OcctModule {
  ReadStepFile(content: Uint8Array, params: OcctTriangulationParams): OcctResult;
}

/**
 * Explicit triangulation settings. The chord tolerance of 0.1 % of the bounding
 * box keeps curved surfaces within a volume error far below the price range
 * width while staying fast for assemblies.
 */
export const STEP_TRIANGULATION: OcctTriangulationParams = {
  linearUnit: 'millimeter',
  linearDeflectionType: 'bounding_box_ratio',
  linearDeflection: 0.001,
  angularDeflection: 0.5,
};

export function occtResultToMesh(result: OcctResult): TriangleMesh {
  if (!result.success) {
    throw new GeometryParseError('STEP-Datei konnte nicht gelesen werden (ungültig oder beschädigt).');
  }
  let triangleCount = 0;
  for (const mesh of result.meshes) {
    const vertexCount = mesh.attributes.position.array.length / 3;
    triangleCount += mesh.index ? mesh.index.array.length / 3 : vertexCount / 3;
  }
  if (triangleCount === 0) {
    throw new GeometryParseError('STEP-Datei enthält keine Volumenkörper oder Flächen.');
  }

  const positions = new Float32Array(triangleCount * 9);
  let p = 0;
  for (const mesh of result.meshes) {
    const vertices = mesh.attributes.position.array;
    const vertexCount = vertices.length / 3;
    if (mesh.index) {
      const index = mesh.index.array;
      for (let i = 0; i < index.length; i += 1) {
        const v = index[i];
        if (v < 0 || v >= vertexCount) {
          throw new GeometryParseError('STEP: Dreiecks-Index außerhalb des Bereichs.');
        }
        positions[p] = vertices[v * 3];
        positions[p + 1] = vertices[v * 3 + 1];
        positions[p + 2] = vertices[v * 3 + 2];
        p += 3;
      }
    } else {
      for (let i = 0; i < vertices.length; i += 1) {
        positions[p] = vertices[i];
        p += 1;
      }
    }
  }
  return { positions, triangleCount };
}

export function parseStepWith(occt: OcctModule, buffer: ArrayBuffer): TriangleMesh {
  if (buffer.byteLength === 0) {
    throw new GeometryParseError('Die Datei ist leer.');
  }
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(64, buffer.byteLength)));
  if (!head.trimStart().startsWith('ISO-10303-21')) {
    throw new GeometryParseError('Keine gültige STEP-Datei (ISO-10303-21-Kopf fehlt).');
  }
  return occtResultToMesh(occt.ReadStepFile(new Uint8Array(buffer), STEP_TRIANGULATION));
}
