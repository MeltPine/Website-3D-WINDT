/// <reference lib="webworker" />
import { BufferAttribute, BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { buildAdjacency, creasedNormalsFrom, featureEdgesFrom, type Adjacency } from './normals';
import type { PrepMessage, PrepRequest, SerializedBvh } from './prepProtocol';

/*
 * Single-use worker: the viewer starts it per model and terminates it after
 * the last message (or when the model is closed). Plain JavaScript only, so
 * the site CSP (worker-src 'self') applies unchanged.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<PrepRequest>) => {
  const { positions, creaseDeg, buildBvh } = event.data;
  const post = (message: PrepMessage, transfer: Transferable[] = []) => scope.postMessage(message, transfer);
  let adjacency: Adjacency | null = null;
  let started = performance.now();
  try {
    adjacency = buildAdjacency(positions);
    const normals = creasedNormalsFrom(adjacency, creaseDeg);
    post({ type: 'normals', normals, ms: performance.now() - started }, [normals.buffer]);
  } catch (error) {
    post({ type: 'error', stage: 'normals', message: error instanceof Error ? error.message : String(error) });
  }
  if (adjacency) {
    started = performance.now();
    try {
      const edges = featureEdgesFrom(positions, adjacency, creaseDeg);
      post({ type: 'edges', segments: edges.segments, edgeSegment: edges.edgeSegment, ms: performance.now() - started }, [
        edges.segments.buffer,
        edges.edgeSegment.buffer,
      ]);
    } catch (error) {
      post({ type: 'error', stage: 'edges', message: error instanceof Error ? error.message : String(error) });
    }
  }
  adjacency = null;
  if (!buildBvh) return;
  started = performance.now();
  try {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const bvh = new MeshBVH(geometry, { indirect: true });
    const serialized = MeshBVH.serialize(bvh, { cloneBuffers: false }) as unknown as SerializedBvh;
    const transfer: Transferable[] = [...serialized.roots];
    if (serialized.indirectBuffer) transfer.push(serialized.indirectBuffer.buffer);
    post(
      { type: 'bvh', bvh: { version: serialized.version, roots: serialized.roots, indirectBuffer: serialized.indirectBuffer }, ms: performance.now() - started },
      transfer,
    );
  } catch (error) {
    post({ type: 'error', stage: 'bvh', message: error instanceof Error ? error.message : String(error) });
  }
};
