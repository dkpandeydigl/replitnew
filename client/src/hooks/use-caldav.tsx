import { createContext, useContext, useCallback } from 'react';
import { type Server, type Calendar } from '@shared/schema';

interface CalDAVContextType {
  servers: Server[];
  calendars: Calendar[];
  refreshCalendars: () => Promise<void>;
  refreshServers: () => Promise<void>;
}

const defaultContextValue: CalDAVContextType = {
  servers: [],
  calendars: [],
  refreshCalendars: async () => {},
  refreshServers: async () => {},
};

export const CalDAVContext = createContext<CalDAVContextType>(defaultContextValue);

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
    // Placeholder for fetching calendars
    try {
        const mockCalendars = [
          {id: 1, name: 'Calendar 1'},
          {id: 2, name: 'Calendar 2'}
        ]; // Replace with actual API call
        setCalendars(mockCalendars);
      } catch(e) {
        console.error("Error refreshing calendars", e);
      }
  }, []);

  const refreshServers = useCallback(async () => {
    // Placeholder for fetching servers
    try {
        const mockServers = [
          {id: 1, url: 'http://example.com'},
          {id: 2, url: 'http://another-example.com'}
        ]; // Replace with actual API call
        setServers(mockServers);
      } catch(e) {
        console.error("Error refreshing servers", e);
      }
  }, []);

  const value = { servers, calendars, refreshCalendars, refreshServers };

  return (
    <CalDAVContext.Provider value={value}>
      {children}
    </CalDAVContext.Provider>
  );
}