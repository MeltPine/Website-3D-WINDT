import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { knowledgePages, knowledgePath } from '../lib/knowledgePages';

const Wissen = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Wissenscenter fuer industriellen 3D-Druck
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Technische Leitfaeden fuer Ersatzteile, Prototyping, Vorrichtungen und
            materialbezogene Entscheidungen im B2B-Umfeld.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-12">
          <p className="text-gray-700 leading-relaxed">
            Alle Inhalte sind auf industrielle Anwendungsfaelle ausgerichtet und auf belastbare
            Projektklaerung ausgelegt. Kein Marketing-Sprech, sondern konkrete Entscheidungsgrundlagen.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {knowledgePages.map((page) => (
            <article key={page.slug} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{page.title}</h2>
              <p className="text-gray-700 mb-4">{page.description}</p>
              <ul className="text-sm text-gray-600 space-y-1 mb-6">
                {page.checklist.slice(0, 3).map((point) => (
                  <li key={point}>- {point}</li>
                ))}
              </ul>
              <Link
                to={knowledgePath(page.slug)}
                className="mt-auto text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
              >
                Leitfaden lesen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-16 bg-primary-600 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Projekt technisch klaeren</h2>
          <p className="text-primary-100 mb-6 max-w-3xl mx-auto">
            Wenn Sie bereits Daten haben, pruefen wir Ihren Anwendungsfall und geben eine belastbare
            Rueckmeldung mit Lieferfenster.
          </p>
          <Link
            to="/projekt-starten/"
            className="bg-white text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 dark:bg-primary-600 dark:text-white dark:hover:bg-primary-700 dark:hover:text-white"
          >
            Datei hochladen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default Wissen;
