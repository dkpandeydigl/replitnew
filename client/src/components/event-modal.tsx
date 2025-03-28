import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalDAV } from "@/hooks/use-caldav";
import { eventFormSchema, type EventFormData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";


const RECURRENCE_OPTIONS = [
  { value: "NONE", label: "No repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" }
];

const TIMEZONES = [
  { value: "Asia/Colombo", label: "(GMT +05:30) Asia/Colombo" },
  { value: "UTC", label: "UTC" }
];

export default function EventModal({ isOpen, onClose, event, selectedDate }: {
  isOpen: boolean,
  onClose: () => void,
  event?: Event,
  selectedDate?: Date
}) {
  const { toast } = useToast();
  const { calendars = [], createEventMutation, updateEventMutation } = useCalDAV();

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      start: event?.start ? new Date(event.start).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
      end: event?.end ? new Date(event.end).toISOString().slice(0, 16) : later.toISOString().slice(0, 16),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || calendars[0]?.id,
      location: event?.location || '',
      timezone: 'Asia/Colombo',
      attendees: '',
      recurrence: { frequency: 'NONE' }
    }
  });

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

      const eventData = {
        ...data,
        start: new Date(data.start),
        end: new Date(data.end),
        description: data.description || null,
        location: data.location || null,
        recurrence: data.recurrence?.frequency === 'NONE' ? null : data.recurrence
      };

      if (event?.id) {
        await updateEventMutation.mutateAsync({ id: event.id, ...eventData });
        toast({
          title: "Success",
          description: "Meeting updated successfully",
        });
      } else {
        await createEventMutation.mutateAsync(eventData);
        toast({
          title: "Success",
          description: "Meeting created successfully",
        });
      }
      onClose();
      form.reset();
    } catch (error: any) {
      console.error("Failed to save event:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
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
                  name="attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendees</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email addresses" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
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

                <div className="space-y-4">
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
                </div>

                <FormField
                  control={form.control}
                  name="recurrence.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat event</FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue="NONE"
                        className="space-y-2"
                      >
                        {RECURRENCE_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value}>{option.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter venue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {event ? 'Save Meeting' : 'Save Meeting'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}