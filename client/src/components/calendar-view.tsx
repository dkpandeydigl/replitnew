import { useEffect, useRef, useState } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { Calendar as FullCalendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Loader2, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// No need to import styles directly as they're bundled with the components

interface CalendarViewProps {
  onEventClick: (event: any) => void;
  onDateSelect: (selectInfo: any) => void;
}

export default function CalendarView({ onEventClick, onDateSelect }: CalendarViewProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<FullCalendar | null>(null);
  const [calendarReady, setCalendarReady] = useState(false);

  const {
    events,
    eventsLoading,
    eventError,
    activeCalendar,
    calendars,
    viewType,
    setDateRange
  } = useCalDAV();

  // Initialize calendar
  useEffect(() => {
    if (calendarRef.current && !calendarInstanceRef.current) {
      const calendarEl = calendarRef.current;

      // Create the calendar instance
      const calendar = new FullCalendar(calendarEl, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: false, // We provide our own header
        height: '100%',
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        nowIndicator: true,
        eventClick: (info) => {
          // Get event data directly from extendedProps
          const event = info.event.extendedProps.eventData;
          if (event) {
            onEventClick(event);
          }
        },
        select: onDateSelect,
        datesSet: (dateInfo) => {
          // Update our date range state for event fetching
          setDateRange({
            start: dateInfo.start,
            end: dateInfo.end
          });
        }
      });

      calendar.render();
      calendarInstanceRef.current = calendar;
      setCalendarReady(true);
    }

    // Cleanup
    return () => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
        calendarInstanceRef.current = null;
      }
    };
  }, []);

  // Update calendar view type when it changes
  useEffect(() => {
    if (calendarInstanceRef.current && calendarReady) {
      calendarInstanceRef.current.changeView(viewType);
    }
  }, [viewType, calendarReady]);

  // Update events when they change
  useEffect(() => {
    if (calendarInstanceRef.current && calendarReady && events && !eventsLoading) {
      // First, remove all events
      calendarInstanceRef.current.removeAllEvents();

      // Then add the current events with their calendar colors
      const formattedEvents = events.map(event => {
        const calendar = calendars.find(cal => cal.id === event.calendarId);
        return {
          id: event.id.toString(),
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          backgroundColor: calendar?.color || '#3B82F6',
          borderColor: calendar?.color || '#3B82F6',
          extendedProps: {
            description: event.description,
            location: event.location,
            eventData: event // Add eventData to extendedProps
          }
        };
      });

      calendarInstanceRef.current.addEventSource(formattedEvents);
    }
  }, [events, eventsLoading, calendars, calendarReady]);

  return (
    <div className="relative h-full">
      {/* Loading state overlay */}
      {eventsLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-primary mb-2" />
            <p className="text-gray-600">Loading events...</p>
          </div>
        </div>
      )}

      {/* Error notification */}
      {eventError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load events. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* No active calendar message */}
      {(!activeCalendar || !activeCalendar.id) && !eventsLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center max-w-md p-6">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">No Calendar Selected</h3>
            <p className="text-gray-600">
              Select a calendar from the sidebar to view and manage your events.
              {calendars && calendars.length === 0 && " If you haven't set up any calendars yet, connect to a CalDAV server first."}
            </p>
          </div>
        </div>
      )}

      {/* Calendar container */}
      <div ref={calendarRef} className="h-full" />
    </div>
  );
}