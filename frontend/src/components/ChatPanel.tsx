import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { askQuestion, clearHistory, getChatHistory, Document } from '../api';
import ConfirmModal from './ConfirmModal';

interface Props {
  document: Document;
  onHistoryCleared: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  invoice: ['Toplam tutar nedir?', 'KDV tutarı nedir?', 'Fatura tarihi nedir?', 'Kalemler nelerdir?'],
  receipt: ['Toplam tutar nedir?', 'Ödeme yöntemi nedir?', 'Satın alınan ürünler?', 'Mağaza adı nedir?'],
  technical: ['Ölçüler nelerdir?', 'Kullanılan malzeme?', 'Teknik detayları özetle', 'Notlar nelerdir?'],
  generic: ['Bu belgeyi özetle', 'Ana konular nelerdir?', 'Tarih bilgisi var mı?', 'Önemli bilgileri listele'],
};

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
  header: {
    height: 56,
    minHeight: 56,
    padding: '0 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#111118',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.3,
  },
  headerSub: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#94a3b8',
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 7px',
    borderRadius: 4,
    letterSpacing: '0.3px',
    border: '1px solid transparent',
  },
  iconBtn: {
    width: 32,
    height: 32,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  extractedSection: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#0d0d14',
    flexShrink: 0,
  },
  extractedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'background 0.15s',
  },
  extractedHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  extractedTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#475569',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  extractedCount: {
    fontSize: 10,
    color: '#475569',
    background: '#22222f',
    borderRadius: 10,
    padding: '2px 7px',
  },
  extractedBody: {
    padding: '0 20px 14px',
    maxHeight: 220,
    overflowY: 'auto' as const,
  },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 8,
  },
  dataCard: {
    background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '10px 12px',
  },
  dataKey: {
    fontSize: 10,
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    wordBreak: 'break-word' as const,
    lineHeight: 1.45,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  emptyChat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center' as const,
    gap: 12,
    padding: '0 20px',
  },
  emptyChatIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(37,99,235,0.08))',
    border: '1px solid rgba(124,58,237,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyChatTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  emptyChatSub: { fontSize: 13, lineHeight: 1.7, color: '#94a3b8', maxWidth: 320 },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    width: '100%',
    maxWidth: 440,
    marginTop: 4,
  },
  suggestionChip: {
    padding: '8px 12px',
    background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    lineHeight: 1.4,
  },
  messageRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  messageRowUser: { flexDirection: 'row-reverse' as const },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '0.3px',
  },
  avatarUser: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
  },
  avatarAssistant: {
    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    color: '#a78bfa',
    border: '1px solid rgba(124,58,237,0.2)',
  },
  messageBubbleWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    maxWidth: '72%',
  },
  messageBubbleWrapUser: { alignItems: 'flex-end' },
  bubble: {
    padding: '10px 16px',
    fontSize: 14,
    lineHeight: 1.65,
    wordBreak: 'break-word' as const,
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
    whiteSpace: 'pre-wrap' as const,
  },
  bubbleAssistant: {
    background: '#1a1a24',
    color: '#e2e8f0',
    borderRadius: '4px 18px 18px 18px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  messageFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 4px',
  },
  timestamp: { fontSize: 10, color: '#475569' },
  copyBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#475569',
    padding: '2px 4px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  typingBubble: {
    background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '12px 16px',
    borderRadius: '4px 18px 18px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  inputArea: {
    padding: '12px 20px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: '#111118',
    flexShrink: 0,
  },
  inputRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textareaWrap: {
    flex: 1,
    background: '#1a1a24',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '10px 14px',
    transition: 'border-color 0.15s',
    display: 'flex',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: 14,
    resize: 'none' as const,
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: 22,
    maxHeight: 120,
    lineHeight: 1.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
  },
  sendBtnDisabled: {
    background: '#22222f',
    color: '#475569',
    cursor: 'not-allowed',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'none',
  },
};

