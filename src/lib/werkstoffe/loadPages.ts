/*
 * Lazy loader for the material library chunk. The chunk contains the
 * material database, so it stays out of the main bundle (same approach as
 * the calculator). main.tsx awaits `loadWerkstoffPages()` before the first
 * render when the initial URL is a library page, so the prerendered HTML is
 * not replaced by a loading state; client-side navigation uses React.lazy.
 */

export type WerkstoffPagesModule = typeof import('../../pages/werkstoffePages');

let loadedModule: WerkstoffPagesModule | null = null;
let pendingModule: Promise<WerkstoffPagesModule> | null = null;

export function loadWerkstoffPages(): Promise<WerkstoffPagesModule> {
  if (!pendingModule) {
    pendingModule = import('../../pages/werkstoffePages').then(
      (module) => {
        loadedModule = module;
        return module;
      },
      (error: unknown) => {
        // Allow a retry on the next navigation instead of caching the failure.
        pendingModule = null;
        throw error;
      },
    );
  }
  return pendingModule;
}

export function getLoadedWerkstoffPages(): WerkstoffPagesModule | null {
  return loadedModule;
}

export function isWerkstoffPath(pathname: string): boolean {
  return pathname === '/werkstoffe' || pathname.startsWith('/werkstoffe/');
}
