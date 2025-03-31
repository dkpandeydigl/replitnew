
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
import { addHours, format } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { timezones } from "@/lib/timezones";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, createEvent, updateEvent } = useCalDAV();
  const { toast } = useToast();
  const now = new Date();
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      start: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
      end: format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
      allDay: false,
      calendarId: activeCalendar?.id || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: [],
      recurrence: {
        frequency: 'NONE',
        interval: 1,
      }
    }
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title || "",
        description: event.description || "",
        location: event.location || "",
        start: format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"),
        end: format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"),
        allDay: event.allDay || false,
        calendarId: event.calendarId || activeCalendar?.id,
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees: event.attendees || [],
        recurrence: event.recurrence || { frequency: 'NONE', interval: 1 }
      });
    } else {
      form.reset({
        title: "",
        description: "",
        location: "",
        start: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
        end: format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
        allDay: false,
        calendarId: activeCalendar?.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees: [],
        recurrence: { frequency: 'NONE', interval: 1 }
      });
    }
  }, [event, activeCalendar]);

  const onSubmit = async (data: EventFormData) => {
    try {
      if (event?.id) {
        await updateEvent({ ...data, id: event.id });
        toast({ description: "Event updated successfully" });
      } else {
        await createEvent(data);
        toast({ description: "Event created successfully" });
      }
      onClose();
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to save event" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-6">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="calendarId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        {...field}
                        value={field.value?.toString() || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      >
                        <option value="">Select a calendar</option>
                        {activeCalendar && (
                          <option value={activeCalendar.id}>{activeCalendar.name}</option>
                        )}
                      </select>
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
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        {...field}
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
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 pt-6">
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
            </div>

            <Collapsible open={isRecurringOpen} onOpenChange={setIsRecurringOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                <ChevronDown className={`h-4 w-4 transform ${isRecurringOpen ? 'rotate-180' : ''}`} />
                Recurring Event Options
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="recurrence.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat</FormLabel>
                      <FormControl>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          {...field}
                        >
                          <option value="NONE">Does not repeat</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("recurrence.frequency") !== "NONE" && (
                  <>
                    <FormField
                      control={form.control}
                      name="recurrence.interval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat every</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrence.count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of occurrences</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                <ChevronDown className={`h-4 w-4 transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                Additional Details
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
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

                <FormField
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendees (comma-separated emails)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value?.join(", ") || ""}
                          onChange={(e) => {
                            const emails = e.target.value
                              .split(",")
                              .map((email) => email.trim())
                              .filter((email) => email);
                            field.onChange(emails);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-between pt-4">
              {event?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteEventMutation.mutateAsync(event.id);
                      toast({ description: "Event deleted successfully" });
                      onClose();
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        description: "Failed to delete event"
                      });
                    }
                  }}
                >
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {event?.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