function renderExtractedData(data: Record<string, any>) {
  const flatEntries: [string, string][] = [];
  const flatten = (obj: Record<string, any>, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix} / ${k}` : k;
      if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
        flatten(v, key);
      } else if (Array.isArray(v)) {
        flatEntries.push([key, v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')]);
      } else {
        const val = String(v).trim();
        if (val && val !== 'null' && val !== 'undefined') flatEntries.push([key, val]);
      }
    }
  };
  flatten(data);
  return flatEntries;
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ document: doc, onHistoryCleared }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [dataExpanded, setDataExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await getChatHistory(doc.id);
        if (active && res.data && Array.isArray(res.data)) {
          setMessages(res.data.map((m) => ({ ...m, timestamp: new Date() })));
        }
      } catch {
        // fresh start
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    loadHistory();
    return () => { active = false; };
  }, [doc.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: q, timestamp: new Date() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await askQuestion(doc.id, q);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer, timestamp: new Date() }]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || 'Bir hata oluştu, lütfen tekrar deneyin.';
      toast.error(errMsg);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Hata: ${errMsg}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, doc.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearConfirmed = async () => {
    setConfirmClear(false);
    setClearing(true);
    try {
      await clearHistory(doc.id);
      setMessages([]);
      onHistoryCleared();
      toast.success('Sohbet geçmişi temizlendi');
    } catch {
      toast.error('Geçmiş temizlenirken hata oluştu');
    } finally {
      setClearing(false);
    }
  };

  const handleCopy = async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(idx);
      toast.success('Kopyalandı');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Kopyalama başarısız');
    }
  };

  const handleExportChat = (format: 'txt' | 'md') => {
    if (messages.length === 0) { toast.error('Dışa aktarılacak mesaj yok'); return; }
    const lines: string[] = [
      format === 'md' ? `# ${doc.filename} — Sohbet Geçmişi` : `${doc.filename} — Sohbet Geçmişi`,
      format === 'md' ? `*${new Date().toLocaleString('tr-TR')}*` : new Date().toLocaleString('tr-TR'),
      '',
    ];
    messages.forEach((msg) => {
      const label = msg.role === 'user' ? 'Siz' : 'Asistan';
      const time = formatTime(msg.timestamp);
      if (format === 'md') {
        lines.push(`### ${label} — ${time}`);
        lines.push(msg.content);
      } else {
        lines.push(`[${label}] ${time}`);
        lines.push(msg.content);
      }
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_sohbet.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Sohbet .${format} olarak indirildi`);
  };

  const handleExportCSV = () => {
    if (extractedEntries.length === 0) return;
    const rows = [['Alan', 'Değer'], ...extractedEntries];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_veriler.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Veriler CSV olarak indirildi');
  };

  const extractedEntries = doc.extracted_data ? renderExtractedData(doc.extracted_data) : [];
  const typeInfo = DOC_TYPE_COLORS[doc.doc_type] || DOC_TYPE_COLORS.generic;
  const suggestions = SUGGESTED_QUESTIONS[doc.doc_type] || SUGGESTED_QUESTIONS.generic;

  return (
    <>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={{ ...styles.docIconWrap, background: typeInfo.bg, border: `1px solid ${typeInfo.border}` }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill={typeInfo.text}>
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
              </svg>
            </div>
            <div style={styles.headerInfo}>
              <div style={styles.headerTitle} title={doc.filename}>{doc.filename}</div>
              <div style={styles.headerSub}>
                <span style={{ ...styles.typeBadge, background: typeInfo.bg, color: typeInfo.text, borderColor: typeInfo.border }}>
                  {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                </span>
                {extractedEntries.length > 0 ? `${extractedEntries.length} alan çıkarıldı` : 'Analiz bekleniyor'}
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Export dropdown */}
              <div style={{ position: 'relative' as const }}>
                <button
                  style={styles.iconBtn}
                  title="Sohbeti dışa aktar"
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling as HTMLElement;
                    if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  aria-label="Sohbeti dışa aktar"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
                  </svg>
                </button>
                <div style={{
                  display: 'none', position: 'absolute' as const, right: 0, top: '100%', marginTop: 4,
                  background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                  flexDirection: 'column' as const, minWidth: 120, zIndex: 50, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {(['txt', 'md'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 12, padding: '8px 14px', textAlign: 'left' as const, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s' }}
                      onClick={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        handleExportChat(fmt);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#22222f'; e.currentTarget.style.color = '#e2e8f0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      .{fmt} olarak indir
                    </button>
                  ))}
                </div>
              </div>
              <button
                style={styles.iconBtn}
                onClick={() => setConfirmClear(true)}
                disabled={clearing}
                title="Sohbeti temizle"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                aria-label="Sohbeti temizle"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 00.249.225h5.19a.25.25 0 00.249-.225l.66-6.6a.75.75 0 011.492.149l-.66 6.6A1.748 1.748 0 0110.595 15h-5.19a1.75 1.75 0 01-1.741-1.575l-.66-6.6a.75.75 0 011.492-.15z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Extracted Data */}
        {extractedEntries.length > 0 && (
          <div style={styles.extractedSection}>
            <div
              style={styles.extractedHeader}
              onClick={() => setDataExpanded((v) => !v)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              role="button"
              aria-expanded={dataExpanded}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDataExpanded((v) => !v); } }}
            >
              <div style={styles.extractedHeaderLeft}>
                <svg
                  width="12" height="12" viewBox="0 0 16 16" fill="#475569"
                  style={{ transition: 'transform 0.2s', transform: dataExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
                >
                  <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
                </svg>
                <span style={styles.extractedTitle}>Çıkarılan Veriler</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.extractedCount}>{extractedEntries.length} alan</span>
                <button
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
                  title="CSV olarak indir"
                  aria-label="Verileri CSV olarak indir"
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
                  </svg>
                </button>
              </div>
            </div>
            {dataExpanded && (
              <div style={styles.extractedBody}>
                <div style={styles.dataGrid}>
                  {extractedEntries.map(([key, value]) => (
                    <div key={key} style={styles.dataCard}>
                      <div style={styles.dataKey} title={formatKey(key)}>{formatKey(key)}</div>
                      <div style={styles.dataValue}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={styles.messagesArea}>
          {historyLoading && (
            <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '8px 0' }}>
              Geçmiş yükleniyor...
            </div>
          )}

          {messages.length === 0 && !loading && !historyLoading ? (
            <div style={styles.emptyChat} className="fade-up">
              <div style={styles.emptyChatIconWrap}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div style={styles.emptyChatTitle}>Sohbete başlayın</div>
              <div style={styles.emptyChatSub}>
                Hızlı başlamak için aşağıdaki önerilerden birini seçin ya da kendi sorunuzu yazın.
              </div>
              <div style={styles.suggestionsGrid}>
                {suggestions.map((q) => (
                  <button
                    key={q}
                    style={styles.suggestionChip}
                    onClick={() => sendMessage(q)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#22222f'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.color = '#e2e8f0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className="msg-enter"
                style={{ ...styles.messageRow, ...(msg.role === 'user' ? styles.messageRowUser : {}) }}
              >
                <div style={{ ...styles.avatar, ...(msg.role === 'user' ? styles.avatarUser : styles.avatarAssistant) }}>
                  {msg.role === 'user' ? 'S' : 'AI'}
                </div>
                <div style={{ ...styles.messageBubbleWrap, ...(msg.role === 'user' ? styles.messageBubbleWrapUser : {}) }}>
                  <div style={{ ...styles.bubble, ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant) }}>
                    {msg.role === 'assistant' ? (
                      <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  <div style={{ ...styles.messageFooter, ...(msg.role === 'user' ? { flexDirection: 'row-reverse' as const } : {}) }}>
                    <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopy(msg.content, i)}
                      title="Kopyala"
                      aria-label="Mesajı kopyala"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                    >
                      {copiedId === i ? (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="#10b981">
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" /><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={styles.messageRow}>
              <div style={{ ...styles.avatar, ...styles.avatarAssistant }}>AI</div>
              <div style={styles.typingBubble}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={styles.inputArea}>
          <div style={styles.inputRow}>
            <div style={{ ...styles.textareaWrap, borderColor: inputFocused ? '#7c3aed' : 'rgba(255,255,255,0.08)' }}>
              <textarea
                ref={textareaRef}
                style={styles.textarea}
                placeholder="Bir soru sorun... (Enter gönder, Shift+Enter yeni satır)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={loading}
                rows={1}
                aria-label="Soru girin"
              />
            </div>
            <button
              style={{ ...styles.sendBtn, ...(!input.trim() || loading ? styles.sendBtnDisabled : {}) }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Gönder"
              aria-label="Mesaj gönder"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        title="Sohbeti Temizle"
        message={`"${doc.filename}" belgesiyle olan sohbet geçmişi silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Evet, Temizle"
        cancelLabel="İptal"
        danger
        onConfirm={handleClearConfirmed}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
