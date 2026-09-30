import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PRINTCHECK_PATH } from '../lib/printcheck/content';
import { AlertTriangle, ArrowRight, Calculator, CheckCircle, FileText, XCircle } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import Breadcrumbs from '../components/werkstoffe/Breadcrumbs';
import ComparisonTable from '../components/werkstoffe/ComparisonTable';
import {
  DatasheetLink,
  DbNote,
  DbSourceText,
  DbValue,
  LibraryDisclaimer,
  RetrievedDate,
} from '../components/werkstoffe/DatasheetBits';
import NotFound from './NotFound';
import { knowledgePageBySlug, knowledgePath } from '../lib/knowledgePages';
import { WERKSTOFF_CONTENT_BY_SLUG } from '../lib/werkstoffe/content';
import { FIELD_GROUP_LABEL, FIELD_GROUP_ORDER } from '../lib/werkstoffe/datasheetValues';
import {
  WERKSTOFF_FAMILY_BY_SLUG,
  WERKSTOFFE_PATH,
  calculatorPathForMaterial,
  werkstoffPath,
} from '../lib/werkstoffe/families';
import { productsForFamily, type LibraryProduct } from '../lib/werkstoffe/library';

const BulletList = ({ items, tone }: { items: readonly string[]; tone: 'positive' | 'negative' | 'neutral' }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2 text-gray-700">
        {tone === 'positive' && <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" aria-hidden="true" />}
        {tone === 'negative' && <XCircle className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />}
        {tone === 'neutral' && <AlertTriangle className="h-5 w-5 text-primary-700 mt-0.5 shrink-0" aria-hidden="true" />}
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ProductCard = ({ product }: { product: LibraryProduct }) => {
  const quotedValues = product.values.filter((value) => value.sourceText);
  return (
    <article id={product.id} className="bg-white border border-gray-200 rounded-xl p-6 scroll-mt-28">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{product.manufacturer}</p>
        <h3 className="font-display text-2xl font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
          <FileText className="h-4 w-4 text-primary-600" aria-hidden="true" />
          <DatasheetLink product={product} />
          <span aria-hidden="true">·</span>
          <RetrievedDate product={product} />
          <span aria-hidden="true">·</span>
          <span>Polymer laut Datenbank: {product.polymer}</span>
        </p>
        {product.datasheetIsMirror && product.mirrorNote && (
          <p className="mt-1 text-xs text-gray-600">{product.mirrorNote}</p>
        )}
      </header>

      {FIELD_GROUP_ORDER.map((group) => {
        const values = product.values.filter((value) => value.group === group);
        if (values.length === 0) return null;
        return (
          <div key={group} className="mb-5">
            <h4 className="font-semibold text-gray-900 mb-2">{FIELD_GROUP_LABEL[group]}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th scope="col" className="py-2 pr-4 font-medium">Eigenschaft</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Wert</th>
                    <th scope="col" className="py-2 font-medium">Prüfnorm laut Datenblatt</th>
                  </tr>
                </thead>
                <tbody>
                  {values.map((value) => (
                    <tr key={value.sourceField} className="border-b border-gray-200 align-top">
                      <th scope="row" className="py-2 pr-4 font-normal text-gray-800">
                        {value.label}
                        {value.notes.map((note) => (
                          <span key={note.text} className="block text-xs text-gray-500">
                            {note.origin === 'database' ? (
                              <DbNote productId={product.id} sourceField={value.sourceField} note={note.text} />
                            ) : (
                              note.text
                            )}
                          </span>
                        ))}
                      </th>
                      <td className="py-2 pr-4">
                        <DbValue productId={product.id} value={value} />
                      </td>
                      <td className="py-2 text-gray-700">{value.standard ?? 'nicht angegeben'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {group === 'processing' && (
              <p className="mt-2 text-xs text-gray-500">
                Verarbeitungsangaben dienen Ihrer Einordnung. Die Druckparameter legen wir für Ihr Bauteil fest.
              </p>
            )}
          </div>
        );
      })}

      {product.withheld.length > 0 && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Nicht übernommene Angaben</h4>
          <ul className="space-y-3 text-sm text-gray-700">
            {product.withheld.map((entry) => (
              <li key={entry.sourceField}>
                <span className="font-medium text-gray-900">{entry.label}:</span> {entry.reason}
                {entry.sourceText && (
                  <span className="block mt-1">
                    Datenblatt-Auszug:{' '}
                    <DbSourceText productId={product.id} sourceField={entry.sourceField} text={entry.sourceText} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {quotedValues.length > 0 && (
        <details className="mb-4 rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium text-gray-900">
            Datenblatt-Auszüge anzeigen (maschinell extrahierter Text)
          </summary>
          <p className="mt-2 text-xs text-gray-600">
            Die Auszüge zeigen die Zeile des Datenblatts, aus der ein Wert übernommen wurde – teils mit Text
            aus benachbarten Spalten. So können Sie jeden Wert am Original nachprüfen.
          </p>
          <dl className="mt-3 space-y-2">
            {quotedValues.map((value) => (
              <div key={value.sourceField}>
                <dt className="text-sm text-gray-800">{value.label}</dt>
                <dd>
                  <DbSourceText productId={product.id} sourceField={value.sourceField} text={value.sourceText as string} />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500 break-all">
          SHA-256 der abgerufenen Datenblatt-Datei: <code>{product.sha256}</code>
        </p>
        <Link
          to={calculatorPathForMaterial(product.id)}
          className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Richtpreis mit diesem Material
        </Link>
      </div>
    </article>
  );
};

const WerkstoffDetail = () => {
  const { slug = '' } = useParams();
  const { hash } = useLocation();

  // Links from the calculator and the comparison table point to a product
  // anchor (#<product id>); React Router does not scroll to hashes itself.
  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [slug, hash]);

  const family = WERKSTOFF_FAMILY_BY_SLUG[slug];
  const content = WERKSTOFF_CONTENT_BY_SLUG[slug];
  if (!family || !content) {
    return <NotFound />;
  }
  const products = productsForFamily(family.slug);
  const relatedKnowledge = content.relatedKnowledge
    .map((knowledgeSlug) => knowledgePageBySlug[knowledgeSlug])
    .filter((page) => page !== undefined);

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { name: 'Start', path: '/' },
            { name: 'Werkstoffe', path: WERKSTOFFE_PATH },
            { name: family.name },
          ]}
        />

        <GlassSurface as="section" variant="hero" density="normal" className="p-8 md:p-10 mb-10">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">{content.headline}</h1>
          <p className="text-lg text-gray-700 max-w-4xl">{content.intro}</p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to={calculatorPathForMaterial(family.calculatorMaterialId)}
              className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Calculator className="h-5 w-5" aria-hidden="true" />
              Richtpreis mit {family.name} berechnen
            </Link>
            <Link
              to="/projekt-starten/"
              className="border border-primary-700 text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              Projekt anfragen
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </GlassSurface>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GlassSurface as="article" variant="card" density="light" className="p-8">
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">Eigenschaften</h2>
            <BulletList items={content.strengths} tone="positive" />
          </GlassSurface>
          <GlassSurface as="article" variant="card" density="light" className="p-8">
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">Typische Anwendungen</h2>
            <BulletList items={content.applications} tone="positive" />
          </GlassSurface>
        </section>

        <GlassSurface as="section" variant="card" density="light" className="p-8 mb-12">
          <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
            Grenzen – wann {family.name} nicht die richtige Wahl ist
          </h2>
          <BulletList items={content.limits} tone="negative" />
        </GlassSurface>

        <section className="mb-12" aria-labelledby="kennwerte">
          <h2 id="kennwerte" className="font-display text-3xl font-bold text-gray-900 mb-2">
            Kennwerte laut Herstellerdatenblatt
          </h2>
          {products.length > 0 ? (
            <>
              <p className="text-gray-700 mb-6 max-w-4xl">
                Jeder Wert mit Einheit und Prüfnorm, das Originaldatenblatt ist verlinkt. Angaben, die im
                Datenblatt fehlen, führen wir als „keine Herstellerangabe“.
              </p>
              <div className="mb-8">
                <ComparisonTable
                  products={products}
                  caption={`Kennwerte ${family.name} laut Herstellerdatenblatt`}
                  linkFamilies={false}
                />
              </div>
              <div className="space-y-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-700">
              Für {family.name} ist in unserer Materialdatenbank noch kein Herstellerdatenblatt hinterlegt. Wir
              schätzen keine Kennwerte – im Angebot nennen wir das konkret eingesetzte Filament mit seinem
              Datenblatt.
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">Hinweise zum 3D-Druck</h2>
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <BulletList items={content.printingNotes} tone="neutral" />
          </div>
          <LibraryDisclaimer />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">Referenzierte Hersteller & Produkte</h2>
            {products.length > 0 ? (
              <ul className="space-y-2 text-gray-700">
                {products.map((product) => (
                  <li key={product.id}>
                    <a href={`#${product.id}`} className="text-primary-700 underline hover:text-primary-800">
                      {product.name}
                    </a>{' '}
                    <span className="text-sm text-gray-600">
                      (<RetrievedDate product={product} />)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700">Noch keine – siehe Hinweis oben.</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">Weiterlesen</h2>
            <ul className="space-y-2">
              {content.related.map((relatedSlug) => {
                const related = WERKSTOFF_FAMILY_BY_SLUG[relatedSlug];
                return related ? (
                  <li key={relatedSlug}>
                    <Link to={werkstoffPath(relatedSlug)} className="text-primary-700 underline hover:text-primary-800">
                      Werkstoff {related.name}
                    </Link>
                  </li>
                ) : null;
              })}
              {relatedKnowledge.map((page) => (
                <li key={page.slug}>
                  <Link to={knowledgePath(page.slug)} className="text-primary-700 underline hover:text-primary-800">
                    Leitfaden: {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={WERKSTOFFE_PATH} className="text-primary-700 underline hover:text-primary-800">
                  Alle Werkstoffe im Vergleich
                </Link>
              </li>
              <li>
                <Link to={PRINTCHECK_PATH} className="text-primary-700 underline hover:text-primary-800">
                  Druckbarkeit Ihrer Datei prüfen (Verzug, Wandstärke, Überhänge)
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-primary-600 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Bauteil in {family.name} fertigen lassen</h2>
          <p className="text-primary-100 mb-6 max-w-3xl mx-auto">
            Laden Sie Ihr CAD-Modell hoch und erhalten Sie sofort eine unverbindliche Richtpreis-Spanne. Die
            Werkstoffwahl prüfen wir vor dem verbindlichen Angebot technisch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={calculatorPathForMaterial(family.calculatorMaterialId)}
              className="bg-primary-800/65 border border-primary-200/45 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-800/80 transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
            >
              Richtpreis berechnen
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/kontakt/"
              className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center"
            >
              Rückruf anfragen
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WerkstoffDetail;
