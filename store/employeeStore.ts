import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Employee, EmployeeFilters, ApiResponse } from '@/types';

interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  loading: boolean;
  error: string | null;
  filters: EmployeeFilters;
  totalEmployees: number;
  currentPage: number;
  pageSize: number;

  // Actions
  setFilters: (filters: Partial<EmployeeFilters>) => void;
  fetchEmployees: (filters?: Partial<EmployeeFilters>) => Promise<void>;
  fetchEmployeeById: (id: string) => Promise<void>;
  createEmployee: (data: Partial<Employee>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  searchEmployees: (query: string) => Promise<void>;
  resetFilters: () => void;
  clearError: () => void;
}

const defaultFilters: EmployeeFilters = {
  page: 1,
  pageSize: 10
};

export const useEmployeeStore = create<EmployeeState>()(
  devtools(
    persist(
      (set, get) => ({
        employees: [],
        selectedEmployee: null,
        loading: false,
        error: null,
        filters: defaultFilters,
        totalEmployees: 0,
        currentPage: 1,
        pageSize: 10,

        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters, page: 1 }
          }));
        },

        fetchEmployees: async (filters) => {
          set({ loading: true, error: null });
          try {
            const state = get();
            const mergedFilters = filters ? { ...state.filters, ...filters } : state.filters;

            const queryParams = new URLSearchParams();
            if (mergedFilters.department) queryParams.append('department', mergedFilters.department);
            if (mergedFilters.status) queryParams.append('status', mergedFilters.status);
            if (mergedFilters.search) queryParams.append('search', mergedFilters.search);
            queryParams.append('page', String(mergedFilters.page || 1));
            queryParams.append('pageSize', String(mergedFilters.pageSize || 10));

            const response = await fetch(`/api/employees?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch employees');

            const data: any = await response.json();
            set({
              employees: data.data,
              totalEmployees: data.total,
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

        fetchEmployeeById: async (id) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${id}`);
            if (!response.ok) throw new Error('Failed to fetch employee');

            const data: ApiResponse<Employee> = await response.json();
            if (data.success && data.data) {
              set({ selectedEmployee: data.data });
            }
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        createEmployee: async (formData) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to create employee');

            const data: ApiResponse<Employee> = await response.json();
            if (data.success && data.data) {
              const newEmployee = data.data as Employee;
              set((state) => ({
                employees: [newEmployee, ...state.employees]
              }));
              return newEmployee;
            }
            throw new Error(data.error || 'Unknown error');
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        updateEmployee: async (id, updateData) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            });

            if (!response.ok) throw new Error('Failed to update employee');

            const data: ApiResponse<any> = await response.json();
            if (data.success) {
              set((state) => ({
                employees: state.employees.map((emp) =>
                  emp.Id === id ? { ...emp, ...updateData } : emp
                ),
                selectedEmployee:
                  state.selectedEmployee?.Id === id
                    ? { ...state.selectedEmployee, ...updateData }
                    : state.selectedEmployee
              }));
            }
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        deleteEmployee: async (id) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/employees/${id}`, {
              method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete employee');

            set((state) => ({
              employees: state.employees.filter((emp) => emp.Id !== id),
              selectedEmployee: state.selectedEmployee?.Id === id ? null : state.selectedEmployee
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        searchEmployees: async (query) => {
          set({ loading: true, error: null });
          try {
            get().setFilters({ search: query, page: 1 });
            await get().fetchEmployees({ search: query });
          } catch (error: any) {
            set({ error: error.message });
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
      { name: 'employeeStore' }
    )
  )
);
