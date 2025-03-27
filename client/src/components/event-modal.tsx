
import { useState } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';
import { eventFormSchema, type EventFormData } from '@shared/schema';
import { Checkbox } from './ui/checkbox';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { calendars, createEventMutation } = useCalDAV();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      location: '',
      calendarId: calendars[0]?.id || 0,
      allDay: false
    }
  });

  const onSubmit = (data: EventFormData) => {
    createEventMutation.mutate(data, {
      onSuccess: () => {
        onClose();
        form.reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Event
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
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">All day event</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Add location" {...field} />
                  </FormControl>
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
                      placeholder="Add description"
                      className="resize-none"
                      {...field}
                    />
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
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a calendar" />
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
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
