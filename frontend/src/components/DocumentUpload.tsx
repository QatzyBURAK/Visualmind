import React, { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  uploadDocument,
  getDocument,
  getDocumentStatus,
  DocType,
  Document,
} from '../api';
interface Props {
  onUploadSuccess: (doc: Document) => void;
  triggerOpen?: number;
}

const DOC_TYPE_OPTIONS: { value: DocType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'invoice',
    label: 'Fatura',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5 7.75A.75.75 0 015.75 7h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 7.75zM5 10.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM4.75 1a.75.75 0 00-.75.75V3h-.25A1.75 1.75 0 002 4.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 14.25v-9.5A1.75 1.75 0 0012.25 3H12V1.75a.75.75 0 00-1.5 0V3h-5V1.75A.75.75 0 004.75 1zM3.5 4.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5z" />
      </svg>
    ),
  },
  {
    value: 'receipt',
    label: 'Makbuz',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0114.25 13H8.06l-2.573 2.573A1.457 1.457 0 013 14.543V13H1.75A1.75 1.75 0 010 11.25v-9.5zm1.75-.25a.25.25 0 00-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.749.749 0 01.53-.22h6.5a.25.25 0 00.25-.25v-9.5a.25.25 0 00-.25-.25H1.75z" />
      </svg>
    ),
  },
  {
    value: 'technical',
    label: 'Teknik',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
      </svg>
    ),
  },
  {
    value: 'generic',
    label: 'Genel',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.56v2.19c0 .138.112.25.25.25h2.19L10.5 2.06z" />
      </svg>
    ),
  },
];

type Status =
  | { type: 'idle' }
  | { type: 'converting' }
  | { type: 'uploading' }
  | { type: 'processing'; docId: string }
  | { type: 'success'; filename: string }
  | { type: 'error'; message: string };

// Formats the browser Canvas can render → convert to PNG
const CANVAS_CONVERTIBLE = new Set([
  'image/webp', 'image/bmp', 'image/gif', 'image/tiff',
  'image/x-tiff', 'image/avif', 'image/heic', 'image/heif',
]);
const NATIVE_OK = new Set(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);
const VIDEO_RE = /^video\//;

