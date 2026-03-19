import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { getDocuments, deleteDocument, renameDocument, Document } from '../api';
import ConfirmModal from './ConfirmModal';

interface Props {
  selectedId: string | null;
  onSelect: (doc: Document) => void;
  refreshTrigger: number;
  onDelete?: (id: string) => void;
  onNewDoc?: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Fatura',
  receipt: 'Makbuz',
  technical: 'Teknik',
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
      <path d="M11.134 1.535C9.722 2.562 8.16 4.057 6.889 5.985c-1.487 2.23-2.482 4.78-2.887 7.184a.5.5 0 00.466.579c.272.012.471-.196.518-.468C5.36 11.095 6.3 8.701 7.685 6.639 8.993 4.685 10.444 3.3 11.767 2.342a.5.5 0 00-.633-.807z" /><path fillRule="evenodd" d="M2 0h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2zm0 1.5a.5.5 0 00-.5.5v12a.5.5 0 00.5.5h12a.5.5 0 00.5-.5V2a.5.5 0 00-.5-.5H2z" />
    </svg>
  ),
  generic: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
    </svg>
  ),
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '20px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    flex: 1,
  },
  countBadge: {
    fontSize: 11,
    color: '#94a3b8',
    background: '#22222f',
    borderRadius: 20,
    padding: '2px 8px',
    lineHeight: 1.5,
  },
  newDocBtn: {
    margin: '0 12px 8px',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: 'none',
    width: 'calc(100% - 24px)',
    transition: 'opacity 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
    fontFamily: 'inherit',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 8px',
  },
  item: {
    margin: '2px 0',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    position: 'relative' as const,
  },
  itemHover: {
    background: '#1a1a24',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  itemSelected: {
    background: '#1a1a24',
    borderColor: 'rgba(124,58,237,0.3)',
    boxShadow: '0 0 0 1px rgba(124,58,237,0.1)',
  },
  fileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.3,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.3px',
    lineHeight: 1.5,
    border: '1px solid transparent',
  },
  readyDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemDate: {
    fontSize: 11,
    color: '#475569',
    marginLeft: 'auto',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#475569',
    padding: '2px 5px',
    borderRadius: 4,
    flexShrink: 0,
    transition: 'color 0.15s, background 0.15s',
    opacity: 0,
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnVisible: {
    opacity: 1,
    color: '#dc2626',
  },
  deleteBtnLoading: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: '#475569',
    fontSize: 13,
    lineHeight: 1.8,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'rgba(71,85,105,0.1)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingBox: {
    padding: '28px 16px',
    textAlign: 'center' as const,
    color: '#475569',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorBox: {
    margin: '8px',
    padding: '12px 14px',
    borderRadius: 8,
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.2)',
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center' as const,
  },
  statsBar: {
    margin: '8px',
    padding: '10px 12px',
    background: '#0d0d14',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    gap: 12,
    flexShrink: 0,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e2e8f0',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  statDivider: {
    width: 1,
    background: 'rgba(255,255,255,0.05)',
    alignSelf: 'stretch',
  },
  filterBar: {
    display: 'flex',
    gap: 4,
    padding: '0 8px 8px',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  filterChip: {
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 9px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'transparent',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  renameInput: {
    flex: 1,
    background: '#22222f',
    border: '1px solid rgba(124,58,237,0.4)',
    borderRadius: 5,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '2px 6px',
    outline: 'none',
    fontFamily: 'inherit',
    minWidth: 0,
  },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

type FilterType = 'all' | 'invoice' | 'receipt' | 'technical' | 'generic';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'invoice', label: 'Fatura' },
  { value: 'receipt', label: 'Makbuz' },
  { value: 'technical', label: 'Teknik' },
  { value: 'generic', label: 'Genel' },
];

