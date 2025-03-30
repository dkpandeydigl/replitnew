
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalDAV } from "@/hooks/use-caldav";
import { useToast } from "@/hooks/use-toast";
import { EventFormData, eventFormSchema } from "@shared/schema";
import type { Event, Calendar } from "@shared/schema";
import { addHours, format } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
}

// List of common timezones
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  // Add more as needed
];

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, calendars, createEventMutation, updateEventMutation, deleteEventMutation } = useCalDAV();
  const { toast } = useToast();
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendees, setAttendees] = useState<string[]>(event?.attendees || []);

  const now = new Date();
  const oneHourLater = addHours(now, 1);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event ? format(utcToZonedTime(new Date(event.start), userTimezone), "yyyy-MM-dd'T'HH:mm") : format(now, "yyyy-MM-dd'T'HH:mm"),
      end: event ? format(utcToZonedTime(new Date(event.end), userTimezone), "yyyy-MM-dd'T'HH:mm") : format(oneHourLater, "yyyy-MM-dd'T'HH:mm"),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || activeCalendar?.id || 1,
      timezone: userTimezone,
      attendees: attendees,
    },
  });

  const handleAddAttendee = () => {
    if (attendeeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail)) {
      if (!attendees.includes(attendeeEmail)) {
        const newAttendees = [...attendees, attendeeEmail];
        setAttendees(newAttendees);
        form.setValue("attendees", newAttendees);
      }
      setAttendeeEmail("");
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAttendee = (email: string) => {
    const newAttendees = attendees.filter(a => a !== email);
    setAttendees(newAttendees);
    form.setValue("attendees", newAttendees);
  };

  const handleTimezoneChange = (newTimezone: string) => {
    const startDate = new Date(form.getValues("start"));
    const endDate = new Date(form.getValues("end"));
    
    const newStart = format(utcToZonedTime(startDate, newTimezone), "yyyy-MM-dd'T'HH:mm");
    const newEnd = format(utcToZonedTime(endDate, newTimezone), "yyyy-MM-dd'T'HH:mm");
    
    form.setValue("timezone", newTimezone);
    form.setValue("start", newStart);
    form.setValue("end", newEnd);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setAttendees([]);
      setAttendeeEmail("");
    }
  }, [isOpen, form]);

  const onSubmit = async (data: EventFormData) => {
    try {
      const startInUTC = zonedTimeToUtc(new Date(data.start), data.timezone);
      const endInUTC = zonedTimeToUtc(new Date(data.end), data.timezone);

      const eventData = {
        ...data,
        start: startInUTC.toISOString(),
        end: endInUTC.toISOString(),
        attendees,
      };

      if (event) {
        await updateEventMutation.mutateAsync({ id: event.id, ...eventData });
        toast({ title: "Success", description: "Event updated successfully" });
      } else {
        await createEventMutation.mutateAsync(eventData);
        toast({ title: "Success", description: "Event created successfully" });
      }
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save event",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
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
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleTimezoneChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Attendees</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="Enter email address"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                />
                <Button type="button" onClick={handleAddAttendee}>Add</Button>
              </div>
              
              {attendees.length > 0 && (
                <ScrollArea className="h-24 w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {attendees.map((email) => (
                      <div key={email} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttendee(email)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
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
                  <FormLabel>All day</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {event ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
