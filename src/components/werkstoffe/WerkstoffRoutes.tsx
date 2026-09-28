import { Suspense, lazy, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getLoadedWerkstoffPages, loadWerkstoffPages } from '../../lib/werkstoffe/loadPages';

/*
 * Client route elements of the material library. If the chunk is already
 * loaded (preloaded in main.tsx or visited before), the page renders
 * directly; otherwise React.lazy shows a short loading state. The choice is
 * fixed per mount so a page is never remounted mid-use.
 */

const LazyOverview = lazy(() => loadWerkstoffPages().then((module) => ({ default: module.WerkstoffeOverview })));
const LazyDetail = lazy(() => loadWerkstoffPages().then((module) => ({ default: module.WerkstoffDetail })));

const Fallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-gray-600">
    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Werkstoff-Bibliothek wird geladen …
  </div>
);

export const WerkstoffeOverviewRoute = () => {
  const [loaded] = useState(getLoadedWerkstoffPages);
  if (loaded) {
    const Page = loaded.WerkstoffeOverview;
    return <Page />;
  }
  return (
    <Suspense fallback={<Fallback />}>
      <LazyOverview />
    </Suspense>
  );
};

export const WerkstoffDetailRoute = () => {
  const [loaded] = useState(getLoadedWerkstoffPages);
  if (loaded) {
    const Page = loaded.WerkstoffDetail;
    return <Page />;
  }
  return (
    <Suspense fallback={<Fallback />}>
      <LazyDetail />
    </Suspense>
  );
};
