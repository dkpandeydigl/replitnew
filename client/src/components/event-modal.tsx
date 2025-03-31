import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalDAV } from "@/hooks/use-caldav";
import { useToast } from "@/hooks/use-toast";
import { EventFormData, eventFormSchema } from "@shared/schema";
import type { Event, Calendar } from "@shared/schema";
import { addHours, format } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { timezones } from "@/lib/timezones";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, calendars, createEventMutation, updateEventMutation, deleteEventMutation } = useCalDAV();
  const { toast } = useToast();
  const prevEventRef = useRef<string | null>(null);

  const now = new Date();
  const oneHourLater = addHours(now, 1);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event ? new Date(event.start).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
      end: event ? new Date(event.end).toISOString().slice(0, 16) : oneHourLater.toISOString().slice(0, 16),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || activeCalendar?.id || 1,
      timezone: "UTC",
      attendees: event?.metadata?.attendees || [],
    },
  });

  useEffect(() => {
    const resetForm = () => {
      form.reset({
        title: event?.title || "",
        description: event?.description || "",
        location: event?.location || "",
        start: event ? new Date(event.start).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
        end: event ? new Date(event.end).toISOString().slice(0, 16) : oneHourLater.toISOString().slice(0, 16),
        allDay: event?.allDay || false,
        calendarId: event?.calendarId || activeCalendar?.id || 1,
      });
    };

    if (isOpen) {
      const currentEventString = JSON.stringify(event);
      if (currentEventString !== prevEventRef.current) {
        resetForm();
        prevEventRef.current = currentEventString;
      }
    }
  }, [isOpen, event, activeCalendar?.id, form]);

  async function onSubmit(data: EventFormData) {
    try {
      // Debug logging
      console.log("Form data received:", data);
      console.log("Event context:", event);
      console.log("Active calendar:", activeCalendar);

      if (!data.title || !data.start || !data.end || !data.calendarId) {
        console.log("Missing required fields:", {
          title: !data.title,
          start: !data.start,
          end: !data.end,
          calendarId: !data.calendarId
        });
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Ensure calendarId is properly set
      const calendarId = event?.calendarId || activeCalendar?.id;
      if (!calendarId) {
        console.error("No calendar ID available");
        toast({
          title: "Error",
          description: "No calendar selected",
          variant: "destructive",
        });
        return;
      }

      if (event?.id) {
        console.log('Updating event:', event);
        console.log('Form data:', data);

        // Format data according to schema requirements
        const updateData = {
          id: event.id,
          title: data.title,
          calendarId: Number(data.calendarId),
          description: data.description || '',
          location: data.location || '',
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          allDay: data.allDay || false
        };

        console.log('Update data being sent:', updateData);

        // Debug logging for update
        console.log("Sending update data:", updateData);
        await updateEventMutation.mutateAsync(updateData);
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      } else {
        await createEventMutation.mutateAsync({
          title: data.title,
          calendarId: Number(data.calendarId) || activeCalendar?.id || 1,
          description: data.description || null,
          location: data.location || null,
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          allDay: data.allDay || false,
          timezone: data.timezone || "UTC"
        });
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] w-[90%] max-w-2xl overflow-y-auto my-8">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
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
                    <Input {...field} value={field.value || ""} />
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
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">All Day Event</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...field}
                      onChange={(e) => {
                        const newTz = e.target.value;
                        field.onChange(newTz);

                        // Convert dates to new timezone
                        const startDate = form.getValues("start");
                        const endDate = form.getValues("end");

                        if (startDate && endDate) {
                          const startInNewTz = formatInTimeZone(
                            new Date(startDate),
                            newTz,
                            "yyyy-MM-dd'T'HH:mm"
                          );
                          const endInNewTz = formatInTimeZone(
                            new Date(endDate),
                            newTz,
                            "yyyy-MM-dd'T'HH:mm"
                          );

                          form.setValue("start", startInNewTz);
                          form.setValue("end", endInNewTz);
                        }
                      }}
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => {
                const [newAttendee, setNewAttendee] = useState("");
                return (
                  <FormItem>
                    <FormLabel>Attendees</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            value={newAttendee}
                            onChange={(e) => setNewAttendee(e.target.value)}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          onClick={() => {
                            if (newAttendee && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAttendee)) {
                              const currentAttendees = field.value || [];
                              if (!currentAttendees.includes(newAttendee)) {
                                field.onChange([...currentAttendees, newAttendee]);
                                setNewAttendee("");
                              }
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <ScrollArea className="h-24 w-full rounded-md border">
                        <div className="p-2">
                          {field.value?.map((attendee: string, index: number) => (
                            <div key={index} className="flex items-center justify-between py-1">
                              <span>{attendee}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newAttendees = field.value.filter((_, i: number) => i !== index);
                                  field.onChange(newAttendees);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...field}
                      value={field.value?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseInt(value, 10) : '');
                      }}
                    >
                      <option value="">Select a calendar</option>
                      {calendars?.map((cal) => (
                        <option key={cal.id} value={cal.id.toString()}>
                          {cal.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <div className="flex justify-between w-full">
                {event?.id && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deleteEventMutation.mutateAsync(event.id);
                        toast({
                          title: "Success",
                          description: "Event deleted successfully",
                        });
                        onClose();
                      } catch (error) {
                        console.error("Failed to delete event:", error);
                        toast({
                          title: "Error",
                          description: "Failed to delete event",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
                <div className="flex space-x-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}