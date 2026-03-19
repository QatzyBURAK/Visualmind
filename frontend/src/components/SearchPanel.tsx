import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { searchDocuments, Document } from '../api';

interface Props {
  onSelectDoc: (doc: Document) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Fatura',
  receipt: 'Makbuz',
  technical: 'Teknik Çizim',
  generic: 'Genel',
};

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  invoice:   { bg: 'rgba(37,99,235,0.15)',  text: '#3b82f6', border: 'rgba(37,99,235,0.2)' },
  receipt:   { bg: 'rgba(5,150,105,0.15)',  text: '#10b981', border: 'rgba(5,150,105,0.2)' },
  technical: { bg: 'rgba(217,119,6,0.15)',  text: '#f59e0b', border: 'rgba(217,119,6,0.2)' },
  generic:   { bg: 'rgba(71,85,105,0.15)',  text: '#94a3b8', border: 'rgba(71,85,105,0.2)' },
};

const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  invoice: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 7.75A.75.75 0 015.75 7h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 7.75zM5 10.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM4.75 1a.75.75 0 00-.75.75V3h-.25A1.75 1.75 0 002 4.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 14.25v-9.5A1.75 1.75 0 0012.25 3H12V1.75a.75.75 0 00-1.5 0V3h-5V1.75A.75.75 0 004.75 1zM3.5 4.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5z" />
    </svg>
  ),
  receipt: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.457 1.457 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zm1.75-.25a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.749.749 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z" />
    </svg>
  ),
  technical: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.134 1.535C9.722 2.562 8.16 4.057 6.889 5.985c-1.487 2.23-2.482 4.78-2.887 7.184a.5.5 0 00.466.579c.272.012.471-.196.518-.468C5.36 11.095 6.3 8.701 7.685 6.639 8.993 4.685 10.444 3.3 11.767 2.342a.5.5 0 00-.633-.807z" /><path fillRule="evenodd" d="M2 0h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2zm0 1.5a.5.5 0 00-.5.5v12a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V2a.5.5 0 00-.5-.5H2z" />
    </svg>
  ),
  generic: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
    </svg>
  ),
};

const EXAMPLE_QUERIES = [
  'KDV tutarı yüksek faturalar',
  'Ocak 2024 makbuzları',
  'Teknik çizim boyutları',
  'Toplam tutar özeti',
];

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#111118',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  searchArea: {
    padding: '32px 32px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  titleRow: { marginBottom: 20 },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
    WebkitBackgroundClip: 'text' as any,
    WebkitTextFillColor: 'transparent' as any,
    backgroundClip: 'text' as any,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, color: '#475569' },
  inputWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  searchIconAbsolute: {
    position: 'absolute' as const,
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#475569',
    pointerEvents: 'none' as const,
    display: 'flex',
    alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute' as const,
    right: 120,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: 4,
    transition: 'color 0.15s',
  },
  input: {
    flex: 1,
    padding: '14px 44px 14px 48px',
    background: '#0d0d14',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  searchBtn: {
    padding: '13px 22px',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  searchBtnDisabled: {
    background: '#22222f',
    color: '#475569',
    cursor: 'not-allowed',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'none',
  },
  shortcutBadge: {
    fontSize: 10,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    padding: '2px 5px',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  resultsArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px 32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#94a3b8',
    fontSize: 13,
    padding: '20px 0',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(124,58,237,0.2)',
    borderTop: '2px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
  hint: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 14,
    textAlign: 'center' as const,
    padding: '0 20px',
  },
  hintIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: 'rgba(71,85,105,0.1)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hintTitle: { fontSize: 16, fontWeight: 600, color: '#e2e8f0' },
  hintText: { fontSize: 13, lineHeight: 1.7, color: '#94a3b8', maxWidth: 320 },
  examplesRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    justifyContent: 'center',
    maxWidth: 480,
  },
  exampleChip: {
    padding: '6px 12px',
    background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  emptyMsg: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center' as const,
    padding: '48px 0',
    lineHeight: 1.8,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0 8px',
  },
  resultCount: { fontSize: 12, color: '#475569', fontWeight: 500 },
  clearResults: {
    fontSize: 11,
    color: '#475569',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '2px 6px',
    borderRadius: 4,
    transition: 'color 0.15s',
  },
  resultCard: {
    padding: '14px 18px',
    background: '#0d0d14',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    animation: 'fadeIn 0.18s ease forwards',
  },
  resultCardHover: {
    borderColor: 'rgba(124,58,237,0.3)',
    background: '#111118',
    transform: 'translateX(2px)',
  },
  resultLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  resultFileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultInfo: { flex: 1, minWidth: 0 },
  resultName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 4,
    letterSpacing: '0.3px',
    border: '1px solid transparent',
  },
  resultAction: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  resultActionVisible: { opacity: 1 },
};

