import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../types/sismut';

interface RealtimeContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  revision: number;
  lastEvent: { event: string; timestamp: string } | null;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);
  const [lastEvent, setLastEvent] = useState<{ event: string; timestamp: string } | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // ignore transient errors
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setNotifications([]);
      setConnected(false);
      return;
    }

    refreshNotifications();

    const sb = supabase;
    const channel = sb
      .channel('sismut-supabase-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supervisions' }, () => {
        setRevision((r) => r + 1);
        setLastEvent({ event: 'supervision:updated', timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'findings' }, () => {
        setRevision((r) => r + 1);
        setLastEvent({ event: 'finding:updated', timestamp: new Date().toISOString() });
        refreshNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => {
        setRevision((r) => r + 1);
        setLastEvent({ event: 'followup:submitted', timestamp: new Date().toISOString() });
        refreshNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        setRevision((r) => r + 1);
        setLastEvent({ event: 'profiles:updated', timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
        setRevision((r) => r + 1);
        setLastEvent({ event: 'units:updated', timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        refreshNotifications();
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [user, refreshNotifications]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        unreadCount,
        connected,
        revision,
        lastEvent,
        refreshNotifications,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider');
  return ctx;
}