export default function DocumentList({ selectedId, onSelect, refreshTrigger, onDelete, onNewDoc }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDocuments();
        if (active) {
          setDocs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch {
        if (active) setError('Belgeler yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshTrigger]);

  const handleDeleteConfirmed = async () => {
    const doc = deleteTarget;
    setDeleteTarget(null);
    if (!doc) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (onDelete) onDelete(doc.id);
      toast.success(`"${doc.filename}" silindi`);
    } catch {
      toast.error('Belge silinirken hata oluştu');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameStart = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameValue(doc.filename);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const handleRenameSubmit = async (docId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    const original = docs.find((d) => d.id === docId)?.filename;
    if (trimmed === original) { setRenamingId(null); return; }
    try {
      await renameDocument(docId, trimmed);
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, filename: trimmed } : d));
      toast.success('Belge adı güncellendi');
    } catch {
      toast.error('Yeniden adlandırma başarısız');
    } finally {
      setRenamingId(null);
    }
  };

  const filteredDocs = filterType === 'all' ? docs : docs.filter((d) => d.doc_type === filterType);
  const readyCount = docs.filter((d) => d.extracted_data && Object.keys(d.extracted_data).length > 0).length;
  const processingCount = docs.length - readyCount;

  return (
    <>
      <div style={styles.container}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Belgeler</span>
          {docs.length > 0 && <span style={styles.countBadge}>{docs.length}</span>}
        </div>

        <button
          style={styles.newDocBtn}
          onClick={() => onNewDoc?.()}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(0.99)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          aria-label="Yeni belge yükle"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
          </svg>
          Yeni Belge
        </button>

        {/* Filter bar */}
        {docs.length > 0 && (
          <div style={styles.filterBar}>
            {FILTER_OPTIONS.filter((opt) => opt.value === 'all' || docs.some((d) => d.doc_type === opt.value)).map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.filterChip,
                  ...(filterType === opt.value ? {
                    background: 'rgba(124,58,237,0.15)',
                    borderColor: 'rgba(124,58,237,0.3)',
                    color: '#a78bfa',
                  } : {}),
                }}
                onClick={() => setFilterType(opt.value)}
                onMouseEnter={(e) => { if (filterType !== opt.value) { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.color = '#94a3b8'; }}}
                onMouseLeave={(e) => { if (filterType !== opt.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}}
              >
                {opt.label}
                {opt.value !== 'all' && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    {docs.filter((d) => d.doc_type === opt.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div style={styles.list} role="list" aria-label="Belgeler listesi">
          {loading && (
            <div aria-live="polite" aria-label="Belgeler yükleniyor">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ ...styles.item, cursor: 'default', gap: 10, margin: '2px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1a1a24', flexShrink: 0 }} className="skeleton" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 13, borderRadius: 4, background: '#1a1a24', width: `${60 + i * 10}%` }} className="skeleton" />
                    <div style={{ height: 10, borderRadius: 4, background: '#1a1a24', width: '40%' }} className="skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div style={styles.errorBox} role="alert">
              {error}
              <button
                onClick={() => setError(null)}
                style={{ marginLeft: 8, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              >
                Yenile
              </button>
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIconWrap}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="#475569">
                  <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
                </svg>
              </div>
              <div>Henüz belge yüklenmedi</div>
              <div style={{ fontSize: 12, color: '#7c3aed' }}>Yukarıdaki butonu kullanın</div>
            </div>
          )}

          {!loading && filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedId;
            const isHovered = doc.id === hoveredId;
            const isDeleting = doc.id === deletingId;
            const isRenaming = doc.id === renamingId;
            const typeInfo = DOC_TYPE_COLORS[doc.doc_type] || DOC_TYPE_COLORS.generic;
            const icon = DOC_TYPE_ICONS[doc.doc_type] || DOC_TYPE_ICONS.generic;
            const isReady = doc.extracted_data && Object.keys(doc.extracted_data).length > 0;

            return (
              <div
                key={doc.id}
                role="listitem"
                style={{
                  ...styles.item,
                  ...(isSelected ? styles.itemSelected : isHovered ? styles.itemHover : {}),
                }}
                onClick={() => !isRenaming && onSelect(doc)}
                onMouseEnter={() => setHoveredId(doc.id)}
                onMouseLeave={() => setHoveredId(null)}
                tabIndex={0}
                aria-selected={isSelected}
                onKeyDown={(e) => { if (!isRenaming && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(doc); } }}
              >
                <div style={{ ...styles.fileIconWrap, background: typeInfo.bg, border: `1px solid ${typeInfo.border}`, color: typeInfo.text }}>
                  {icon}
                </div>

                <div style={styles.itemContent}>
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      style={styles.renameInput}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleRenameSubmit(doc.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => handleRenameSubmit(doc.id)}
                      autoFocus
                    />
                  ) : (
                    <div style={styles.itemName} title={doc.filename} onDoubleClick={(e) => handleRenameStart(doc, e)}>
                      {doc.filename}
                    </div>
                  )}
                  <div style={styles.itemMeta}>
                    <div
                      style={{ ...styles.readyDot, background: isReady ? '#059669' : '#d97706' }}
                      title={isReady ? 'Analiz tamamlandı' : 'İşleniyor'}
                    />
                    <span style={{ ...styles.badge, background: typeInfo.bg, color: typeInfo.text, borderColor: typeInfo.border }}>
                      {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                    </span>
                    <span style={styles.itemDate}>{formatDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* Rename + Delete buttons */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      ...(isHovered || isSelected ? styles.deleteBtnVisible : {}),
                    }}
                    onClick={(e) => handleRenameStart(doc, e)}
                    title="Yeniden adlandır"
                    aria-label={`${doc.filename} belgesini yeniden adlandır`}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#7c3aed'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z" />
                    </svg>
                  </button>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      ...(isHovered || isSelected ? styles.deleteBtnVisible : {}),
                      ...(isDeleting ? styles.deleteBtnLoading : {}),
                    }}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc); }}
                    disabled={deletingId !== null}
                    title="Belgeyi sil"
                    aria-label={`${doc.filename} belgesini sil`}
                  >
                    {isDeleting ? (
                      <span style={{ fontSize: 10 }}>…</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 00.249.225h5.19a.25.25 0 00.249-.225l.66-6.6a.75.75 0 011.492.149l-.66 6.6A1.748 1.748 0 0110.595 15h-5.19a1.75 1.75 0 01-1.741-1.575l-.66-6.6a.75.75 0 011.492-.15zM6.5 1.75V3h3V1.75a.25.25 0 00-.25-.25h-2.5a.25.25 0 00-.25.25z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filteredDocs.length === 0 && docs.length > 0 && (
            <div style={{ ...styles.emptyState, padding: '24px 16px' }}>
              <div style={{ fontSize: 12, color: '#475569' }}>Bu türde belge yok</div>
              <button
                onClick={() => setFilterType('all')}
                style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Tümünü göster
              </button>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {docs.length > 0 && (
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{docs.length}</span>
              <span style={styles.statLabel}>Toplam</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: '#10b981' }}>{readyCount}</span>
              <span style={styles.statLabel}>Hazır</span>
            </div>
            {processingCount > 0 && (
              <>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: '#f59e0b' }}>{processingCount}</span>
                  <span style={styles.statLabel}>İşleniyor</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Belgeyi Sil"
        message={`"${deleteTarget?.filename}" belgesini ve tüm sohbet geçmişini kalıcı olarak silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
