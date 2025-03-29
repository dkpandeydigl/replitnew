import { useEffect, useRef, useState } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { Calendar as FullCalendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Loader2, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CalendarView({ onEventClick, onDateSelect }: { onEventClick: (event: any) => void; onDateSelect: (selectInfo: any) => void; }) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const { activeCalendar, events, isLoadingEvents, eventsError, setDateRange } = useCalDAV();
  const [calendar, setCalendar] = useState<FullCalendar | null>(null);

  useEffect(() => {
    if (!calendarRef.current) return;

    const calendarEl = calendarRef.current;
    if (!calendarEl) return;

    // Create the calendar instance
    const calendar = new FullCalendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: false,
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
    setCalendar(calendar);

    return () => {
      calendar.destroy();
    };
  }, [calendarRef.current, onEventClick, onDateSelect, setDateRange]);

  useEffect(() => {
    if (calendar && events) {
      calendar.removeAllEvents();
      const formattedEvents = events.map(event => ({
        id: event.id.toString(),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: '#3B82F6', // Default color
        borderColor: '#3B82F6',    // Default color
        extendedProps: {
          description: event.description,
          location: event.location,
          eventData: event // Add eventData to extendedProps
        }
      }));
      calendar.addEventSource(formattedEvents);
    }
  }, [calendar, events]);

  if (isLoadingEvents) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-8 w-8 text-primary mb-2" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (eventsError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load events. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!activeCalendar || !activeCalendar.id) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
        <div className="text-center max-w-md p-6">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">No Calendar Selected</h3>
          <p className="text-gray-600">
            Select a calendar from the sidebar to view and manage your events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={calendarRef} className="h-full" />
    </div>
  );
}