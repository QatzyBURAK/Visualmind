import React from 'react';

export const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Fatura',
  receipt: 'Makbuz',
  technical: 'Teknik Çizim',
  generic: 'Genel',
};

export const DOC_TYPE_LABELS_SHORT: Record<string, string> = {
  invoice: 'Fatura',
  receipt: 'Makbuz',
  technical: 'Teknik',
  generic: 'Genel',
};

export const DOC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  invoice:   { bg: 'rgba(37,99,235,0.15)',  text: '#3b82f6', border: 'rgba(37,99,235,0.2)' },
  receipt:   { bg: 'rgba(5,150,105,0.15)',  text: '#10b981', border: 'rgba(5,150,105,0.2)' },
  technical: { bg: 'rgba(217,119,6,0.15)',  text: '#f59e0b', border: 'rgba(217,119,6,0.2)' },
  generic:   { bg: 'rgba(71,85,105,0.15)',  text: '#94a3b8', border: 'rgba(71,85,105,0.2)' },
};

export const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  invoice: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 7.75A.75.75 0 015.75 7h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 7.75zM5 10.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM4.75 1a.75.75 0 00-.75.75V3h-.25A1.75 1.75 0 002 4.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 14.25v-9.5A1.75 1.75 0 0012.25 3H12V1.75a.75.75 0 00-1.5 0V3h-5V1.75A.75.75 0 004.75 1zM3.5 4.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5z" />
    </svg>
  ),
  receipt: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.457 1.457 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zm1.75-.25a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.749.749 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z" />
    </svg>
  ),
  technical: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.134 1.535C9.722 2.562 8.16 4.057 6.889 5.985c-1.487 2.23-2.482 4.78-2.887 7.184a.5.5 0 00.466.579c.272.012.471-.196.518-.468C5.36 11.095 6.3 8.701 7.685 6.639 8.993 4.685 10.444 3.3 11.767 2.342a.5.5 0 00-.633-.807z" />
      <path fillRule="evenodd" d="M2 0h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2zm0 1.5a.5.5 0 00-.5.5v12a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V2a.5.5 0 00-.5-.5H2z" />
    </svg>
  ),
  generic: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
    </svg>
  ),
};

export const POLLING_INTERVAL_MS = 2000;
export const MAX_POLLING_ATTEMPTS = 90;
export const HEALTH_CHECK_INTERVAL_MS = 15000;
