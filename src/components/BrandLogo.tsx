import React from 'react';
import { BRAND } from '../lib/brand';

type BrandLogoTheme = 'light' | 'dark';
type BrandLogoSize = 'sm' | 'md';

type BrandLogoProps = {
  theme?: BrandLogoTheme;
  size?: BrandLogoSize;
  showTagline?: boolean;
  className?: string;
};

const BrandLogo = ({
  theme = 'light',
  size = 'sm',
  showTagline = false,
  className = '',
}: BrandLogoProps) => {
  const isDark = theme === 'dark';

  const markSize = size === 'sm' ? 'h-12 w-12' : 'h-14 w-14';
  const markPadding = size === 'sm' ? 'p-0.5' : 'p-1';
  const nameText = size === 'sm' ? 'text-lg' : 'text-xl';

  const nameColor = isDark ? 'text-white' : 'text-gray-900';
  const metaColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const ringColor = isDark ? 'ring-white/25' : 'ring-primary-200';
  const markBackground = isDark ? 'bg-white/95' : 'bg-white';

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className={`relative ${markSize} ${markPadding} rounded-xl ${markBackground} shadow-sm ring-1 ${ringColor}`}
        aria-hidden="true"
      >
        <img
          src="/logo/3dw-logo-mark.webp"
          alt={`${BRAND.publicName} Logo`}
          width={448}
          height={473}
          className="h-full w-full object-contain"
          decoding="async"
        />
      </div>

      <div className="leading-tight">
        <span className={`block ${nameText} font-bold tracking-[0.03em] ${nameColor}`}>
          {BRAND.publicName}
        </span>
        <span className={`block text-[11px] uppercase tracking-[0.16em] ${metaColor}`}>
          {BRAND.descriptor}
        </span>
        {showTagline && <span className={`block text-xs ${metaColor} mt-1`}>{BRAND.tagline}</span>}
      </div>
    </div>
  );
};

export default BrandLogo;