async function convertToSupportedFormat(file: File): Promise<File> {
  if (NATIVE_OK.has(file.type)) return file;
  if (VIDEO_RE.test(file.type)) {
    throw new Error('Video dosyaları desteklenmiyor. Lütfen bir görsel veya PDF yükleyin.');
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas desteklenmiyor.')); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Görsel PNG\'ye dönüştürülemedi.')); return; }
        const newName = file.name.replace(/\.[^.]+$/, '') + '.png';
        resolve(new File([blob], newName, { type: 'image/png' }));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" formatı okunamıyor. Lütfen JPG, PNG veya PDF yükleyin.`));
    };
    img.src = url;
  });
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#111118',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
  },

  // Header
  panelHeader: {
    padding: '24px 24px 0',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },

  // Inner padding
  body: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },

  // Dropzone
  dropzone: {
    border: '1.5px dashed rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '40px 20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: '#0d0d14',
    userSelect: 'none' as const,
  },
  dropzoneActive: {
    borderColor: '#7c3aed',
    background: 'rgba(124,58,237,0.05)',
    boxShadow: '0 0 0 4px rgba(124,58,237,0.1)',
  },
  dropzoneHasFile: {
    borderColor: 'rgba(5,150,105,0.4)',
    background: 'rgba(5,150,105,0.05)',
  },

  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'rgba(71,85,105,0.12)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  uploadIconWrapActive: {
    background: 'rgba(124,58,237,0.12)',
    borderColor: 'rgba(124,58,237,0.25)',
  },
  uploadIconWrapHasFile: {
    background: 'rgba(5,150,105,0.12)',
    borderColor: 'rgba(5,150,105,0.25)',
  },

  dropzoneMainText: {
    fontSize: 15,
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  dropzoneClickText: {
    color: '#7c3aed',
    cursor: 'pointer',
    fontWeight: 600,
  },
  dropzoneSubText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
  },

  // File selected state
  fileSelectedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#10b981',
    marginBottom: 3,
  },
  fileCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(5,150,105,0.15)',
    border: '1px solid rgba(5,150,105,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#10b981',
  },
  fileSize: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  changeLink: {
    fontSize: 11,
    color: '#7c3aed',
    cursor: 'pointer',
    marginTop: 4,
    display: 'block',
  },

  // Doc type
  typeLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 8,
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
  },
  typeBtn: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '9px 8px',
    background: '#0d0d14',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 5,
  },
  typeBtnActive: {
    borderColor: '#7c3aed',
    background: 'rgba(124,58,237,0.1)',
    color: '#a78bfa',
  },

  // Upload button
  uploadBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
  },
  uploadBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },

  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },

  // Progress
  progressWrap: {
    borderRadius: 2,
    overflow: 'hidden',
    background: '#22222f',
    height: 3,
    marginTop: 8,
  },

  // Status boxes
  statusBox: {
    padding: '12px 14px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    lineHeight: 1.55,
  },
  statusProcessing: {
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(124,58,237,0.2)',
    color: '#94a3b8',
  },
  statusSuccess: {
    background: 'rgba(5,150,105,0.08)',
    border: '1px solid rgba(5,150,105,0.2)',
    color: '#10b981',
  },
  statusError: {
    background: 'rgba(220,38,38,0.08)',
    border: '1px solid rgba(220,38,38,0.2)',
    color: '#dc2626',
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({ onUploadSuccess, triggerOpen }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('generic');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (triggerOpen) fileInputRef.current?.click();
  }, [triggerOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setStatus({ type: 'idle' });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const startPolling = (docId: string) => {
    setStatus({ type: 'processing', docId });
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        let isReady = false;
        let filename = '';
        try {
          const statusRes = await getDocumentStatus(docId);
          const statusData = statusRes.data;
          if (statusData.status === 'ready') isReady = true;
        } catch {
          const doc = await getDocument(docId);
          filename = doc.filename;
          if (doc.extracted_data && Object.keys(doc.extracted_data).length > 0) {
            isReady = true;
          }
        }

        if (isReady) {
          clearInterval(pollingRef.current!);
          if (timerRef.current) clearInterval(timerRef.current);
          try {
            const doc = await getDocument(docId);
            setStatus({ type: 'success', filename: doc.filename });
            setFile(null);
            onUploadSuccess(doc);
            toast.success(`"${doc.filename}" analiz tamamlandı`);
          } catch {
            setStatus({ type: 'success', filename: filename || docId });
            setFile(null);
            toast.success('Belge analiz tamamlandı');
          }
        } else if (attempts > 150) {
          clearInterval(pollingRef.current!);
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus({ type: 'error', message: 'İşlem zaman aşımına uğradı.' });
          toast.error('Analiz zaman aşımına uğradı');
        }
      } catch {
        clearInterval(pollingRef.current!);
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus({ type: 'error', message: 'Belge durumu alınamadı.' });
        toast.error('Belge durumu alınamadı');
      }
    }, 2000);
  };

  const handleUpload = async () => {
    if (!file) return;

    let uploadFile = file;

    // Convert non-native formats
    if (!NATIVE_OK.has(file.type)) {
      if (VIDEO_RE.test(file.type)) {
        const msg = 'Video dosyaları desteklenmiyor. Lütfen bir görsel veya PDF yükleyin.';
        setStatus({ type: 'error', message: msg });
        toast.error(msg);
        return;
      }
      setStatus({ type: 'converting' });
      const convToast = toast.loading(`"${file.name}" dönüştürülüyor...`);
      try {
        uploadFile = await convertToSupportedFormat(file);
        toast.dismiss(convToast);
        toast.success(`PNG'ye dönüştürüldü: ${uploadFile.name}`);
      } catch (err: any) {
        toast.dismiss(convToast);
        const msg = err?.message || 'Dönüştürme başarısız.';
        setStatus({ type: 'error', message: msg });
        toast.error(msg);
        return;
      }
    }

    setStatus({ type: 'uploading' });
    const loadingToast = toast.loading(`"${uploadFile.name}" yükleniyor...`);
    try {
      const doc = await uploadDocument(uploadFile, docType);
      toast.dismiss(loadingToast);
      toast.success('Yükleme tamamlandı, analiz başlıyor...');
      startPolling(String(doc.document_id));
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const msg = err?.response?.data?.detail || err?.message || 'Yükleme başarısız.';
      setStatus({ type: 'error', message: msg });
      toast.error(msg);
    }
  };

  const isLoading = status.type === 'uploading' || status.type === 'processing' || status.type === 'converting';
  const willConvert = file && !NATIVE_OK.has(file.type) && !VIDEO_RE.test(file.type);

  const dropzoneStyle = {
    ...styles.dropzone,
    ...(isDragging ? styles.dropzoneActive : {}),
    ...(file && !isDragging ? styles.dropzoneHasFile : {}),
  };

  const iconWrapStyle = {
    ...styles.uploadIconWrap,
    ...(isDragging ? styles.uploadIconWrapActive : {}),
    ...(file && !isDragging ? styles.uploadIconWrapHasFile : {}),
  };

  return (
    <div style={styles.container} data-upload-zone>
      <div style={styles.panelHeader}>
        <div style={styles.title}>Yeni Belge Yükle</div>
        <div style={styles.subtitle}>VLM otomatik analiz eder — WebP, BMP, GIF de desteklenir</div>
      </div>

      <div style={styles.body}>
        {/* Dropzone */}
        <div
          style={dropzoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.webp,.bmp,.tiff,.tif,.avif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          <div style={iconWrapStyle}>
            {file ? (
              <svg width="22" height="22" viewBox="0 0 16 16" fill="#10b981">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            ) : isDragging ? (
              <svg width="22" height="22" viewBox="0 0 16 16" fill="#8b5cf6">
                <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 16 16" fill="#475569">
                <path d="M8.53 1.22a.75.75 0 00-1.06 0L4.72 3.97a.75.75 0 001.06 1.06l1.47-1.47v6.69a.75.75 0 001.5 0V3.56l1.47 1.47a.75.75 0 101.06-1.06L8.53 1.22zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
              </svg>
            )}
          </div>

          {file ? (
            <>
              <div style={styles.fileSelectedRow}>
                <div style={styles.fileCheckCircle}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                </div>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{file.name}</span>
              </div>
              <div style={styles.fileSize}>{formatBytes(file.size)}</div>
              {willConvert && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                  </svg>
                  Yüklemede otomatik PNG'ye dönüştürülecek
                </div>
              )}
              <span style={styles.changeLink}>Değiştir</span>
            </>
          ) : (
            <>
              <div style={styles.dropzoneMainText}>
                {isDragging ? 'Bırakın!' : 'Dosyayı buraya sürükle'}
              </div>
              {!isDragging && (
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 0 }}>
                  veya{' '}
                  <span style={styles.dropzoneClickText}>tıkla</span>
                </div>
              )}
              <div style={styles.dropzoneSubText}>JPG · PNG · WebP · BMP · GIF · PDF · Max 20MB</div>
            </>
          )}
        </div>

        {/* Doc type selector */}
        <div>
          <div style={styles.typeLabel}>Belge Türü</div>
          <div style={styles.typeGrid}>
            {DOC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.typeBtn,
                  ...(docType === opt.value ? styles.typeBtnActive : {}),
                }}
                onClick={() => setDocType(opt.value)}
                disabled={isLoading}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload button */}
        <button
          style={{
            ...styles.uploadBtn,
            ...(!file || isLoading ? styles.uploadBtnDisabled : {}),
          }}
          onClick={handleUpload}
          disabled={!file || isLoading}
          onMouseEnter={(e) => {
            if (file && !isLoading) {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(124,58,237,0.4)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(124,58,237,0.3)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          {status.type === 'uploading' ? (
            <>
              <div style={styles.spinner} />
              Yükleniyor...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.53 1.22a.75.75 0 00-1.06 0L4.72 3.97a.75.75 0 001.06 1.06l1.47-1.47v6.69a.75.75 0 001.5 0V3.56l1.47 1.47a.75.75 0 101.06-1.06L8.53 1.22zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
              </svg>
              Yükle ve Analiz Et
            </>
          )}
        </button>

        {/* Converting state */}
        {status.type === 'converting' && (
          <div style={{ ...styles.statusBox, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#94a3b8' }}>
            <div style={styles.spinner} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 2 }}>Format dönüştürülüyor...</div>
              <div>Görsel PNG formatına çevriliyor.</div>
            </div>
          </div>
        )}

        {/* Processing state */}
        {status.type === 'processing' && (
          <div style={{ ...styles.statusBox, ...styles.statusProcessing }}>
            <div style={styles.spinner} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>VLM analiz ediyor...</div>
                <div style={{ fontSize: 11, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                  {elapsedSecs < 60 ? `${elapsedSecs}s` : `${Math.floor(elapsedSecs / 60)}m ${elapsedSecs % 60}s`}
                </div>
              </div>
              <div>Model büyük olduğu için 1–3 dakika sürebilir.</div>
              <div style={styles.progressWrap}>
                <div className="progress-bar" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        )}

        {status.type === 'success' && (
          <div style={{ ...styles.statusBox, ...styles.statusSuccess }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
            </svg>
            <span>
              <strong>"{status.filename}"</strong> başarıyla işlendi!
            </span>
          </div>
        )}

        {status.type === 'error' && (
          <div style={{ ...styles.statusBox, ...styles.statusError }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M4.47.22A.75.75 0 015 0h6a.75.75 0 01.53.22l4.25 4.25c.141.14.22.331.22.53v6a.75.75 0 01-.22.53l-4.25 4.25A.75.75 0 0111 16H5a.75.75 0 01-.53-.22L.22 11.53A.75.75 0 010 11V5a.75.75 0 01.22-.53L4.47.22zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
