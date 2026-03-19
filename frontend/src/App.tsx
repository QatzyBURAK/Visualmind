import React, { useState, useCallback, useEffect } from 'react';
import DocumentList from './components/DocumentList';
import DocumentUpload from './components/DocumentUpload';
import ChatPanel from './components/ChatPanel';
import SearchPanel from './components/SearchPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ShortcutsModal from './components/ShortcutsModal';
import { Document, getDocument, healthCheck } from './api';

type Tab = 'documents' | 'search';

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0a0a0f',
    color: '#f1f5f9',
    overflow: 'hidden',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    height: 64,
    minHeight: 64,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    background: 'rgba(17,17,24,0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)' as any,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    flexShrink: 0,
    gap: 0,
  },

  // Logo
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column' as const,
    lineHeight: 1,
    gap: 2,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.4px',
  },
  logoSub: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 400,
    letterSpacing: '0.01em',
  },

  headerSpacer: { flex: 1 },

  // Tab group (center)
  tabGroup: {
    display: 'flex',
    alignItems: 'center',
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 4,
    gap: 2,
  },
  tab: {
    padding: '7px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: 7,
    color: '#475569',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap' as const,
  },
  tabActive: {
    background: '#22222f',
    color: '#f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },

  // Status (right)
  statusWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginLeft: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
  },

  // ── Body ────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },

  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#111118',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    flexShrink: 0,
  },

  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    padding: 20,
    gap: 20,
    minWidth: 0,
    background: '#0a0a0f',
  },

  content: {
    flex: 1,
    display: 'flex',
    gap: 20,
    overflow: 'hidden',
    minHeight: 0,
  },

  uploadCol: {
    width: 340,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    overflowY: 'auto' as const,
  },

  chatCol: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },

  searchFull: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },

  // No doc selected placeholder
  noneSelected: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111118',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#94a3b8',
    gap: 14,
    textAlign: 'center' as const,
    animation: 'fadeUp 0.4s ease forwards',
  },
  noneIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.1))',
    border: '1px solid rgba(124,58,237,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noneTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  noneText: {
    fontSize: 13,
    lineHeight: 1.7,
    maxWidth: 280,
    color: '#94a3b8',
  },
  noneHint: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 500,
    opacity: 0.85,
  },

  // Hint card below upload
  hintCard: {
    padding: '12px 16px',
    background: 'rgba(124,58,237,0.06)',
    borderRadius: 10,
    border: '1px solid rgba(124,58,237,0.12)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  hintIconSpan: {
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
    color: '#7c3aed',
  },
};

