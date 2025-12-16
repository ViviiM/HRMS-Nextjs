import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ApiResponse, PaginatedResponse, Document } from '@/types';

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;

  fetchDocuments: (employeeId: string) => Promise<void>;
  uploadDocument: (employeeId: string, payload: { fileBase64: string; fileName: string; contentType: string; documentType?: string; category?: string; }) => Promise<void>;
  deleteDocument: (employeeId: string, docId: string) => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    persist(
      (set, get) => ({
        documents: [],
        loading: false,
        error: null,

        fetchDocuments: async (employeeId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${employeeId}/documents`);
            if (!response.ok) throw new Error('Failed to fetch documents');
            const data: ApiResponse<Document[]> = await response.json();
            set({ documents: data.data || [] });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        uploadDocument: async (employeeId, payload) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${employeeId}/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Failed to upload document');
            await get().fetchDocuments(employeeId);
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        deleteDocument: async (employeeId, docId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${employeeId}/documents/${docId}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete document');
            await get().fetchDocuments(employeeId);
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        clearError: () => set({ error: null }),
      }),
      { name: 'documentStore' }
    )
  )
);
