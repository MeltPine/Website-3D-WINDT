export function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  const withoutHash = pathname.split('#', 1)[0];
  const withoutQuery = withoutHash.split('?', 1)[0];
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function toTrailingSlashPath(pathname: string): string {
  const normalized = normalizePathname(pathname);
  return normalized === '/' ? '/' : `${normalized}/`;
}

/**
 * Paths whose query string carries a signed payment link. The query must not
 * reach analytics or the stored attribution (it would leak quote number,
 * amount and signature to third parties or into later form submissions).
 */
const SENSITIVE_QUERY_PATHS = new Set(['/bezahlen']);

export function hasSensitiveQuery(pathname: string): boolean {
  return SENSITIVE_QUERY_PATHS.has(normalizePathname(pathname));
}
