import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 16 16" fill="#ef4444">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575Zm1.763.707a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368Zm.53 3.996v2.5a.75.75 0 01-1.5 0v-2.5a.75.75 0 011.5 0ZM9 11a1 1 0 11-2 0 1 1 0 012 0Z" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
            Bir şeyler yanlış gitti
          </div>
          <div style={{ fontSize: 12, color: '#475569', maxWidth: 280, lineHeight: 1.7 }}>
            {this.state.error?.message || 'Beklenmedik bir hata oluştu.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            }}
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
