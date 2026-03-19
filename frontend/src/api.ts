import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8100/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Log errors in development
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if ((import.meta as any).env?.DEV) {
      console.error('[API Error]', {
        url: err?.config?.url,
        status: err?.response?.status,
        message: err?.response?.data?.detail || err?.message,
      });
    }
    return Promise.reject(err);
  }
);

// --- Tipler ---

export type DocType = 'invoice' | 'receipt' | 'technical' | 'generic';

export interface Document {
  id: string;
  filename: string;
  doc_type: DocType;
  status: string;
  created_at: string;
  extracted_data?: Record<string, any>;
  file_path?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskResponse {
  answer: string;
  chat_history_length: number;
}

// --- API Fonksiyonları ---

/** Tüm belgeleri listele */
export async function getDocuments(): Promise<Document[]> {
  const res = await api.get<Document[]>('/documents');
  return res.data;
}

/** Belge detayını getir */
export async function getDocument(id: string): Promise<Document> {
  const res = await api.get<Document>(`/documents/${id}`);
  return res.data;
}

export interface UploadResponse {
  document_id: number;
  status: string;
  message: string;
}

/** Belge yükle */
export async function uploadDocument(file: File, docType: DocType): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  const res = await api.post<UploadResponse>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/** Belgeye soru sor (AI yanıtı uzun sürebilir — 60s timeout) */
export async function askQuestion(documentId: string, question: string): Promise<AskResponse> {
  const res = await api.post<AskResponse>(
    `/documents/${documentId}/ask`,
    { document_id: documentId, question },
    { timeout: 120000 }
  );
  return res.data;
}

/** Chat geçmişini temizle */
export async function clearHistory(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}/history`);
}

/** Sağlık kontrolü */
export async function healthCheck(): Promise<boolean> {
  try {
    const healthUrl = ((import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8100/api/v1')
      .replace('/api/v1', '/health');
    await axios.get(healthUrl, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Belge sil */
export const deleteDocument = (id: string) =>
  api.delete(`/documents/${id}`);

/** Belge yeniden adlandır */
export const renameDocument = (id: string, filename: string) =>
  api.patch<{ id: number; filename: string }>(`/documents/${id}`, { filename });

/** Belge durumu (polling için) */
export const getDocumentStatus = (id: string) =>
  api.get<{ status: string; id: string }>(`/documents/${id}/status`);

/** Chat geçmişi */
export const getChatHistory = (id: string) =>
  api.get<{ role: 'user' | 'assistant'; content: string }[]>(`/documents/${id}/history`);

/** Semantik arama */
export const searchDocuments = (query: string) =>
  api.post<{ query: string; results: Document[] }>(`/search?query=${encodeURIComponent(query)}`);
