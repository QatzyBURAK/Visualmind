import React, { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#161620',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'modalSlide 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: danger ? 'rgba(220,38,38,0.12)' : 'rgba(124,58,237,0.12)',
          border: `1px solid ${danger ? 'rgba(220,38,38,0.2)' : 'rgba(124,58,237,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}>
          {danger ? (
            <svg width="20" height="20" viewBox="0 0 16 16" fill={danger ? '#ef4444' : '#a78bfa'}>
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575Zm1.763.707a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368Zm.53 3.996v2.5a.75.75 0 01-1.5 0v-2.5a.75.75 0 011.5 0ZM9 11a1 1 0 11-2 0 1 1 0 012 0Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="#a78bfa">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75z" />
            </svg>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8, lineHeight: 1.3 }}>
          {title}
        </div>

        {/* Message */}
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, marginBottom: 24 }}>
          {message}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#22222f';
              e.currentTarget.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            style={{
              padding: '9px 18px',
              background: danger
                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              boxShadow: danger
                ? '0 2px 8px rgba(220,38,38,0.3)'
                : '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
