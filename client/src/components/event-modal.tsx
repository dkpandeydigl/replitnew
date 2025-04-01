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
      timezone: localStorage.getItem('defaultTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: event?.metadata?.attendees || [],
    },
  });

  // Ensure timezone is set to browser's timezone when creating new event
  useEffect(() => {
    if (!event) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      form.setValue("timezone", browserTimezone);
    } else {
      form.setValue("timezone", event.metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [event, form]);

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
        attendees: (event?.metadata?.attendees || []).map(att => ({
          email: att.email,
          role: att.role || 'MEMBER'
        })),
      });
    };

    if (isOpen) {
      const currentEventString = JSON.stringify(event);
      if (currentEventString !== prevEventRef.current) {
        const startDate = event?.start ? new Date(event.start) : now;
        const endDate = event?.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000);

        // Parse attendees from metadata if available
        const attendees = event?.metadata?.attendees || [];
        console.log("Loading attendees:", attendees);

        form.reset({
          title: event?.title || "",
          description: event?.description || "",
          location: event?.location || "",
          start: startDate.toISOString().slice(0, 16),
          end: endDate.toISOString().slice(0, 16),
          allDay: event?.allDay || false,
          calendarId: event?.calendarId || activeCalendar?.id || 1,
          attendees: attendees.map((att: any) => ({
            email: att.email,
            role: att.role || 'MEMBER'
          })),
        });
        prevEventRef.current = currentEventString;
      }
    }
  }, [isOpen, event, activeCalendar?.id, form]);

  async function onSubmit(values: EventFormData) {
    try {
      // Ensure attendees are properly formatted
      const formattedValues = {
        ...values,
        metadata: {
          attendees: values.attendees.map(att => ({
            email: att.email,
            role: att.role || 'MEMBER'
          })),
          timezone: values.timezone
        }
      };

      // Debug logging
      console.log("Form data received:", formattedValues);
      console.log("Event context:", event);
      console.log("Active calendar:", activeCalendar);

      if (!formattedValues.title || !formattedValues.start || !formattedValues.end || !formattedValues.calendarId) {
        console.log("Missing required fields:", {
          title: !formattedValues.title,
          start: !formattedValues.start,
          end: !formattedValues.end,
          calendarId: !formattedValues.calendarId
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

      const startDate = new Date(formattedValues.start);
      const endDate = new Date(formattedValues.end);

      // Ensure timezone is set
      const timezone = formattedValues.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Convert dates to UTC for server
      const utcStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes()));
      const utcEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes()));


      if (event?.id) {
        console.log('Updating event:', event);
        console.log('Form data:', formattedValues);

        const eventData = {
          id: event.id,
          title: formattedValues.title,
          calendarId: formattedValues.calendarId,
          description: formattedValues.description,
          location: formattedValues.location,
          start: utcStartDate.toISOString(),
          end: utcEndDate.toISOString(),
          allDay: formattedValues.allDay,
          metadata: formattedValues.metadata
        };

        console.log('Update data being sent:', eventData);

        // Debug logging for update
        console.log("Sending update data:", eventData);
        await updateEventMutation.mutateAsync(eventData);
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      } else {
        await createEventMutation.mutateAsync({
          title: formattedValues.title,
          calendarId: Number(formattedValues.calendarId) || activeCalendar?.id || 1,
          description: formattedValues.description || null,
          location: formattedValues.location || null,
          start: utcStartDate.toISOString(),
          end: utcEndDate.toISOString(),
          allDay: formattedValues.allDay || false,
          timezone: formattedValues.timezone || "UTC",
          metadata: {
            attendees: formattedValues.attendees
          }
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

                        const startDate = form.getValues("start");
                        const endDate = form.getValues("end");
                        const currentTz = form.getValues("timezone");

                        // Only convert if explicitly changing to a new timezone
                        if (startDate && endDate && currentTz !== "Select Timezone" && newTz !== "Select Timezone") {
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
                const [searchResults, setSearchResults] = useState<string[]>([]);
                const [isSearching, setIsSearching] = useState(false);

                const handleSearch = (value: string) => {
                  setNewAttendee(value);
                  setIsSearching(true);

                  // Mock search - replace this with actual addressbook search later
                  const mockResults = value ? [
                    value,
                    `${value}.user@example.com`,
                    `${value}.contact@example.com`
                  ] : [];

                  setSearchResults(mockResults.filter(email => 
                    email.toLowerCase().includes(value.toLowerCase())
                  ));
                };

                const [selectedRole, setSelectedRole] = useState<string>("MEMBER");

                const handleSelectEmail = (email: string) => {
                  const currentAttendees = field.value || [];
                  if (!currentAttendees.find(a => a.email === email)) {
                    field.onChange([...currentAttendees, { email, role: selectedRole }]);
                  }
                  setNewAttendee("");
                  setSearchResults([]);
                  setIsSearching(false);
                };

                const handleRoleChange = (email: string, newRole: string) => {
                  const currentAttendees = field.value || [];
                  const updatedAttendees = currentAttendees.map(attendee => 
                    attendee.email === email ? { ...attendee, role: newRole } : attendee
                  );
                  field.onChange(updatedAttendees);
                };

                return (
                  <FormItem>
                    <FormLabel>Attendees</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Search or enter email address"
                              value={newAttendee}
                              onChange={(e) => handleSearch(e.target.value)}
                              onBlur={() => {
                                // Delay hiding results to allow clicking
                                setTimeout(() => setIsSearching(false), 200);
                              }}
                              onFocus={() => newAttendee && setIsSearching(true)}
                            />
                          </FormControl>
                          {isSearching && searchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                              {searchResults.map((email, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                  onClick={() => handleSelectEmail(email)}
                                >
                                  {email}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (newAttendee && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAttendee)) {
                              handleSelectEmail(newAttendee);
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <ScrollArea className="h-24 w-full rounded-md border">
                        <div className="p-2">
                          {field.value?.map((attendee: { email: string, role?: string }, index: number) => (
                            <div key={index} className="flex items-center gap-2 py-1">
                              <span>{attendee.email}</span>
                              <select
                                className="text-xs rounded-md border border-input bg-background px-2 py-1"
                                value={attendee.role || "MEMBER"}
                                onChange={(e) => handleRoleChange(attendee.email, e.target.value)}
                              >
                                <option value="MEMBER">Member</option>
                                <option value="CHAIRMAN">Chairman</option>
                                <option value="SECRETARY">Secretary</option>
                              </select>
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