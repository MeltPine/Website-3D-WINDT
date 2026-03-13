import React from 'react';

type GlassVariant = 'nav' | 'hero' | 'card' | 'cta';
type GlassDensity = 'light' | 'normal';
type GlassElement = 'div' | 'section' | 'article' | 'aside' | 'header';

type GlassSurfaceProps = React.HTMLAttributes<HTMLElement> & {
  as?: GlassElement;
  variant?: GlassVariant;
  density?: GlassDensity;
};

const variantClassMap: Record<GlassVariant, string> = {
  nav: 'glass-nav',
  hero: 'glass-hero',
  card: 'glass-card',
  cta: 'glass-cta',
};

const densityClassMap: Record<GlassDensity, string> = {
  light: 'glass-density-light',
  normal: 'glass-density-normal',
};

const joinClassNames = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

const GlassSurface = ({
  as = 'div',
  variant = 'card',
  density = 'normal',
  className,
  children,
  ...props
}: GlassSurfaceProps) => {
  const Element: React.ElementType = as;
  return (
    <Element
      className={joinClassNames(
        'glass-surface',
        variantClassMap[variant],
        densityClassMap[density],
        className,
      )}
      {...props}
    >
      {children}
    </Element>
  );
};

export default GlassSurface;
