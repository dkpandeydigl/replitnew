
import React, { createContext, useContext, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Server, Calendar } from '@/lib/types';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  connectServerMutation: any;
  serversLoading: boolean;
}

const CalDAVContext = createContext<CalDAVContextType>({
  servers: [],
  calendars: [],
  refreshCalendars: async () => {},
  refreshServers: async () => {},
  connectServerMutation: {
    isPending: false,
    mutate: async () => {}
  },
  serversLoading: false
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

  const connectServerMutation = useMutation({
    mutationFn: async (serverData: any) => {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });
      if (!response.ok) throw new Error('Failed to connect to server');
      return response.json();
    }
  });

  const refreshServers = async () => {
    setServersLoading(true);
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data);
    } finally {
      setServersLoading(false);
    }
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
      connectServerMutation,
      serversLoading
    }}>
      {children}
    </CalDAVContext.Provider>
  );
}
