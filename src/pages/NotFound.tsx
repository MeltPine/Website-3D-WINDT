import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, SearchX } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';

const NotFound = () => {
  return (
    <div className="py-20 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface variant="card" density="light" className="p-8 md:p-10 text-center">
          <SearchX className="h-12 w-12 text-primary-700 mx-auto mb-4" />
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">
            Seite nicht gefunden
          </h1>
          <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
            Die angeforderte Seite ist nicht verfügbar oder wurde verschoben. Nutzen Sie eine der
            folgenden Einstiege, um direkt weiterzumachen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten/"
              className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              Projekt starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Zur Startseite
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
};

export default NotFound;
