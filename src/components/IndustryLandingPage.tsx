import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Factory } from 'lucide-react';

interface IndustryLandingPageProps {
  headline: string;
  summary: string;
  problem: string;
  solution: string;
  benefits: string[];
}

const IndustryLandingPage = ({
  headline,
  summary,
  problem,
  solution,
  benefits,
}: IndustryLandingPageProps) => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 md:p-12 mb-10 border border-primary-100">
          <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-5">
            <Factory className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{headline}</h1>
          <p className="text-lg text-gray-700 max-w-4xl">{summary}</p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen & Angebot erhalten
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors text-center"
            >
              Projekt telefonisch vorab klären
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Typische Herausforderung</h2>
            <p className="text-gray-700 leading-relaxed">{problem}</p>
          </article>
          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Unsere Lösung</h2>
            <p className="text-gray-700 leading-relaxed">{solution}</p>
          </article>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Ihr Nutzen</h2>
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Angebot innerhalb von 24 Stunden</h2>
          <p className="text-primary-100 mb-6">
            Senden Sie Datei, Materialwunsch und Stückzahl. Wir liefern eine technisch belastbare
            Rückmeldung mit individuellem Angebot.
          </p>
          <Link
            to="/projekt-starten"
            className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Jetzt Datei hochladen
            <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default IndustryLandingPage;
