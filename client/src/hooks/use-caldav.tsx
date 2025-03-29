
import { createContext, useContext, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Server, Calendar } from '@/lib/types';
import axios from 'axios';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  serversLoading: boolean;
  connectServerMutation: any;
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
}

const CalDAVContext = createContext<CalDAVContextType | undefined>(undefined);

export function useCalDAV() {
  const context = useContext(CalDAVContext);
  if (!context) {
    throw new Error('useCalDAV must be used within a CalDAVProvider');
  }

  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await axios.get('/api/servers');
      return response.data;
    }
  });

  const connectServerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/api/servers/connect', data);
      return response.data;
    }
  });

  return {
    servers: servers || [],
    serversLoading,
    connectServerMutation,
    refreshCalendars: async () => {},
    refreshServers: async () => {}
  };
}

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  return (
    <CalDAVContext.Provider value={useCalDAV()}>
      {children}
    </CalDAVContext.Provider>
  );
}
