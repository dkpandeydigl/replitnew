
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { useToast } from './ui/use-toast';
import { EventFormData, Event } from '@shared/schema';
import { useCalDAV } from '@/hooks/use-caldav';

interface EditEventDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEventDialog({ event, isOpen, onClose }: EditEventDialogProps) {
  const { updateEvent } = useCalDAV();
  const { toast } = useToast();
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    start: '',
    end: '',
    allDay: false,
    calendarId: 0
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start: format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"),
        end: format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"),
        allDay: event.allDay,
        calendarId: event.calendarId
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      await updateEvent(event.id, {
        ...formData,
        description: formData.description || null,
        location: formData.location || null
      });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      console.error('Failed to update event:', error);
    }
  };

  if (!event) return null;

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
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium">Description</label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium">Location</label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium">Start</label>
            <Input
              id="start"
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium">End</label>
            <Input
              id="end"
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allDay"
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked as boolean }))}
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
