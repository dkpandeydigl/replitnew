import { useState } from "react";
import { format, addHours } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCalDAV } from "../hooks/use-caldav";
import { useToast } from "../hooks/use-toast";
import { eventFormSchema } from "@shared/schema";
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
  event?: any;
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
      title: "",
      description: "",
      location: "",
      start: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
      end: format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
      allDay: false,
      calendarId: activeCalendar?.id || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees: [],
      resources: "",
      recurrence: {
        frequency: 'NONE',
        interval: 1,
        byDay: []
      }
    }
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      if (event?.id) {
        await updateEvent({ ...event, ...data });
        toast({ title: "Event updated" });
      } else {
        await createEvent(data);
        toast({ title: "Event created" });
      }
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save event", variant: "destructive" });
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
                    <Textarea {...field} rows={3} />
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
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
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

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="recurrence">
                <AccordionTrigger>Repeat Event</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recurrence.frequency"
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">No repeat</SelectItem>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="YEARLY">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {form.watch('recurrence.frequency') !== 'NONE' && (
                      <FormField
                        control={form.control}
                        name="recurrence.interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interval</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="attendees">
                <AccordionTrigger>Attendees</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Enter email address"
                        value={attendeeInput}
                        onChange={(e) => setAttendeeInput(e.target.value)}
                      />
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={addAttendee}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {form.watch('attendees')?.map((attendee, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-sm">
                            {attendee.email} ({ROLE_OPTIONS.find(r => r.value === attendee.role)?.label})
                          </Badge>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeAttendee(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
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