import { useState, useEffect } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Dialog,
  DialogContent,
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Trash2 } from 'lucide-react';
import { eventFormSchema, Event } from '@shared/schema';
import { z } from 'zod';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | any;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { 
    calendars, 
    createEventMutation, 
    updateEventMutation, 
    deleteEventMutation 
  } = useCalDAV();
  
  const [isEditMode, setIsEditMode] = useState(false);
  
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      start: '',
      end: '',
      allDay: false,
      description: '',
      location: '',
      calendarId: 0
    }
  });
  
  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const isExistingEvent = typeof event.id !== 'undefined';
      setIsEditMode(isExistingEvent);
      
      // Format dates for form inputs
      let startStr = '';
      let endStr = '';
      
      if (event.start instanceof Date) {
        // Format for datetime-local input: YYYY-MM-DDThh:mm
        startStr = format(event.start, "yyyy-MM-dd'T'HH:mm");
      }
      
      if (event.end instanceof Date) {
        endStr = format(event.end, "yyyy-MM-dd'T'HH:mm");
      }
      
      form.reset({
        title: event.title || '',
        start: startStr,
        end: endStr,
        allDay: event.allDay || false,
        description: event.description || '',
        location: event.location || '',
        calendarId: event.calendarId || calendars[0]?.id || 0
      });
    } else {
      setIsEditMode(false);
      form.reset({
        title: '',
        start: '',
        end: '',
        allDay: false,
        description: '',
        location: '',
        calendarId: calendars[0]?.id || 0
      });
    }
  }, [event, form, calendars]);
  
  const handleClose = () => {
    form.reset();
    onClose();
  };
  
  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    if (isEditMode && event?.id) {
      updateEventMutation.mutate({
        id: event.id,
        data
      }, {
        onSuccess: () => {
          handleClose();
        }
      });
    } else {
      createEventMutation.mutate(data, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };
  
  const handleDelete = () => {
    if (event?.id) {
      deleteEventMutation.mutate(event.id, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };
  
  const isPending = createEventMutation.isPending || 
                    updateEventMutation.isPending || 
                    deleteEventMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditMode ? 'Edit Event' : 'Add Event'}
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
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id.toString()}>
                          <div className="flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: calendar.color }}
                            />
                            {calendar.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Textarea 
                      placeholder="Event description"
                      {...field}
                      value={field.value || ''}
                    />
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
                    <Input 
                      placeholder="Event location"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>All day event</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-between items-center pt-4">
              <div>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? 'Saving...' : isEditMode ? 'Update Event' : 'Save Event'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
