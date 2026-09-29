import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { UPLOAD_POLICY, chunkCountFor } from '../src/lib/upload/policy';

/*
 * Pure (platform-independent) logic of the upload endpoints: session tokens,
 * signed download links, R2 key layout. No platform imports here, so it is
 * unit-testable in Node (Cloudflare runs it with the nodejs_compat flag).
 *
 * Security model
 * - The browser cannot hold a secret, so /api/uploads/init is the only
 *   unauthenticated mutating endpoint. It validates the file list against
 *   UPLOAD_POLICY and returns an HMAC-signed session token that binds upload
 *   id, file ids, sizes and chunk counts. Every chunk/complete request must
 *   present this token as a Bearer header; the server never accepts sizes or
 *   keys it did not sign itself.
 * - Download links carry their own HMAC signature and expiry (= retention).
 *   They are only handed to the uploader (their own files) and to the
 *   internal lead e-mail / form submission.
 * - Abuse is bounded by per-session size limits, a KV rate limit on init and
 *   R2 lifecycle rules that abort incomplete sessions after
 *   UPLOAD_POLICY.incompleteRetentionDays (see infra/r2-lifecycle.json).
 *
 * R2 key layout (the prefixes are what the lifecycle rules match on)
 * - uploads/files/<day>/<uid>/<fid>          one object per file, written as an
 *   R2 multipart upload (one part per chunk). Until the upload is completed
 *   it is not an object, only an in-progress multipart upload, which the
 *   lifecycle rule aborts after incompleteRetentionDays. Completed objects
 *   and the manifest expire after retentionDays.
 * - uploads/files/<day>/<uid>/manifest.json  written on completion.
 * - uploads/parts/<day>/<uid>/<fid>/<index>  small JSON receipt per stored part
 *   (part etag + SHA-256); expires after incompleteRetentionDays.
 */

export const MIN_SECRET_LENGTH = 32;
export const FILES_PREFIX = 'uploads/files/';
export const PARTS_PREFIX = 'uploads/parts/';

const TOKEN_VERSION = 1;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface SessionFile {
  fid: string;
  name: string;
  size: number;
  chunks: number;
  /** R2 multipart upload id of this file (bound by the token signature). */
  mpu: string;
}

export interface SessionToken {
  v: number;
  uid: string;
  /** UTC creation day, part of every object key. */
  day: string;
  /** Session expiry, unix seconds. */
  exp: number;
  files: SessionFile[];
}

export function isUploadId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function isDay(value: unknown): value is string {
  return typeof value === 'string' && DAY_PATTERN.test(value);
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function readSecret(env: Record<string, string | undefined>): string | null {
  const secret = env.UPLOAD_SIGNING_SECRET;
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) {
    return null;
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function hmac(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Removes path components and control characters; keeps the extension. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '_').trim();
  return cleaned.slice(-UPLOAD_POLICY.maxFileNameLength);
}

export interface PlannedSession {
  uid: string;
  day: string;
  exp: number;
  files: Array<Omit<SessionFile, 'mpu'>>;
}

/**
 * First half of session creation: ids, key day and chunk plan. The caller
 * opens one multipart upload per file (needs the ids for the keys) and then
 * finalises the token with `withMultipartIds`.
 */
export function planSession(files: ReadonlyArray<{ name: string; size: number }>, now: Date): PlannedSession {
  return {
    uid: randomUUID(),
    day: utcDay(now),
    exp: Math.floor(now.getTime() / 1000) + UPLOAD_POLICY.sessionTtlSeconds,
    files: files.map((file) => ({
      fid: randomUUID(),
      name: sanitizeFileName(file.name),
      size: file.size,
      chunks: chunkCountFor(file.size),
    })),
  };
}

export function withMultipartIds(plan: PlannedSession, multipartIds: readonly string[]): SessionToken {
  if (multipartIds.length !== plan.files.length || multipartIds.some((id) => typeof id !== 'string' || id === '')) {
    throw new Error('Exactly one multipart upload id per file is required.');
  }
  return {
    v: TOKEN_VERSION,
    uid: plan.uid,
    day: plan.day,
    exp: plan.exp,
    files: plan.files.map((file, index) => ({ ...file, mpu: multipartIds[index] })),
  };
}

export function signSession(session: SessionToken, secret: string): string {
  const body = base64url(JSON.stringify(session));
  return `${body}.${hmac(secret, `session.${body}`)}`;
}

function isSessionFile(value: unknown): value is SessionFile {
  const file = value as Partial<SessionFile> | null;
  return (
    typeof file === 'object' &&
    file !== null &&
    isUploadId(file.fid) &&
    typeof file.name === 'string' &&
    Number.isInteger(file.size) &&
    Number.isInteger(file.chunks) &&
    typeof file.mpu === 'string' &&
    file.mpu !== ''
  );
}

export function verifySession(token: string, secret: string, nowSeconds: number): SessionToken | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !SIGNATURE_PATTERN.test(parts[1])) {
    return null;
  }
  const [body, signature] = parts;
  if (!safeEqual(signature, hmac(secret, `session.${body}`))) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const session = parsed as SessionToken;
  if (
    session?.v !== TOKEN_VERSION ||
    !isUploadId(session.uid) ||
    !isDay(session.day) ||
    typeof session.exp !== 'number' ||
    !Array.isArray(session.files) ||
    !session.files.every(isSessionFile)
  ) {
    return null;
  }
  if (session.exp < nowSeconds) {
    return null;
  }
  return session;
}

