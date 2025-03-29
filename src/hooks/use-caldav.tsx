
import { createContext, useContext, useState, ReactNode } from 'react';

interface CalDAVContextType {
  events: any[];
  eventsLoading: boolean;
  eventError: Error | null;
  activeCalendar: any | null;
  calendars: any[];
  viewType: string;
  servers: any[];
  setDateRange: (start: Date, end: Date) => void;
  setServers: (servers: any[]) => void;
  setActiveCalendar: (calendar: any) => void;
}

const defaultContext: CalDAVContextType = {
  events: [],
  eventsLoading: false,
  eventError: null,
  activeCalendar: null,
  calendars: [],
  viewType: 'month',
  servers: [],
  setDateRange: () => {},
  setServers: () => {},
  setActiveCalendar: () => {}
};

const CalDAVContext = createContext<CalDAVContextType>(defaultContext);

export function CalDAVProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventError, setEventError] = useState<Error | null>(null);
  const [activeCalendar, setActiveCalendar] = useState<any | null>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [viewType, setViewType] = useState('month');
  const [servers, setServers] = useState<any[]>([]);

  const setDateRange = (start: Date, end: Date) => {
    // Implement date range logic here
  };

  return (
    <CalDAVContext.Provider 
      value={{
        events,
        eventsLoading,
        eventError,
        activeCalendar,
        calendars,
        viewType,
        servers,
        setDateRange,
        setServers,
        setActiveCalendar
      }}
    >
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