export default function SearchPanel({ onSelectDoc }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchDocuments(searchQuery);
      const docs = res.data?.results || [];
      setResults(docs);
      if (docs.length === 0) {
        toast('Eşleşen belge bulunamadı', { icon: '🔍' });
      }
    } catch {
      toast.error('Arama sırasında hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { setQuery(''); setResults(null); setSearched(false); }
  };

  const handleExampleClick = (q: string) => {
    setQuery(q);
    handleSearch(q);
  };

  return (
    <div style={styles.container}>
      {/* Search Area */}
      <div style={styles.searchArea}>
        <div style={styles.titleRow}>
          <div style={styles.title}>Belgelerde Ara</div>
          <div style={styles.subtitle}>Sorularınızla tüm belgelerinizde semantik arama yapın</div>
        </div>

        <div style={styles.inputWrap}>
          <div style={styles.searchIconAbsolute}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            style={{
              ...styles.input,
              borderColor: inputFocused ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              boxShadow: inputFocused ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
            }}
            placeholder="Belgelerde ara... (Enter ile ara, Esc temizle)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            disabled={loading}
            aria-label="Arama kutusu"
          />
          {query && (
            <button
              style={styles.clearBtn}
              onClick={() => { setQuery(''); setResults(null); setSearched(false); inputRef.current?.focus(); }}
              title="Temizle"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          )}
          <button
            style={{ ...styles.searchBtn, ...(!query.trim() || loading ? styles.searchBtnDisabled : {}) }}
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            aria-label="Ara"
          >
            {loading ? (
              <div style={{ ...styles.spinner, width: 14, height: 14 }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
              </svg>
            )}
            Ara
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={styles.resultsArea}>
        {loading && (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <span>Belgeler aranıyor...</span>
          </div>
        )}

        {!loading && !searched && (
          <div style={styles.hint} className="fade-up">
            <div style={styles.hintIconWrap}>
              <svg width="26" height="26" viewBox="0 0 16 16" fill="#475569">
                <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
              </svg>
            </div>
            <div style={styles.hintTitle}>Belgelerinizde arama yapın</div>
            <div style={styles.hintText}>
              Tüm belgeleriniz arasında semantik arama yapabilirsiniz. Bir örnek sorgu seçin:
            </div>
            <div style={styles.examplesRow}>
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  style={styles.exampleChip}
                  onClick={() => handleExampleClick(q)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = '#22222f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#1a1a24'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && searched && results !== null && results.length === 0 && (
          <div style={styles.emptyMsg}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="#475569" style={{ opacity: 0.5 }}>
              <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
            </svg>
            <div>Eşleşen belge bulunamadı</div>
            <div style={{ color: '#7c3aed', fontSize: 12, fontWeight: 500 }}>Farklı anahtar kelimeler deneyin</div>
          </div>
        )}

        {!loading && results !== null && results.length > 0 && (
          <>
            <div style={styles.resultHeader}>
              <span style={styles.resultCount}>{results.length} sonuç bulundu</span>
              <button
                style={styles.clearResults}
                onClick={() => { setResults(null); setSearched(false); setQuery(''); inputRef.current?.focus(); }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
              >
                Temizle
              </button>
            </div>
            {results.map((doc) => {
              const typeInfo = DOC_TYPE_COLORS[doc.doc_type] || DOC_TYPE_COLORS.generic;
              const icon = DOC_TYPE_ICONS[doc.doc_type] || DOC_TYPE_ICONS.generic;
              const isHov = hoveredId === doc.id;
              return (
                <div
                  key={doc.id}
                  style={{ ...styles.resultCard, ...(isHov ? styles.resultCardHover : {}) }}
                  onClick={() => onSelectDoc(doc)}
                  onMouseEnter={() => setHoveredId(doc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${doc.filename} belgesiyle sohbet başlat`}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelectDoc(doc); }}
                >
                  <div style={styles.resultLeft}>
                    <div style={{ ...styles.resultFileIconWrap, background: typeInfo.bg, border: `1px solid ${typeInfo.border}`, color: typeInfo.text }}>
                      {icon}
                    </div>
                    <div style={styles.resultInfo}>
                      <div style={styles.resultName} title={doc.filename}>{doc.filename}</div>
                      <span style={{ ...styles.badge, background: typeInfo.bg, color: typeInfo.text, borderColor: typeInfo.border }}>
                        {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                      </span>
                    </div>
                  </div>
                  <div style={{ ...styles.resultAction, ...(isHov ? styles.resultActionVisible : {}) }}>
                    Sohbet Başlat
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
