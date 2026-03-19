import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { group: 'Navigasyon', items: [
    { keys: ['Ctrl', 'K'], desc: 'Semantik Arama' },
    { keys: ['Ctrl', 'D'], desc: 'Belgeler sekmesi' },
    { keys: ['Ctrl', 'U'], desc: 'Yeni belge yükle' },
    { keys: ['?'], desc: 'Bu yardım ekranı' },
  ]},
  { group: 'Sohbet', items: [
    { keys: ['Enter'], desc: 'Mesaj gönder' },
    { keys: ['Shift', 'Enter'], desc: 'Yeni satır' },
  ]},
  { group: 'Arama', items: [
    { keys: ['Esc'], desc: 'Aramayı temizle' },
  ]},
];

export default function ShortcutsModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '28px 32px', minWidth: 380, maxWidth: 460,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'modalSlide 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
              Klavye Kısayolları
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
              Daha hızlı çalışmak için kısayolları kullanın
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, width: 32, height: 32, color: '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#22222f'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#7c3aed',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item) => (
                  <div key={item.desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.desc}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span style={{ fontSize: 11, color: '#475569' }}>+</span>}
                          <kbd style={{
                            background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 5, padding: '2px 8px', fontSize: 11,
                            fontFamily: 'monospace', color: '#e2e8f0', lineHeight: 1.6,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          }}>
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 11, color: '#475569', textAlign: 'center',
        }}>
          <kbd style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>Esc</kbd>
          {' '}veya dışarı tıkla kapatmak için
        </div>
      </div>
    </div>
  );
}