export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)$/.exec(authorization.trim());
  return match ? match[1] : null;
}

/** Object key of the assembled file (target of the multipart upload). */
export function fileKey(day: string, uid: string, fid: string): string {
  return `${FILES_PREFIX}${day}/${uid}/${fid}`;
}

export function manifestKey(day: string, uid: string): string {
  return `${FILES_PREFIX}${day}/${uid}/manifest.json`;
}

/** Receipt of one stored chunk (= multipart part `index + 1`). */
export function partReceiptKey(day: string, uid: string, fid: string, index: number): string {
  return `${PARTS_PREFIX}${day}/${uid}/${fid}/${String(index).padStart(5, '0')}`;
}

export interface PartReceipt {
  partNumber: number;
  etag: string;
  sha256: string;
  size: number;
}

export function parsePartReceipt(raw: string, expectedPartNumber: number): PartReceipt | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const receipt = parsed as Partial<PartReceipt> | null;
  if (
    typeof receipt !== 'object' ||
    receipt === null ||
    receipt.partNumber !== expectedPartNumber ||
    typeof receipt.etag !== 'string' ||
    typeof receipt.sha256 !== 'string' ||
    typeof receipt.size !== 'number'
  ) {
    return null;
  }
  return receipt as PartReceipt;
}

export function sha256Base64url(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('base64url');
}

export interface DownloadReference {
  day: string;
  uid: string;
  fid: string;
  /** Link expiry, unix seconds. */
  exp: number;
}

export function downloadExpiry(day: string): number {
  const created = Date.parse(`${day}T00:00:00Z`);
  return Math.floor(created / 1000) + (UPLOAD_POLICY.retentionDays + 1) * 24 * 60 * 60;
}

function downloadMessage(ref: DownloadReference): string {
  return `download.${ref.day}.${ref.uid}.${ref.fid}.${ref.exp}`;
}

export function signDownload(ref: DownloadReference, secret: string): string {
  return hmac(secret, downloadMessage(ref));
}

/** Relative link to the internal retrieval page. */
export function downloadPath(ref: DownloadReference, secret: string): string {
  const query = new URLSearchParams({
    d: ref.day,
    u: ref.uid,
    f: ref.fid,
    e: String(ref.exp),
    s: signDownload(ref, secret),
  });
  return `/datei-abruf/?${query.toString()}`;
}

export function verifyDownload(
  params: URLSearchParams,
  secret: string,
  nowSeconds: number,
): DownloadReference | null {
  const day = params.get('d');
  const uid = params.get('u');
  const fid = params.get('f');
  const expRaw = params.get('e');
  const signature = params.get('s');
  if (!isDay(day) || !isUploadId(uid) || !isUploadId(fid) || !expRaw || !/^\d{1,12}$/.test(expRaw)) {
    return null;
  }
  if (!signature || !SIGNATURE_PATTERN.test(signature)) {
    return null;
  }
  const ref: DownloadReference = { day, uid, fid, exp: Number(expRaw) };
  if (!safeEqual(signature, signDownload(ref, secret))) {
    return null;
  }
  if (ref.exp < nowSeconds) {
    return null;
  }
  return ref;
}

/**
 * CSRF guard: browsers always send Origin on POST. Requests from another
 * origin are rejected; there are deliberately no CORS headers at all.
 */
export function isSameOriginRequest(requestUrl: string, originHeader: string | null): boolean {
  if (!originHeader) {
    return false;
  }
  try {
    return new URL(originHeader).host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}

export interface UploadManifestFile {
  fid: string;
  name: string;
  size: number;
  chunks: number;
  /** Chunk size the file was uploaded with; retrieval reads the same ranges. */
  chunkBytes: number;
  chunkSha256: string[];
}

export interface UploadManifest {
  uid: string;
  day: string;
  completedAt: string;
  files: UploadManifestFile[];
}

/** Byte range of chunk `index` inside the assembled file. */
export function chunkRange(file: Pick<UploadManifestFile, 'size' | 'chunks' | 'chunkBytes'>, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= file.chunks) {
    return null;
  }
  const offset = index * file.chunkBytes;
  return { offset, length: Math.min(file.chunkBytes, file.size - offset) };
}
