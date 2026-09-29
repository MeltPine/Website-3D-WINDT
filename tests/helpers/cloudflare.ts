import { createHash, randomUUID } from 'node:crypto';
import type {
  KVNamespaceLike,
  R2BucketLike,
  R2MultipartUploadLike,
  R2ObjectBodyLike,
  R2ObjectLike,
  R2PutOptionsLike,
  R2UploadedPartLike,
} from '../../server/env';

/*
 * In-memory stand-ins for the R2 and KV bindings with the semantics the
 * server code relies on, including R2's multipart rules (every part except
 * the last has the same size and at least `minPartSize` bytes).
 */

interface StoredObject {
  data: Uint8Array;
  etag: string;
  uploaded: Date;
  customMetadata?: Record<string, string>;
}

function toBytes(value: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
}

function md5(data: Uint8Array): string {
  return createHash('md5').update(data).digest('hex');
}

function describe(key: string, object: StoredObject): R2ObjectLike {
  return {
    key,
    size: object.data.byteLength,
    etag: object.etag,
    uploaded: object.uploaded,
    customMetadata: object.customMetadata,
  };
}

export class MemoryR2 implements R2BucketLike {
  readonly objects = new Map<string, StoredObject>();
  readonly multipart = new Map<string, { key: string; parts: Map<number, { data: Uint8Array; etag: string }> }>();
  /** Set to make every put() fail (storage outage). */
  failPuts = false;

  constructor(private readonly minPartSize = 5 * 1024 * 1024) {}

  async head(key: string) {
    const object = this.objects.get(key);
    return object ? describe(key, object) : null;
  }

  async get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBodyLike | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    const data = options?.range
      ? object.data.slice(options.range.offset, options.range.offset + options.range.length)
      : object.data;
    return {
      ...describe(key, object),
      arrayBuffer: async () => data.slice().buffer,
      text: async () => new TextDecoder().decode(data),
    };
  }

  async put(key: string, value: ArrayBuffer | Uint8Array | string, options?: R2PutOptionsLike) {
    if (this.failPuts) throw new Error('R2 unavailable');
    const data = toBytes(value);
    const object: StoredObject = { data, etag: md5(data), uploaded: new Date(), customMetadata: options?.customMetadata };
    this.objects.set(key, object);
    return describe(key, object);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async createMultipartUpload(key: string): Promise<R2MultipartUploadLike> {
    const uploadId = `mpu-${randomUUID()}`;
    this.multipart.set(uploadId, { key, parts: new Map() });
    return this.resumeMultipartUpload(key, uploadId);
  }

  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUploadLike {
    const { multipart, objects, minPartSize } = this;
    const state = () => {
      const upload = multipart.get(uploadId);
      if (!upload || upload.key !== key) throw new Error('NoSuchUpload');
      return upload;
    };
    return {
      key,
      uploadId,
      async uploadPart(partNumber: number, value: ArrayBuffer | Uint8Array): Promise<R2UploadedPartLike> {
        const data = toBytes(value);
        const etag = md5(data);
        state().parts.set(partNumber, { data, etag });
        return { partNumber, etag };
      },
      async complete(parts: R2UploadedPartLike[]) {
        const upload = state();
        const selected = [...parts].sort((a, b) => a.partNumber - b.partNumber).map((part) => {
          const stored = upload.parts.get(part.partNumber);
          if (!stored || stored.etag !== part.etag) throw new Error('InvalidPart');
          return stored;
        });
        const head = selected.slice(0, -1);
        if (head.some((part) => part.data.byteLength < minPartSize || part.data.byteLength !== head[0].data.byteLength)) {
          throw new Error('EntityTooSmall / BadUpload');
        }
        const total = selected.reduce((sum, part) => sum + part.data.byteLength, 0);
        const data = new Uint8Array(total);
        let offset = 0;
        for (const part of selected) {
          data.set(part.data, offset);
          offset += part.data.byteLength;
        }
        multipart.delete(uploadId);
        const object: StoredObject = { data, etag: `${md5(data)}-${selected.length}`, uploaded: new Date() };
        objects.set(key, object);
        return describe(key, object);
      },
      async abort() {
        multipart.delete(uploadId);
      },
    };
  }
}

export class MemoryKV implements KVNamespaceLike {
  readonly entries = new Map<string, { value: string; expirationTtl?: number }>();
  failAll = false;

  async get(key: string) {
    if (this.failAll) throw new Error('KV unavailable');
    return this.entries.get(key)?.value ?? null;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    if (this.failAll) throw new Error('KV unavailable');
    if (options?.expirationTtl !== undefined && options.expirationTtl < 60) {
      throw new Error('KV expirationTtl must be at least 60 seconds');
    }
    this.entries.set(key, { value, expirationTtl: options?.expirationTtl });
  }

  async delete(key: string) {
    if (this.failAll) throw new Error('KV unavailable');
    this.entries.delete(key);
  }
}
