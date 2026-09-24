import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { UPLOAD_POLICY, chunkCountFor } from '../../src/lib/upload/policy';

/*
 * Pure (platform-independent) logic of the upload endpoints: session tokens,
 * signed download links, blob key layout. No Netlify imports here, so it is
 * unit-testable in Node.
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
 * - Abuse is bounded by per-session size limits, Netlify rate limits on each
 *   function and scheduled deletion of incomplete sessions.
 */

export const UPLOAD_STORE_NAME = 'project-uploads';
export const UPLOAD_STORE_REGION = 'eu-central-1';
export const MIN_SECRET_LENGTH = 32;

const TOKEN_VERSION = 1;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface SessionFile {
  fid: string;
  name: string;
  size: number;
  chunks: number;
}

export interface SessionToken {
  v: number;
  uid: string;
  /** UTC creation day, first segment of every blob key (drives cleanup). */
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

export function createSession(
  files: ReadonlyArray<{ name: string; size: number }>,
  now: Date,
): SessionToken {
  return {
    v: TOKEN_VERSION,
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

export function signSession(session: SessionToken, secret: string): string {
  const body = base64url(JSON.stringify(session));
  return `${body}.${hmac(secret, `session.${body}`)}`;
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
    !Array.isArray(session.files)
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

export function chunkKey(day: string, uid: string, fid: string, index: number): string {
  return `${day}/${uid}/${fid}/chunk-${String(index).padStart(5, '0')}`;
}

export function fileChunkPrefix(day: string, uid: string, fid: string): string {
  return `${day}/${uid}/${fid}/`;
}

export function manifestKey(day: string, uid: string): string {
  return `${day}/${uid}/manifest`;
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
  chunkSha256: string[];
}

export interface UploadManifest {
  uid: string;
  day: string;
  completedAt: string;
  files: UploadManifestFile[];
}

export type DayRetentionAction = 'delete-all' | 'delete-incomplete' | 'keep';

/**
 * Retention decision for one day prefix. Age is measured in whole UTC days
 * between the prefix day and `today`.
 */
export function retentionActionForDay(day: string, today: Date): DayRetentionAction {
  if (!isDay(day)) {
    return 'keep';
  }
  const ageDays = Math.floor((Date.parse(`${utcDay(today)}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  if (ageDays > UPLOAD_POLICY.retentionDays) {
    return 'delete-all';
  }
  if (ageDays > UPLOAD_POLICY.incompleteRetentionDays) {
    return 'delete-incomplete';
  }
  return 'keep';
}

/** Last path segment of a Blobs directory entry ("2026-09-24/uuid/" -> "uuid"). */
export function lastSegment(prefix: string): string {
  const parts = prefix.split('/').filter((part) => part.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}
