import { createContext, useContext, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Server, Calendar } from '@/lib/types';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  serversLoading: boolean;
  calendarsLoading: boolean;
  selectedServer: Server | null;
  setSelectedServer: (server: Server | null) => void;
  connectServerMutation: any;
  discoverCalendarsMutation: any;
  createServerMutation: any;
  deleteServerMutation: any;
  updateCalendarMutation: any;
  createCalendarMutation: any;
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
  dateRange: { start: Date; end: Date };
  setDateRange: (dateRange: { start: Date; end: Date }) => void;
  viewType: 'month' | 'week' | 'day';
  setViewType: (view: 'month' | 'week' | 'day') => void;
}

const CalDAVContext = createContext<CalDAVContextType | null>(null);

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');

  // Query servers
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      return response.json();
    }
  });

  // Query calendars
  const { data: calendars, isLoading: calendarsLoading, refetch: refetchCalendars } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendars');
      if (!response.ok) throw new Error('Failed to fetch calendars');
      return response.json();
    }
  });

  // Connect server mutation
  const connectServerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/servers/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to connect to server');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchServers();
      refetchCalendars();
    },
    onError: (error) => {
      console.error("Connection error:", error);
      //Add more sophisticated error handling here if needed.
    }
  });

  // Create server mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create server');
      const result = await response.json();
      // Automatically discover calendars after server creation
      if (result.id) {
        await fetch('/api/calendars/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverId: result.id })
        });
      }
      return result;
    },
    onSuccess: () => {
      refetchServers();
      refetchCalendars();
    }
  });

  // Discover calendars mutation
  const discoverCalendarsMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await fetch('/api/calendars/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      if (!response.ok) throw new Error('Failed to discover calendars');
      return response.json();
    },
    onSuccess: () => {
      refetchCalendars();
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
    },
    onSuccess: () => {
      refetchServers();
      refetchCalendars();
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
    },
    onSuccess: () => {
      refetchCalendars();
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
    },
    onSuccess: () => {
      refetchCalendars();
    }
  });

  const refreshCalendars = async () => {
    if (selectedServer?.id) {
      await discoverCalendarsMutation.mutateAsync(selectedServer.id);
    }
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
    discoverCalendarsMutation,
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