import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Leave, LeaveBalance, LeaveFilters, ApiResponse } from '@/types';

interface LeaveState {
  leaves: Leave[];
  leaveBalance: LeaveBalance | null;
  loading: boolean;
  error: string | null;
  filters: LeaveFilters;
  totalLeaves: number;
  currentPage: number;
  pageSize: number;

  // Actions
  setFilters: (filters: Partial<LeaveFilters>) => void;
  fetchLeaves: (filters?: Partial<LeaveFilters>) => Promise<void>;
  fetchLeaveBalance: (employeeId: string) => Promise<void>;
  applyLeave: (data: Partial<Leave>) => Promise<Leave>;
  approveLeave: (leaveId: string, approvalType: 'TL' | 'HR') => Promise<void>;
  rejectLeave: (leaveId: string, reason: string, rejectionType: 'TL' | 'HR') => Promise<void>;
  cancelLeave: (leaveId: string, reason: string) => Promise<void>;
  resetFilters: () => void;
  clearError: () => void;
}

const defaultFilters: LeaveFilters = {
  page: 1,
  pageSize: 10
};

export const useLeaveStore = create<LeaveState>()(
  devtools(
    persist(
      (set, get) => ({
        leaves: [],
        leaveBalance: null,
        loading: false,
        error: null,
        filters: defaultFilters,
        totalLeaves: 0,
        currentPage: 1,
        pageSize: 10,

        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters, page: 1 }
          }));
        },

        fetchLeaves: async (filters) => {
          set({ loading: true, error: null });
          try {
            const state = get();
            const mergedFilters = filters ? { ...state.filters, ...filters } : state.filters;

            const queryParams = new URLSearchParams();
            if (mergedFilters.status) queryParams.append('status', mergedFilters.status);
            if (mergedFilters.leaveType) queryParams.append('leaveType', mergedFilters.leaveType);
            if (mergedFilters.department) queryParams.append('department', mergedFilters.department);
            if (mergedFilters.search) queryParams.append('search', mergedFilters.search);
            queryParams.append('page', String(mergedFilters.page || 1));
            queryParams.append('pageSize', String(mergedFilters.pageSize || 10));

            const response = await fetch(`/api/leaves?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch leaves');

            const data: any = await response.json();
            set({
              leaves: data.data,
              totalLeaves: data.total,
              currentPage: data.page,
              pageSize: data.pageSize,
              filters: mergedFilters
            });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        fetchLeaveBalance: async (employeeId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/leaves/balance/${employeeId}`);
            if (!response.ok) throw new Error('Failed to fetch leave balance');

            const data: ApiResponse<LeaveBalance> = await response.json();
            if (data.success && data.data) {
              set({ leaveBalance: data.data });
            }
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        applyLeave: async (formData) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/leaves', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to apply leave');

            const data: ApiResponse<Leave> = await response.json();
            if (data.success && data.data) {
              const newLeave = data.data as Leave;
              set((state) => ({
                leaves: [newLeave, ...state.leaves]
              }));
              return newLeave;
            }
            throw new Error(data.error || 'Unknown error');
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        approveLeave: async (leaveId, approvalType) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/leaves/${leaveId}/approve`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ approvalType })
            });

            if (!response.ok) throw new Error('Failed to approve leave');

            set((state) => ({
              leaves: state.leaves.map((leave) =>
                leave.Id === leaveId
                  ? {
                      ...leave,
                      [approvalType === 'TL' ? 'TLApproval' : 'HRApproval']: true,
                      Status: approvalType === 'HR' ? 'Approved' : 'Applied'
                    }
                  : leave
              )
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        rejectLeave: async (leaveId, reason, rejectionType) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/leaves/${leaveId}/reject`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason, rejectionType })
            });

            if (!response.ok) throw new Error('Failed to reject leave');

            set((state) => ({
              leaves: state.leaves.map((leave) =>
                leave.Id === leaveId
                  ? {
                      ...leave,
                      Status: 'Rejected',
                      [rejectionType === 'TL' ? 'CancelReasonTL' : 'CancelReasonHR']: reason
                    }
                  : leave
              )
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        cancelLeave: async (leaveId, reason) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/leaves/${leaveId}/cancel`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Failed to cancel leave');

            set((state) => ({
              leaves: state.leaves.map((leave) =>
                leave.Id === leaveId
                  ? {
                      ...leave,
                      Status: 'Cancelled',
                      CancelReasonHR: reason
                    }
                  : leave
              )
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        resetFilters: () => {
          set({ filters: defaultFilters, currentPage: 1 });
        },

        clearError: () => {
          set({ error: null });
        }
      }),
      { name: 'leaveStore' }
    )
  )
);
