import { useEffect } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventFormData, eventFormSchema, type Event } from '@shared/schema';
import { useCalDAV } from '@/hooks/use-caldav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function EventModal({ isOpen, onClose, event, selectedDate }: {isOpen:boolean, onClose:()=>void, event?:Event, selectedDate?: Date}) {
  const { calendars, createEventMutation, updateEventMutation } = useCalDAV();
  const isEditMode = Boolean(event);

  const defaultValues = {
    title: '',
    description: '',
    location: '',
    start: selectedDate?.toISOString().slice(0, 16) || new Date().toISOString().slice(0, 16),
    end: selectedDate?.toISOString().slice(0, 16) || new Date().toISOString().slice(0, 16),
    allDay: false,
    calendarId: calendars[0]?.id || '',
    recurrence: null
  };

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen]);

  useEffect(() => {
    if (event && isOpen) {
      form.reset({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start: new Date(event.start).toISOString().slice(0, 16),
        end: new Date(event.end).toISOString().slice(0, 16),
        allDay: event.allDay,
        calendarId: event.calendarId,
        recurrence: event.recurrence
      });
    }
  }, [event, isOpen]);

  const handleClose = () => {
    form.reset(defaultValues);
    onClose();
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      if (event) {
        await updateEventMutation.mutateAsync({ id: event.id, ...data });
      } else {
        await createEventMutation.mutateAsync(data);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditMode ? 'Update Event' : 'Create Event'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>All Day</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Add location" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id.toString()}>
                          {calendar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Creating..." : 
                 updateEventMutation.isPending ? "Updating..." : 
                 isEditMode ? "Update Event" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}