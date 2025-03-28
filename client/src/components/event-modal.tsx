
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalDAV } from "@/hooks/use-caldav";
import { eventFormSchema, type EventFormData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";

const TIMEZONES = [
  { value: "Asia/Colombo", label: "(GMT +05:30) Asia/Colombo" },
  { value: "UTC", label: "UTC" }
];

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
  selectedDate?: Date;
}

export default function EventModal({ isOpen, onClose, event, selectedDate }: EventModalProps) {
  const { toast } = useToast();
  const { calendars = [], createEventMutation, updateEventMutation } = useCalDAV();

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  const defaultValues = React.useMemo(() => ({
    title: event?.title || "",
    description: event?.description || "",
    location: event?.location || "",
    start: event ? new Date(event.start).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
    end: event ? new Date(event.end).toISOString().slice(0, 16) : later.toISOString().slice(0, 16),
    allDay: event?.allDay || false,
    calendarId: event?.calendarId || calendars[0]?.id || 0,
    timezone: "Asia/Colombo"
  }), [event, calendars]);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    values: defaultValues
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const onSubmit = async (data: EventFormData) => {
    try {
      if (!data.calendarId) {
        toast({
          title: "Error",
          description: "Please select a calendar",
          variant: "destructive",
        });
        return;
      }

      const formattedData = {
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        allDay: data.allDay || false,
        calendarId: data.calendarId,
        timezone: data.timezone
      };

      if (event?.id) {
        await updateEventMutation.mutateAsync({
          id: event.id,
          ...formattedData
        });
        toast({
          title: "Success",
          description: "Meeting updated successfully",
        });
      } else {
        await createEventMutation.mutateAsync(formattedData);
        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      }
      
      form.reset(defaultValues);
      onClose();
    } catch (error: any) {
      console.error("Failed to save event:", error);
      toast({
        title: "Error",
        description: "Failed to save meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Meeting' : 'Create Meeting'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject" {...field} />
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
                        <Textarea rows={6} placeholder="Enter description" {...field} />
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
                        <Input placeholder="Enter location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="calendarId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select calendar" />
                        </SelectTrigger>
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

                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
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
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((timezone) => (
                            <SelectItem key={timezone.value} value={timezone.value}>
                              {timezone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit">
                {event ? 'Update Meeting' : 'Create Meeting'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
