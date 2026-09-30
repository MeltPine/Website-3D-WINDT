import { ArrowRight, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRINTCHECK_PATH } from '../../lib/printcheck/content';
import GlassSurface from '../GlassSurface';

/* Internal link block to the printability landing page (service pages). */
const PrintCheckTeaser = () => (
  <GlassSurface as="section" variant="card" density="light" className="p-6 md:p-8 mb-10">
    <div className="flex flex-col md:flex-row md:items-center gap-5">
      <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit">
        <ScanSearch className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <h2 className="font-display text-xl font-semibold text-gray-900 mb-1">Ist Ihre Datei druckbar?</h2>
        <p className="text-gray-700">
          Prüfen Sie STL, STEP, 3MF oder OBJ vorab kostenlos: Wandstärken, Überhänge, Bohrungen und Bauraum – direkt im
          Browser, ohne Upload, mit Erklärung je Befund.
        </p>
      </div>
      <Link
        to={PRINTCHECK_PATH}
        className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors"
      >
        Druckbarkeit prüfen <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  </GlassSurface>
);

export default PrintCheckTeaser;
