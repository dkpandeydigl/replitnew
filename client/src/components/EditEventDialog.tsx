
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { EventFormData } from '@shared/schema';
import { useCalDAV } from '@/hooks/use-caldav';
import { Event } from '@shared/schema';
import { format } from 'date-fns';

interface EditEventDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEventDialog({ event, isOpen, onClose }: EditEventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartDate(format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"));
      setAllDay(event.allDay);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const formData: EventFormData = {
      title,
      description,
      location,
      start: startDate,
      end: endDate,
      allDay,
      calendarId: event.calendarId
    };

    try {
      // Call your update mutation here
      // Example: await updateEventMutation.mutate({ id: event.id, data: formData });
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium">Location</label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium">Start</label>
            <Input
              id="start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium">End</label>
            <Input
              id="end"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allDay"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked as boolean)}
            />
            <label htmlFor="allDay" className="text-sm font-medium">All Day Event</label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Update Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditEventDialogProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEventDialog({ event, isOpen, onClose }: EditEventDialogProps) {
  const { updateEventMutation } = useCalDAV();
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    start: '',
    end: '',
    allDay: false,
    description: '',
    location: '',
    calendarId: 0,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        start: new Date(event.start).toISOString().slice(0, 16),
        end: new Date(event.end).toISOString().slice(0, 16),
        allDay: event.allDay,
        description: event.description || '',
        location: event.location || '',
        calendarId: event.calendarId,
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        ...formData,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title">Title</label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="start">Start</label>
            <Input
              id="start"
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="end">End</label>
            <Input
              id="end"
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allDay"
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData({ ...formData, allDay: checked as boolean })}
            />
            <label htmlFor="allDay">All Day</label>
          </div>
          <div className="space-y-2">
            <label htmlFor="description">Description</label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="location">Location</label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
