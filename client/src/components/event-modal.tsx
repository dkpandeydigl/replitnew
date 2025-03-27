import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Event } from "@shared/schema";
import { eventFormSchema } from "@shared/schema";
import type { EventFormData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from '@/components/ui/textarea';
import { useCalDAV } from "@/hooks/use-caldav";
import { MapPin } from 'lucide-react';
import { useEffect } from 'react';

export default function EventModal({ isOpen, onClose, event, selectedDate }: {isOpen:boolean, onClose:()=>void, event?:Event, selectedDate?: Date}) {
  const { calendars, createEventMutation, updateEventMutation } = useCalDAV();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      start: event?.start ? new Date(event.start).toISOString().slice(0, 16) : selectedDate?.toISOString().slice(0, 16) || '',
      end: event?.end ? new Date(event.end).toISOString().slice(0, 16) : selectedDate?.toISOString().slice(0, 16) || '',
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || calendars[0]?.id || '',
      recurrence: event?.recurrence || null
    }
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      const formattedData = {
        ...data,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString()
      };

      if (event?.id) {
        await updateEventMutation.mutateAsync({
          id: event.id,
          ...formattedData
        });
      } else {
        await createEventMutation.mutateAsync(formattedData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event ? 'Update Event' : 'Create Event'}
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
                    <Input {...field} />
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
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-8" placeholder="Add location" {...field} />
                    </div>
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>All day</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {calendars.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>
                          {calendar.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : 
                 updateEventMutation.isPending ? "Updating..." : 
                 event ? "Update Event" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}