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

  const markSize = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const markText = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const nameText = size === 'sm' ? 'text-lg' : 'text-xl';

  const nameColor = isDark ? 'text-white' : 'text-gray-900';
  const metaColor = isDark ? 'text-gray-300' : 'text-gray-600';
  const ringColor = isDark ? 'ring-white/25' : 'ring-primary-200';

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className={`relative ${markSize} rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm ring-1 ${ringColor}`}
        aria-hidden="true"
      >
        <div className="absolute inset-[3px] rounded-[10px] border border-white/30" />
        <span
          className={`absolute inset-0 flex items-center justify-center ${markText} font-extrabold uppercase tracking-[0.22em] text-white`}
        >
          {BRAND.shortName}
        </span>
      </div>

      <div className="leading-tight">
        <span className={`block ${nameText} font-bold tracking-[0.03em] ${nameColor}`}>
          {BRAND.publicName}
        </span>
        <span className={`block text-[11px] uppercase tracking-[0.16em] ${metaColor}`}>
          {BRAND.descriptor}
        </span>
        {showTagline && (
          <span className={`block text-xs ${metaColor} mt-1`}>
            {BRAND.tagline}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
