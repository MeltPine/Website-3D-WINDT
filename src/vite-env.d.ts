/// <reference types="vite/client" />

import 'react';

declare module 'react' {
  // Lower-case HTML attribute passed through verbatim by React 18 (the
  // camel-case prop is only recognised from React 19 on).
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto';
  }
}
