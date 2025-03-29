
import { createContext, useContext, useState } from 'react';

interface CalDAVContextType {
  servers: any[];
  setServers: (servers: any[]) => void;
  activeServer: any | null;
  setActiveServer: (server: any | null) => void;
}

const CalDAVContext = createContext<CalDAVContextType>({
  servers: [],
  setServers: () => {},
  activeServer: null,
  setActiveServer: () => {},
});

export function CalDAVProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState<any | null>(null);

  return (
    <CalDAVContext.Provider value={{ servers, setServers, activeServer, setActiveServer }}>
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
