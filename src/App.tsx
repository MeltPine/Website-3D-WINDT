import { BrowserRouter as Router } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Seo from './components/Seo';
import AppRoutes from './components/AppRoutes';
import { routeSeo } from './lib/seo';

const AppContent = () => {
  const location = useLocation();
  const seoConfig = routeSeo[location.pathname] ?? routeSeo['/'];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Seo
        title={seoConfig.title}
        description={seoConfig.description}
        path={seoConfig.path}
        schema={seoConfig.schema}
        ogType={seoConfig.ogType}
      />
      <Header />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
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
