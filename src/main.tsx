import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isWerkstoffPath, loadWerkstoffPages } from './lib/werkstoffe/loadPages';

function renderApp(): void {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// The material library is a lazy chunk. On a direct visit, load it before the
// first render so the prerendered page is not swapped for a loading state.
// A failed chunk load still renders the app (the route retries lazily).
if (isWerkstoffPath(window.location.pathname)) {
  loadWerkstoffPages().then(renderApp, renderApp);
} else {
  renderApp();
}
