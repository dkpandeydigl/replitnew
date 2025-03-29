
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Server, Calendar } from '@/lib/types';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  connectServerMutation: {
    isPending: boolean;
    mutate: (data: any) => Promise<void>;
  };
  serversLoading: boolean;
}

const CalDAVContext = createContext<CalDAVContextType>({
  servers: [],
  calendars: [],
  refreshCalendars: async () => {},
  refreshServers: async () => {},
  connectServerMutation: {
    isPending: false,
    mutate: async () => {},
  },
  serversLoading: false,
});

export function useCalDAV() {
  const context = useContext(CalDAVContext);
  if (!context) {
    throw new Error('useCalDAV must be used within a CalDAVProvider');
  }
  return context;
}

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const refreshCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendars');
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const data = await response.json();
      setCalendars(data);
    } catch (error) {
      console.error('Error refreshing calendars:', error);
    }
  }, []);

  const refreshServers = useCallback(async () => {
    try {
      setServersLoading(true);
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Error refreshing servers:', error);
    } finally {
      setServersLoading(false);
    }
  }, []);

  const mutate = async (data: any) => {
    try {
      setIsPending(true);
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to connect to server');
      await refreshServers();
    } catch (error) {
      console.error('Error connecting to server:', error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const value = {
    servers,
    calendars,
    refreshCalendars,
    refreshServers,
    connectServerMutation: {
      isPending,
      mutate,
    },
    serversLoading,
  };

  return (
    <CalDAVContext.Provider value={value}>
      {children}
    </CalDAVContext.Provider>
  );
}
