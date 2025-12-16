import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Payroll, PayrollSummary, ApiResponse } from '@/types';

interface PayrollState {
  payrolls: Payroll[];
  payrollSummary: PayrollSummary | null;
  loading: boolean;
  error: string | null;
  currentMonth: string;
  currentYear: number;

  // Actions
  fetchPayrolls: (month?: string, year?: number) => Promise<void>;
  fetchPayrollSummary: (month: string, year: number) => Promise<void>;
  generatePayroll: (month: string, year: number, employeeIds: string[]) => Promise<void>;
  updatePayrollStatus: (payrollId: string, status: 'Generated' | 'Paid') => Promise<void>;
  downloadPayslip: (payrollId: string) => Promise<void>;
  generateBankFile: (month: string, year: number) => Promise<Blob>;
  clearError: () => void;
}

export const usePayrollStore = create<PayrollState>()(
  devtools(
    persist(
      (set, get) => ({
        payrolls: [],
        payrollSummary: null,
        loading: false,
        error: null,
        currentMonth: new Date().toISOString().split('-').slice(0, 2).join('-'),
        currentYear: new Date().getFullYear(),

        fetchPayrolls: async (month, year) => {
          set({ loading: true, error: null });
          try {
            const queryMonth = month || get().currentMonth;
            const queryYear = year || get().currentYear;

            const queryParams = new URLSearchParams();
            queryParams.append('month', queryMonth);
            queryParams.append('year', String(queryYear));

            const response = await fetch(`/api/payroll?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch payroll');

            const data: any = await response.json();
            set({
              payrolls: data.data,
              currentMonth: queryMonth,
              currentYear: queryYear
            });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        fetchPayrollSummary: async (month, year) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/payroll/summary?month=${month}&year=${year}`);
            if (!response.ok) throw new Error('Failed to fetch payroll summary');

            const data: ApiResponse<PayrollSummary> = await response.json();
            if (data.success && data.data) {
              set({ payrollSummary: data.data });
            }
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        generatePayroll: async (month, year, employeeIds) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/payroll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ month, year, employeeIds })
            });

            if (!response.ok) throw new Error('Failed to generate payroll');

            await get().fetchPayrolls(month, year);
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        updatePayrollStatus: async (payrollId, status) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/payroll/${payrollId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error('Failed to update payroll status');

            set((state) => ({
              payrolls: state.payrolls.map((payroll) =>
                payroll.Id === payrollId ? { ...payroll, Status: status } : payroll
              )
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        downloadPayslip: async (payrollId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/payroll/payslip/${payrollId}`);
            if (!response.ok) throw new Error('Failed to download payslip');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payslip-${payrollId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        generateBankFile: async (month, year) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/payroll/generate-txt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ month, year })
            });

            if (!response.ok) throw new Error('Failed to generate bank file');

            const blob = await response.blob();
            return blob;
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        clearError: () => {
          set({ error: null });
        }
      }),
      { name: 'payrollStore' }
    )
  )
);
