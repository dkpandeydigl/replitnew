import React, { createContext, useContext, useState } from 'react';
import type { Server, Calendar } from '@/lib/types';
import { useMutation, useQuery } from '@tanstack/react-query';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  connectServerMutation: any;
}

const CalDAVContext = createContext<CalDAVContextType>({
  servers: [],
  calendars: [],
  refreshCalendars: async () => {},
  refreshServers: async () => {},
  connectServerMutation: null,
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

  const connectServerMutation = useMutation({
    mutationFn: async (serverData: any) => {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });
      if (!response.ok) throw new Error('Failed to connect to server');
      return response.json();
    },
  });

  const refreshServers = async () => {
    const response = await fetch('/api/servers');
    const data = await response.json();
    setServers(data);
  };

  const refreshCalendars = async () => {
    const response = await fetch('/api/calendars');
    const data = await response.json();
    setCalendars(data);
  };

  return (
    <CalDAVContext.Provider value={{ 
      servers, 
      calendars, 
      refreshCalendars, 
      refreshServers,
      connectServerMutation 
    }}>
      {children}
    </CalDAVContext.Provider>
  );
}