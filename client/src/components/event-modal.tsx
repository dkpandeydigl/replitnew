import { useState } from "react";
import { format, addHours } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCalDAV } from "../hooks/use-caldav";
import { useToast } from "../hooks/use-toast";
import { EventFormData, eventFormSchema } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EventFormData;
}

const ROLE_OPTIONS = [
  { value: 'CHAIR', label: 'Chairman' },
  { value: 'SEC', label: 'Secretary' },
  { value: 'MEMBER', label: 'Member' }
];

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, createEvent, updateEvent } = useCalDAV();
  const { toast } = useToast();
  const now = new Date();
  const [attendeeInput, setAttendeeInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event?.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
      end: event?.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || activeCalendar?.id || 0,
      timezone: event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: event?.attendees || [],
      resources: event?.resources || "",
      recurrence: event?.recurrence || {
        frequency: 'NONE',
        interval: 1,
        byDay: []
      }
    }
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      if (!data.calendarId && activeCalendar?.id) {
        data.calendarId = activeCalendar.id;
      }

      if (!data.calendarId) {
        toast({ title: "Error", description: "Please select a calendar", variant: "destructive" });
        return;
      }

      const formattedData = {
        ...data,
        start: new Date(data.start).toISOString(),
        end: new Date(data.end).toISOString(),
        attendees: data.attendees?.map(attendee => ({
          email: attendee.email,
          role: attendee.role || "REQ-PARTICIPANT"
        })) || []
      };

      if (event?.id) {
        await updateEvent(event.id, formattedData);
        toast({ title: "Event updated successfully" });
      } else {
        await createEvent(formattedData);
        toast({ title: "Event created successfully" });
      }
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save event. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const addAttendee = () => {
    if (attendeeInput && attendeeInput.includes('@')) {
      const currentAttendees = form.getValues('attendees') || [];
      form.setValue('attendees', [...currentAttendees, { 
        email: attendeeInput,
        role: selectedRole 
      }]);
      setAttendeeInput('');
    }
  };

  const removeAttendee = (index: number) => {
    const currentAttendees = form.getValues('attendees') || [];
    form.setValue('attendees', currentAttendees.filter((_, i) => i !== index));
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
                    <Textarea {...field} />
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
                  <FormControl>
                    <select {...field} className="w-full px-3 py-2 border rounded-md">
                      {Intl.supportedValuesOf('timeZone').map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
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
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>All Day</FormLabel>
                </FormItem>
              )}
            />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="attendees">
                <AccordionTrigger>Attendees</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        type="email"
                        placeholder="Enter email"
                        value={attendeeInput}
                        onChange={(e) => setAttendeeInput(e.target.value)}
                      />
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={addAttendee}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch('attendees')?.map((attendee: { email: string; role: string }, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <span>{attendee.email}</span>
                          <span className="text-xs">({attendee.role})</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-auto p-0"
                            onClick={() => removeAttendee(index)}
                          >
                            <X size={14} />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="recurrence">
                <AccordionTrigger>Recurrence</AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={form.control}
                    name="recurrence.frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="YEARLY">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="resources">
                <AccordionTrigger>Meeting Resources</AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={form.control}
                    name="resources"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter required resources (e.g., Projector, Conference Room)"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {event?.id ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}