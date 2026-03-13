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
import { ThemeProvider } from './lib/theme';
import TrackingHealthPanel from './components/TrackingHealthPanel';

const AppContent = () => {
  const location = useLocation();
  const normalizedPath = normalizePathname(location.pathname);
  const seoConfig = routeSeo[normalizedPath] ?? routeSeo['/404'] ?? routeSeo['/'];

  useEffect(() => {
    initAnalytics();
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
      <TrackingHealthPanel />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
