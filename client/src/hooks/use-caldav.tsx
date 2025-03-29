
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Server, Calendar } from '@/lib/types';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
}

const CalDAVContext = createContext<CalDAVContextType | undefined>(undefined);

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
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Error refreshing servers:', error);
    }
  }, []);

  const value = {
    servers,
    calendars,
    refreshCalendars,
    refreshServers
  };

  return (
    <CalDAVContext.Provider value={value}>
      {children}
    </CalDAVContext.Provider>
  );
}
