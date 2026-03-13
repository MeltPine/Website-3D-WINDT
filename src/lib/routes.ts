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