export default function App() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleNewDoc = useCallback(() => {
    setActiveTab('documents');
    setUploadTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    const check = async () => {
      const ok = await healthCheck();
      setBackendOnline(ok);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'k') { e.preventDefault(); setActiveTab('search'); }
      if (ctrl && e.key === 'd') { e.preventDefault(); setActiveTab('documents'); }
      if (ctrl && e.key === 'u') { e.preventDefault(); handleNewDoc(); }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNewDoc]);

  const handleUploadSuccess = useCallback((doc: Document) => {
    setRefreshTrigger((n) => n + 1);
    setSelectedDoc(doc);
  }, []);

  const handleSelectDoc = useCallback(async (doc: Document) => {
    try {
      const fresh = await getDocument(doc.id);
      setSelectedDoc(fresh);
    } catch {
      setSelectedDoc(doc);
    }
    setActiveTab('documents');
  }, []);

  const handleHistoryCleared = useCallback(() => {}, []);

  const handleDocDelete = useCallback((deletedId: string) => {
    setSelectedDoc((prev) => (prev?.id === deletedId ? null : prev));
  }, []);

  const healthColor =
    backendOnline === null ? '#94a3b8' : backendOnline ? '#059669' : '#dc2626';
  const healthText =
    backendOnline === null
      ? 'Bağlanıyor...'
      : backendOnline
      ? 'Connected'
      : 'Offline';

  return (
    <div style={styles.app}>
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {/* ── Header ── */}
      <header style={styles.header}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>V</div>
          <div style={styles.logoText}>
            <span style={styles.logoTitle}>VisualMind</span>
            <span style={styles.logoSub}>AI Document Intelligence</span>
          </div>
        </div>

        <div style={styles.headerSpacer} />

        {/* Tab butonları — orta */}
        <div style={styles.tabGroup}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'documents' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('documents')}
            title="Belgeler (Ctrl+D)"
            aria-label="Belgeler sekmesi"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 1.75A.75.75 0 014.75 1h4.5l3 3v9.5a.75.75 0 01-.75.75H4.75A.75.75 0 014 13.5V1.75zm1.5.5v10.5h5.75V5.5H8.5A.75.75 0 017.75 4.75V2.25H5.5zM9.25 2.75v1.5h1.5L9.25 2.75z" />
            </svg>
            Belgeler
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'search' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('search')}
            title="Ara (Ctrl+K)"
            aria-label="Arama sekmesi"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
            </svg>
            Ara
          </button>
        </div>

        <div style={styles.headerSpacer} />

        {/* Keyboard shortcuts hint */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginRight: 16,
            fontSize: 11,
            color: '#475569',
          }}
          title="Ctrl+K: Ara | Ctrl+D: Belgeler | Ctrl+U: Yeni belge"
        >
          {[
            { key: 'Ctrl+K', label: 'Ara' },
            { key: 'Ctrl+D', label: 'Belge' },
            { key: '?', label: 'Yardım' },
          ].map(({ key, label }) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                background: '#22222f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 10,
                fontFamily: 'monospace',
                color: '#64748b',
              }}>
                {key}
              </span>
              <span style={{ fontSize: 10, color: '#475569' }}>{label}</span>
            </span>
          ))}
        </div>

        {/* Backend status — sağ */}
        <div style={styles.statusWrap}>
          <div
            className={backendOnline ? 'pulse-dot' : ''}
            style={{ ...styles.statusDot, background: healthColor }}
          />
          <span style={{ ...styles.statusLabel, color: healthColor }}>
            {healthText}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={styles.body}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <DocumentList
            selectedId={selectedDoc?.id ?? null}
            onSelect={handleSelectDoc}
            refreshTrigger={refreshTrigger}
            onDelete={handleDocDelete}
            onNewDoc={handleNewDoc}
          />
        </aside>

        {/* Main */}
        <main style={styles.main}>
          {activeTab === 'documents' && (
            <div style={styles.content}>
              {/* Upload kolonu */}
              <div style={styles.uploadCol}>
                <DocumentUpload onUploadSuccess={handleUploadSuccess} triggerOpen={uploadTrigger} />
                <div style={styles.hintCard}>
                  <span style={styles.hintIconSpan}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </span>
                  <span>
                    Belge yükledikten sonra sol panelden seçip sorularınızı sorabilirsiniz.
                  </span>
                </div>
              </div>

              {/* Chat kolonu */}
              <div style={styles.chatCol}>
                {selectedDoc ? (
                  <ErrorBoundary>
                  <ChatPanel
                    document={selectedDoc}
                    onHistoryCleared={handleHistoryCleared}
                  />
                  </ErrorBoundary>
                ) : (
                  <div style={styles.noneSelected} className="fade-up">
                    <div style={styles.noneIconWrap}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div style={styles.noneTitle}>Henüz belge seçilmedi</div>
                    <div style={styles.noneText}>
                      Sol panelden mevcut belgelerinizden birini seçin
                      ya da yeni bir belge yükleyin.
                    </div>
                    <div style={styles.noneHint}>← Belge seçmek için sol paneli kullanın</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div style={styles.searchFull}>
              <ErrorBoundary>
                <SearchPanel onSelectDoc={handleSelectDoc} />
              </ErrorBoundary>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
