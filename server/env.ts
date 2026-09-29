/*
 * Platform boundary for the Cloudflare Pages Functions in `functions/`.
 *
 * The server modules never import Cloudflare types directly: they depend on
 * the narrow structural interfaces below (the subset of the R2 and KV binding
 * APIs actually used). Real bindings satisfy them at runtime; tests pass
 * in-memory fakes (tests/helpers/cloudflare.ts). This keeps `tsc -b` free of
 * @cloudflare/workers-types, whose globals clash with the DOM and Node libs.
 */

/** String configuration (vars + secrets). Bindings are filtered out. */
export type Env = Readonly<Record<string, string | undefined>>;

export interface R2ObjectLike {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBodyLike extends R2ObjectLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

export interface R2UploadedPartLike {
  partNumber: number;
  etag: string;
}

export interface R2MultipartUploadLike {
  readonly key: string;
  readonly uploadId: string;
  uploadPart(partNumber: number, value: ArrayBuffer | Uint8Array): Promise<R2UploadedPartLike>;
  complete(parts: R2UploadedPartLike[]): Promise<R2ObjectLike>;
  abort(): Promise<void>;
}

export interface R2PutOptionsLike {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

export interface R2BucketLike {
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBodyLike | null>;
  put(key: string, value: ArrayBuffer | Uint8Array | string, options?: R2PutOptionsLike): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
  createMultipartUpload(key: string, options?: R2PutOptionsLike): Promise<R2MultipartUploadLike>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUploadLike;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  /** `expirationTtl` is in seconds and must be >= 60 on Cloudflare KV. */
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Bindings declared in wrangler.toml. */
export interface Bindings {
  UPLOADS: R2BucketLike;
  STATE: KVNamespaceLike;
}

/** What Pages passes as `context.env`: bindings plus string vars/secrets. */
export type PagesEnv = Bindings & Record<string, unknown>;

/** The subset of the Pages Functions `EventContext` used by the adapters. */
export interface PagesContext {
  request: Request;
  env: PagesEnv;
  waitUntil(promise: Promise<unknown>): void;
}

export type PagesHandler = (context: PagesContext) => Response | Promise<Response>;

/** Extracts the string vars/secrets from the Pages env (drops bindings). */
export function stringEnv(env: Record<string, unknown>): Env {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Fails loudly when a binding is missing (wrong wrangler.toml / dashboard
 * setup) instead of crashing later with an opaque TypeError.
 */
export function requireBindings(env: Record<string, unknown>): Bindings {
  const uploads = env.UPLOADS as R2BucketLike | undefined;
  const state = env.STATE as KVNamespaceLike | undefined;
  if (!uploads || typeof uploads.put !== 'function') {
    throw new Error('R2 binding UPLOADS is not configured.');
  }
  if (!state || typeof state.get !== 'function') {
    throw new Error('KV binding STATE is not configured.');
  }
  return { UPLOADS: uploads, STATE: state };
}
