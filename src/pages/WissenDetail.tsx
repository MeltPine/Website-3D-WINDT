import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { knowledgePageBySlug, knowledgePath, relatedKnowledgePages } from '../lib/knowledgePages';
import { servicePageByKey } from '../lib/servicePages';

const WissenDetail = () => {
  const { slug = '' } = useParams();
  const page = knowledgePageBySlug[slug];

  if (!page) {
    return (
      <div className="py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Leitfaden nicht gefunden</h1>
            <p className="text-gray-700 mb-6">
              Die angefragte Wissensseite ist nicht verfügbar oder wurde verschoben.
            </p>
            <Link
              to="/wissen/"
              className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Wissenscenter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const relatedPages = relatedKnowledgePages(page.slug);
  const matchingService = page.service ? servicePageByKey[page.service] : undefined;

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/wissen/"
          className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Wissenscenter
        </Link>

        <article className="bg-white border border-gray-200 rounded-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.title}</h1>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">{page.intro}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Schnell-Check</h2>
            <ul className="space-y-2 text-gray-700">
              {page.checklist.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-6">
            {page.sections.map((section) => (
              <div key={section.title} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{section.title}</h3>
                <p className="text-gray-700 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </section>

          {matchingService && (
            <section className="mt-8 border border-primary-100 rounded-lg p-5 bg-primary-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Passende Leistung</h2>
              <p className="text-gray-700 mb-3">{matchingService.summary}</p>
              <Link
                to={matchingService.href}
                className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
              >
                {matchingService.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          )}

          <section className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Nächster Schritt für Ihr Projekt
            </h2>
            <p className="text-gray-700 mb-6">
              Wenn Ihr Anwendungsfall konkret ist, starten wir mit technischer Prüfung und einem
              belastbaren Angebotsrahmen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/projekt-starten/"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                Projekt starten
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/kontakt/"
                className="border border-primary-600 text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center"
              >
                Rückruf anfragen
              </Link>
            </div>
          </section>
        </article>

        {relatedPages.length > 0 && (
          <section aria-labelledby="verwandte-artikel" className="mt-10">
            <h2 id="verwandte-artikel" className="text-2xl font-semibold text-gray-900 mb-4">
              Verwandte Artikel
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPages.map((related) => (
                <li key={related.slug} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{related.title}</h3>
                  <p className="text-sm text-gray-700 mb-4">{related.description}</p>
                  <Link
                    to={knowledgePath(related.slug)}
                    className="mt-auto text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
                  >
                    Leitfaden lesen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default WissenDetail;
