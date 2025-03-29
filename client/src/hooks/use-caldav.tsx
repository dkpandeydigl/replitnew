import { createContext, useContext, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Server, Calendar } from '@/lib/types';
import axios from 'axios';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  serversLoading: boolean;
  connectServerMutation: any;
  discoverCalendarsMutation: any;
  updateCalendarMutation: any;
  createCalendarMutation: any;
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  dateRange: { start: Date; end: Date };
  setDateRange: (dateRange: { start: Date; end: Date }) => void;
}

export const CalDAVContext = createContext<CalDAVContextType | null>(null);

export function useCalDAV() {
  const context = useContext(CalDAVContext);
  if (!context) {
    throw new Error('useCalDAV must be used within a CalDAVProvider');
  }
  return context;
}

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });

  const { data: servers = [], isLoading: serversLoading } = useQuery({
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

  const refreshCalendars = async () => {
    const response = await axios.get('/api/calendars');
    setCalendars(response.data);
  };

  const refreshServers = async () => {
    await axios.get('/api/servers');
  };

  const discoverCalendarsMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const response = await axios.post(`/api/servers/${serverId}/discover`);
      return response.data;
    },
    onSuccess: () => {
      refreshCalendars();
    }
  });

  const updateCalendarMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await axios.put(`/api/calendars/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      refreshCalendars();
    }
  });

  const createCalendarMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/api/calendars', data);
      return response.data;
    },
    onSuccess: () => {
      refreshCalendars();
    }
  });

  const value = {
    servers,
    calendars,
    serversLoading,
    connectServerMutation,
    discoverCalendarsMutation,
    updateCalendarMutation,
    createCalendarMutation,
    refreshCalendars,
    refreshServers,
    dateRange,
    setDateRange
  };

  return (
    <CalDAVContext.Provider value={value}>
      {children}
    </CalDAVContext.Provider>
  );
}