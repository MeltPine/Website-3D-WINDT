import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutesServer from './components/AppRoutesServer';
import { routeSeo, type RouteSeoConfig } from './lib/seo';
import { normalizePathname } from './lib/routes';
import { ThemeProvider } from './lib/theme';

function getSeoForPath(path: string): RouteSeoConfig {
  const normalizedPath = normalizePathname(path);
  return routeSeo[normalizedPath] ?? routeSeo['/404'] ?? routeSeo['/'];
}

export function render(path: string): { appHtml: string; seo: RouteSeoConfig } {
  const seo = getSeoForPath(path);

  const appHtml = renderToString(
    <ThemeProvider>
      <StaticRouter location={path}>
        <div className="app-shell min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <AppRoutesServer />
          </main>
          <Footer />
        </div>
      </StaticRouter>
    </ThemeProvider>,
  );

  return { appHtml, seo };
}
