import { useCalDAV } from '@/hooks/use-caldav';
import { BarChart, ChevronLeft, ChevronRight, Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onAddEvent: () => void;
}

export default function Header({ onToggleSidebar, onAddEvent }: HeaderProps) {
  const { 
    activeCalendar, 
    viewType, 
    setViewType 
  } = useCalDAV();
  
  const [currentDateRange, setCurrentDateRange] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Update date range display based on view type
  useEffect(() => {
    updateDateRangeText(currentDate);
  }, [viewType, currentDate]);
  
  const updateDateRangeText = (date: Date) => {
    if (viewType === 'dayGridMonth') {
      setCurrentDateRange(format(date, 'MMMM yyyy'));
    } else if (viewType === 'timeGridWeek') {
      // This is simplified; a real implementation would show start-end of week
      setCurrentDateRange(`Week of ${format(date, 'MMM d, yyyy')}`);
    } else if (viewType === 'timeGridDay') {
      setCurrentDateRange(format(date, 'EEEE, MMMM d, yyyy'));
    }
  };
  
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewType === 'timeGridDay') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
    
    // This would normally update the calendar view
    // but we're assuming the calendar component handles this
    // through a provided API
  };
  
  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'dayGridMonth') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === 'timeGridWeek') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewType === 'timeGridDay') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleViewChange = (type: string) => {
    setViewType(type);
  };
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden mr-4 text-gray-500 hover:text-gray-700 p-2"
            onClick={onToggleSidebar}
          >
            <Menu size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-medium">
              {activeCalendar?.name || "Calendar"}
            </h1>
            <p className="text-sm text-gray-500">{currentDateRange}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <div className="hidden sm:flex bg-gray-100 rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewType === 'dayGridMonth' ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => handleViewChange('dayGridMonth')}
            >
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewType === 'timeGridWeek' ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => handleViewChange('timeGridWeek')}
            >
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewType === 'timeGridDay' ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => handleViewChange('timeGridDay')}
            >
              Day
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={handleToday}
          >
            Today
          </Button>
          
          <div className="flex">
            <Button
              variant="outline"
              size="sm"
              className="rounded-r-none"
              onClick={handlePrev}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-l-none border-l-0"
              onClick={handleNext}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          
          <Button
            variant="default"
            size="sm"
            className="hidden sm:flex items-center bg-primary hover:bg-primary/90"
            onClick={onAddEvent}
          >
            <Plus size={16} className="mr-1" />
            <span>Event</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
