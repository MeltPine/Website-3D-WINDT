import React from 'react';
import { useTheme, type ThemeMode } from '../lib/theme';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';

type ThemeToggleProps = {
  compact?: boolean;
  className?: string;
};

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  icon: React.ReactNode;
};

const options: ThemeOption[] = [
  {
    mode: 'light',
    label: 'Hell',
    icon: <SunIcon className="h-4 w-4" />,
  },
  {
    mode: 'dark',
    label: 'Dunkel',
    icon: <MoonIcon className="h-4 w-4" />,
  },
  {
    mode: 'system',
    label: 'System',
    icon: <MonitorIcon className="h-4 w-4" />,
  },
];

const joinClassNames = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

const ThemeToggle = ({ compact = false, className }: ThemeToggleProps) => {
  const { mode, setMode } = useTheme();

  return (
    <div
      className={joinClassNames(
        'flex items-center rounded-lg border border-gray-300 bg-white/80 p-1 shadow-sm backdrop-blur-sm',
        className,
      )}
      role="group"
      aria-label="Farbmodus"
    >
      {options.map((option) => {
        const isActive = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            aria-pressed={isActive}
            aria-label={`Farbmodus: ${option.label}`}
            className={joinClassNames(
              'inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              compact ? 'h-8 w-8 px-0' : 'min-w-[5.4rem]',
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-white/70 hover:text-primary-700',
            )}
            title={`Farbmodus: ${option.label}`}
          >
            {option.icon}
            {compact ? <span className="sr-only">{option.label}</span> : <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
