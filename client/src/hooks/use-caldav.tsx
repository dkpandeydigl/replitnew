
import { createContext, useContext, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Server, Calendar } from '@/lib/types';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  serversLoading: boolean;
  calendarsLoading: boolean;
  selectedServer: Server | null;
  setSelectedServer: (server: Server | null) => void;
  connectServerMutation: any;
  createServerMutation: any;
  deleteServerMutation: any;
  updateCalendarMutation: any;
  createCalendarMutation: any; any;
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  dateRange: { start: Date; end: Date };
  setDateRange: (dateRange: { start: Date; end: Date }) => void;
  viewType: string;
  setViewType: (view: string) => void;
}

export const CalDAVContext = createContext<CalDAVContextType | null>(null);

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });
  const [viewType, setViewType] = useState<string>('dayGridMonth');

  // Fetch servers
  const { data: servers = [], isLoading: serversLoading, refetch: refetchServers } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      return response.json();
    }
  });

  // Fetch calendars
  const { data: calendars = [], isLoading: calendarsLoading, refetch: refetchCalendars } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendars');
      if (!response.ok) throw new Error('Failed to fetch calendars');
      return response.json();
    }
  });

  // Create server mutation
  const connectServerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/servers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to connect to server');
      return response.json();
    },
    onSuccess: () => {
      refetchServers();
    }
  });

  const createServerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create server');
      return response.json();
    }
  });

  // Delete server mutation
  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete server');
      return response.json();
    }
  });

  // Update calendar mutation
  const updateCalendarMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/calendars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update calendar');
      return response.json();
    }
  });

  // Create calendar mutation
  const createCalendarMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create calendar');
      return response.json();
    }
  });

  const refreshCalendars = async () => {
    await refetchCalendars();
  };

  const refreshServers = async () => {
    await refetchServers();
  };

  const value = {
    servers,
    calendars,
    serversLoading,
    calendarsLoading,
    selectedServer,
    setSelectedServer,
    connectServerMutation,
    createServerMutation,
    deleteServerMutation,
    updateCalendarMutation,
    createCalendarMutation,
    refreshCalendars,
    refreshServers,
    dateRange,
    setDateRange,
    viewType,
    setViewType
  };

  return (
    <CalDAVContext.Provider value={value}>
      {children}
    </CalDAVContext.Provider>
  );
}

export function useCalDAV() {
  const context = useContext(CalDAVContext);
  if (!context) {
    throw new Error('useCalDAV must be used within a CalDAVProvider');
  }
  return context;
}
