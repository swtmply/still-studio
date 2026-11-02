'use client';

import { createContext, useContext } from 'react';

export const StudioContext = createContext(null);
export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error('Studio pages must be rendered inside the studio.');
  return context;
}

export function newSession() {
  return { id: crypto.randomUUID(), createdAt: Date.now(), shots: [], selected: [], photoCount: 4, layoutId: 'strip-4', frameId: 'classic', filter: 'color', total: 6, page: 'shoot' };
}

export function PageIntro({ eyebrow, title, children }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1><p>{children}</p></div>;
}
