
import { useState } from 'react';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from './ui/use-toast';
import { EventFormData, eventFormSchema } from '@shared/schema';
import { useCalDAV } from '@/hooks/use-caldav';
import { timezones } from '@/lib/timezones';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
  start?: Date;
  end?: Date;
}

export default function EventModal({ isOpen, onClose, event, start, end }: EventModalProps) {
  const { activeCalendar, createEventMutation, updateEventMutation } = useCalDAV();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event?.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") 
        : start ? format(start, "yyyy-MM-dd'T'HH:mm") 
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end: event?.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm")
        : end ? format(end, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || activeCalendar?.id,
      timezone: event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: event?.attendees || [],
      recurrence: event?.recurrence || {
        frequency: 'NONE',
        interval: 1,
        byDay: []
      }
    }
  });

  const onSubmit = async (data: EventFormData) => {
    if (!activeCalendar) {
      toast({
        title: "Error",
        description: "Please select a calendar first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (event?.id) {
        await updateEventMutation.mutateAsync({
          id: event.id,
          ...data,
        });
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      } else {
        await createEventMutation.mutateAsync(data);
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      }
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save event",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Create Event"}</DialogTitle>
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
                    <Input {...field} />
                  </FormControl>
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
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>
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
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
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
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">All Day Event</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : event?.id ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
