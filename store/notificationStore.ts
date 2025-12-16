import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
  action?: {
    label: string;
    url: string;
  };
}

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  getNotificationsByType: (type: NotificationType) => Notification[];
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,

        // Fetch Notifications from API
        fetchNotifications: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/notifications');
            if (!response.ok) throw new Error('Failed to fetch notifications');

            const data: any = await response.json();
            const notifications = data.data || [];

            set({
              notifications,
              unreadCount: notifications.filter((n: Notification) => !n.read).length,
            });
          } catch (error: any) {
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        },

        // Add Local Notification (optimistic update)
        addNotification: (notification) => {
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            read: false,
          };

          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        },

        // Mark Single Notification as Read
        markAsRead: async (notificationId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ read: true }),
            });

            if (!response.ok) throw new Error('Failed to update notification');

            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Mark All Notifications as Read
        markAllAsRead: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/notifications/mark-all-read', {
              method: 'PUT',
            });

            if (!response.ok) throw new Error('Failed to mark all as read');

            set((state) => ({
              notifications: state.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Delete Single Notification
        deleteNotification: async (notificationId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete notification');

            set((state) => {
              const notification = state.notifications.find((n) => n.id === notificationId);
              return {
                notifications: state.notifications.filter((n) => n.id !== notificationId),
                unreadCount: notification && !notification.read
                  ? Math.max(0, state.unreadCount - 1)
                  : state.unreadCount,
              };
            });
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Delete All Notifications
        deleteAllNotifications: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/notifications', {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete all notifications');

            set({
              notifications: [],
              unreadCount: 0,
            });
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Get Notifications by Type
        getNotificationsByType: (type) => {
          return get().notifications.filter((n) => n.type === type);
        },

        // Clear Error
        clearError: () => {
          set({ error: null });
        },
      }),
      { name: 'notificationStore' }
    )
  )
);
