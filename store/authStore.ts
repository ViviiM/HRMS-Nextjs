import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'Employee' | 'Intern';

export interface EmployeeContext {
  employeeId?: string;
  department?: string;
  teamLeadId?: string;
  leaveBalance?: {
    annualLeave: number;
    casualLeave: number;
    sickLeave: number;
    earnedLeave: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profilePhoto?: string;
  department?: string;
  employeeContext?: EmployeeContext;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  sessionToken?: string;

  // Actions
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (requiredRoles: UserRole[]) => boolean;
  canAccessModule: (moduleName: string) => boolean;
}

const rolePermissions: Record<UserRole, string[]> = {
  Admin: ['employees', 'leaves', 'payroll', 'assets', 'nda', 'training', 'handbook', 'reports', 'audit'],
  HR: ['employees', 'leaves', 'payroll', 'assets', 'nda', 'training', 'handbook', 'reports'],
  Manager: ['employees', 'leaves', 'assets', 'training'],
  Employee: ['profile', 'leaves', 'calendar', 'training', 'handbook'],
  Intern: ['profile', 'leaves', 'training', 'handbook'],
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        sessionToken: undefined,

        // Initialize Auth (called on app startup)
        initializeAuth: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/auth/session');
            if (!response.ok) throw new Error('Not authenticated');

            const data: any = await response.json();
            set({
              user: data.user,
              isAuthenticated: true,
              sessionToken: data.token,
            });
          } catch (error: any) {
            set({
              user: null,
              isAuthenticated: false,
              error: error.message,
            });
          } finally {
            set({ loading: false });
          }
        },

        // Set User (for manual updates)
        setUser: (user) => {
          set({
            user,
            isAuthenticated: !!user,
          });
        },

        // Update User Profile
        updateUserProfile: async (updates) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });

            if (!response.ok) throw new Error('Failed to update profile');

            const data: any = await response.json();
            set({
              user: { ...get().user, ...data.user },
            });
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Logout
        logout: async () => {
          set({ loading: true, error: null });
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
            set({
              user: null,
              isAuthenticated: false,
              sessionToken: undefined,
            });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        // Check if user has specific roles
        hasRole: (requiredRoles) => {
          const user = get().user;
          return user ? requiredRoles.includes(user.role) : false;
        },

        // Check if user can access module
        canAccessModule: (moduleName) => {
          const user = get().user;
          if (!user) return false;
          const permissions = rolePermissions[user.role] || [];
          return permissions.includes(moduleName);
        },

        // Clear Error
        clearError: () => {
          set({ error: null });
        },
      }),
      { name: 'authStore' }
    )
  )
);
