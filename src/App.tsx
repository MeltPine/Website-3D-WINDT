import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Seo from './components/Seo';
import AppRoutes from './components/AppRoutes';
import { routeSeo } from './lib/seo';
import { initAnalytics, trackPageView } from './lib/analytics';
import ConsentBanner from './components/ConsentBanner';
import { normalizePathname, toTrailingSlashPath } from './lib/routes';

const AppContent = () => {
  const location = useLocation();
  const normalizedPath = normalizePathname(location.pathname);
  const seoConfig = routeSeo[normalizedPath] ?? routeSeo['/404'] ?? routeSeo['/'];

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.classList.remove('dark');
    root.dataset.themeMode = 'light';
    root.dataset.resolvedTheme = 'light';
    root.style.colorScheme = 'light';
  }, []);

  useEffect(() => {
    const analyticsPath = `${toTrailingSlashPath(normalizedPath)}${location.search}`;
    trackPageView(analyticsPath);
  }, [normalizedPath, location.search]);

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <Seo
        title={seoConfig.title}
        description={seoConfig.description}
        path={seoConfig.path}
        schema={seoConfig.schema}
        ogType={seoConfig.ogType}
        robots={seoConfig.robots}
      />
      <Header />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
      <ConsentBanner />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
