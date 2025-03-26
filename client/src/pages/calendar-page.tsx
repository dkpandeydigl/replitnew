import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import CalendarView from "@/components/calendar-view";
import EventModal from "@/components/event-modal";
import { CalDAVProvider } from "@/hooks/use-caldav";
import { Plus } from "lucide-react";

export default function CalendarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setEventModalOpen(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
    });
    setEventModalOpen(true);
  };

  const handleAddEvent = () => {
    const now = new Date();
    const end = new Date();
    end.setHours(now.getHours() + 1);
    
    setSelectedEvent({
      start: now,
      end: end,
      allDay: false,
    });
    setEventModalOpen(true);
  };

  return (
    <CalDAVProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar} 
          isMobile={isMobile} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            onToggleSidebar={toggleSidebar} 
            onAddEvent={handleAddEvent} 
          />
          
          <main className="flex-1 overflow-y-auto bg-white p-4">
            <CalendarView 
              onEventClick={handleEventClick} 
              onDateSelect={handleDateSelect} 
            />
          </main>
          
          {/* Mobile add event button */}
          <div className="sm:hidden fixed bottom-4 right-4">
            <button 
              onClick={handleAddEvent}
              className="bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        
        <EventModal 
          isOpen={eventModalOpen} 
          onClose={() => setEventModalOpen(false)} 
          event={selectedEvent}
        />
      </div>
    </CalDAVProvider>
  );
}
