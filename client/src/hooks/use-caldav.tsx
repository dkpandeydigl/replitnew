import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Event, CaldavServer, InsertCaldavServer, InsertCalendar, InsertEvent } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

// Types
type ServerConnectionData = {
  url: string;
  authType: 'username' | 'token';
  username?: string;
  password?: string;
  token?: string;
};

type CalendarUpdateData = {
  id: number;
  data: Partial<Calendar>;
};

type EventData = {
  calendarId: number;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

type EventUpdateData = {
  id: number;
  data: Partial<EventData>;
};

// Interface for CalDAV context
type CalDAVContextType = {
  // Server state
  servers: CaldavServer[];
  serversLoading: boolean;
  serverError: Error | null;
  
  // Calendar state
  calendars: Calendar[];
  calendarsLoading: boolean;
  calendarError: Error | null;
  activeCalendar: Calendar | null;
  setActiveCalendar: (calendar: Calendar | null) => void;
  
  // Event state
  events: Event[];
  eventsLoading: boolean;
  eventError: Error | null;
  
  // Server mutations
  connectServerMutation: any;
  deleteServerMutation: any;
  
  // Calendar mutations
  discoverCalendarsMutation: any;
  updateCalendarMutation: any;
  deleteCalendarMutation: any;
  
  // Event mutations
  createEventMutation: any;
  updateEventMutation: any;
  deleteEventMutation: any;
  
  // Date range
  dateRange: { start: Date | null; end: Date | null };
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  
  // View type
  viewType: string;
  setViewType: (type: string) => void;
};

// Default context with empty values
const defaultContextValue: CalDAVContextType = {
  servers: [],
  serversLoading: false,
  serverError: null,
  
  calendars: [],
  calendarsLoading: false,
  calendarError: null,
  activeCalendar: null,
  setActiveCalendar: () => {},
  
  events: [],
  eventsLoading: false,
  eventError: null,
  
  connectServerMutation: {},
  deleteServerMutation: {},
  
  discoverCalendarsMutation: {},
  updateCalendarMutation: {},
  deleteCalendarMutation: {},
  
  createEventMutation: {},
  updateEventMutation: {},
  deleteEventMutation: {},
  
  dateRange: { start: null, end: null },
  setDateRange: () => {},
  
  viewType: 'dayGridMonth',
  setViewType: () => {}
};

// Create context with default values
export const CalDAVContext = createContext<CalDAVContextType>(defaultContextValue);

// CalDAV Provider
export function CalDAVProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State for active calendar and date range
  const [activeCalendar, setActiveCalendar] = useState<Calendar | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [viewType, setViewType] = useState<string>('dayGridMonth');
  
  // Servers Query
  const {
    data: servers = [],
    isLoading: serversLoading,
    error: serverError,
    refetch: refetchServers
  } = useQuery<CaldavServer[], Error>({
    queryKey: ['/api/servers'],
    enabled: !!user
  });
  
  // Calendars Query
  const {
    data: calendars = [],
    isLoading: calendarsLoading,
    error: calendarError,
    refetch: refetchCalendars
  } = useQuery<Calendar[], Error>({
    queryKey: ['/api/calendars'],
    enabled: !!user
  });
  
  // Events Query
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventError,
    refetch: refetchEvents
  } = useQuery<Event[], Error>({
    queryKey: ['/api/events', activeCalendar?.id, dateRange.start, dateRange.end],
    enabled: !!user && !!activeCalendar,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCalendar) {
        params.append('calendarId', activeCalendar.id.toString());
      }
      if (dateRange.start) {
        params.append('start', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        params.append('end', dateRange.end.toISOString());
      }
      
      const res = await apiRequest('GET', `/api/events?${params.toString()}`);
      return await res.json();
    }
  });
  
  // Set active calendar effect
  useEffect(() => {
    if (calendars.length > 0 && !activeCalendar) {
      setActiveCalendar(calendars[0]);
    }
  }, [calendars, activeCalendar]);
  
  // Server mutations
  const connectServerMutation = useMutation({
    mutationFn: async (data: ServerConnectionData) => {
      const res = await apiRequest('POST', '/api/servers', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connected to CalDAV server',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const deleteServerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/servers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Server removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove server',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Calendar mutations
  const discoverCalendarsMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const res = await apiRequest('POST', '/api/calendars/discover', { serverId });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Discovered ${data.discovered} calendars, added ${data.saved} new calendars`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to discover calendars',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const updateCalendarMutation = useMutation({
    mutationFn: async ({ id, data }: CalendarUpdateData) => {
      const res = await apiRequest('PATCH', `/api/calendars/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Calendar updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update calendar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const deleteCalendarMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/calendars/${id}`);
      return id; // Return the ID so we can use it in onSuccess
    },
    onSuccess: (calendarId) => {
      toast({
        title: 'Success',
        description: 'Calendar removed',
      });
      if (activeCalendar?.id === calendarId) {
        setActiveCalendar(null);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove calendar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Event mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: EventData) => {
      const res = await apiRequest('POST', '/api/events', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: EventUpdateData) => {
      const res = await apiRequest('PATCH', `/api/events/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const contextValue: CalDAVContextType = {
    servers,
    serversLoading,
    serverError,
    
    calendars,
    calendarsLoading,
    calendarError,
    activeCalendar,
    setActiveCalendar,
    
    events,
    eventsLoading,
    eventError,
    
    connectServerMutation,
    deleteServerMutation,
    
    discoverCalendarsMutation,
    updateCalendarMutation,
    deleteCalendarMutation,
    
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
    
    dateRange,
    setDateRange,
    
    viewType,
    setViewType
  };
  
  return (
    <CalDAVContext.Provider value={contextValue}>
      {children}
    </CalDAVContext.Provider>
  );
}

// Hook to use CalDAV context
export function useCalDAV() {
  const context = useContext(CalDAVContext);
  if (!context) {
    throw new Error('useCalDAV must be used within a CalDAVProvider');
  }
  return context;
}
