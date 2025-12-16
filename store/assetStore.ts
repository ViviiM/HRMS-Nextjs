import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Asset, AssetAssignment, AssetFilters, ApiResponse, PaginatedResponse } from '@/types';

interface AssetState {
  // State
  assets: Asset[];
  assignments: AssetAssignment[];
  selectedAsset: Asset | null;
  selectedAssignment: AssetAssignment | null;
  loading: boolean;
  error: string | null;
  filters: AssetFilters;
  totalAssets: number;
  currentPage: number;
  pageSize: number;

  // Asset Actions
  setFilters: (filters: AssetFilters) => void;
  fetchAssets: (filters?: AssetFilters) => Promise<void>;
  fetchAssetById: (assetId: string) => Promise<void>;
  createAsset: (data: {
    Name: string;
    Category__c: string;
    SerialNumber__c: string;
    PurchaseDate__c: string;
    Cost__c: number;
    Supplier__c?: string;
    Warranty_Months__c?: number;
  }) => Promise<void>;
  updateAssetStatus: (assetId: string, status: 'Active' | 'Damaged' | 'Lost' | 'Archived') => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;

  // Assignment Actions
  assignAsset: (data: {
    Asset__c: string;
    EmployeeId__c: string;
    AssignmentDate__c: string;
    Condition__c?: string;
  }) => Promise<void>;
  fetchAssignments: (assetId?: string, employeeId?: string) => Promise<void>;
  returnAsset: (assignmentId: string, returnDate: string, condition: string) => Promise<void>;
  updateAssignmentStatus: (assignmentId: string, status: 'Active' | 'Returned' | 'Damaged') => Promise<void>;

  // Utility Actions
  searchAssets: (query: string) => Promise<void>;
  resetFilters: () => void;
  clearError: () => void;
}

const defaultFilters: AssetFilters = {
  category: undefined,
  status: undefined,
  search: undefined,
};

export const useAssetStore = create<AssetState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        assets: [],
        assignments: [],
        selectedAsset: null,
        selectedAssignment: null,
        loading: false,
        error: null,
        filters: defaultFilters,
        totalAssets: 0,
        currentPage: 1,
        pageSize: 10,

        // Filter Actions
        setFilters: (filters) => {
          set({ filters, currentPage: 1 });
          get().fetchAssets(filters);
        },

        // Fetch Assets with Filters and Pagination
        fetchAssets: async (filters) => {
          set({ loading: true, error: null });
          try {
            const appliedFilters = filters || get().filters;
            const { currentPage, pageSize } = get();

            const queryParams = new URLSearchParams();
            queryParams.append('page', String(currentPage));
            queryParams.append('pageSize', String(pageSize));

            if (appliedFilters.category) {
              queryParams.append('category', appliedFilters.category);
            }
            if (appliedFilters.status) {
              queryParams.append('status', appliedFilters.status);
            }
            if (appliedFilters.search) {
              queryParams.append('search', appliedFilters.search);
            }

            const response = await fetch(`/api/assets?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch assets');

            const data: PaginatedResponse<Asset> = await response.json();
            set({
              assets: data.data,
              totalAssets: data.total,
              currentPage: data.page,
              filters: appliedFilters,
            });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        // Fetch Single Asset
        fetchAssetById: async (assetId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/assets/${assetId}`);
            if (!response.ok) throw new Error('Failed to fetch asset');

            const data: ApiResponse<Asset> = await response.json();
            set({ selectedAsset: data.data || null });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        // Create Asset
        createAsset: async (data) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/assets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to create asset');

            await get().fetchAssets();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Update Asset Status
        updateAssetStatus: async (assetId, status) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/assets/${assetId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ Status__c: status }),
            });

            if (!response.ok) throw new Error('Failed to update asset');

            await get().fetchAssets();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Delete Asset
        deleteAsset: async (assetId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/assets/${assetId}`, {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete asset');

            await get().fetchAssets();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Assign Asset to Employee
        assignAsset: async (data) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/assets/assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to assign asset');

            await get().fetchAssignments();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Fetch Assignments
        fetchAssignments: async (assetId, employeeId) => {
          set({ loading: true, error: null });
          try {
            const queryParams = new URLSearchParams();
            if (assetId) queryParams.append('assetId', assetId);
            if (employeeId) queryParams.append('employeeId', employeeId);

            const response = await fetch(
              `/api/assets/assignments?${queryParams}`,
              { method: 'GET' }
            );

            if (!response.ok) throw new Error('Failed to fetch assignments');

            const data: ApiResponse<AssetAssignment[]> = await response.json();
            set({ assignments: data.data || [] });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        // Return Asset
        returnAsset: async (assignmentId, returnDate, condition) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/assets/assignments/${assignmentId}/return`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ReturnDate__c: returnDate,
                FinalCondition__c: condition,
                Status__c: 'Returned',
              }),
            });

            if (!response.ok) throw new Error('Failed to return asset');

            await get().fetchAssignments();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Update Assignment Status
        updateAssignmentStatus: async (assignmentId, status) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/assets/assignments/${assignmentId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ Status__c: status }),
            });

            if (!response.ok) throw new Error('Failed to update assignment');

            await get().fetchAssignments();
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Search Assets
        searchAssets: async (query) => {
          set({ currentPage: 1 });
          await get().setFilters({ ...get().filters, search: query });
        },

        // Reset Filters
        resetFilters: () => {
          set({ filters: defaultFilters, currentPage: 1 });
          get().fetchAssets(defaultFilters);
        },

        // Clear Error
        clearError: () => {
          set({ error: null });
        },
      }),
      { name: 'assetStore' }
    )
  )
);
