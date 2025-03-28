
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useCalDAV } from "@/hooks/use-caldav";
import { useToast } from "@/hooks/use-toast";
import { EventFormData, eventFormSchema } from "@shared/schema";
import type { Event } from "@shared/schema";
import { formatISO, addHours } from "date-fns";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { createEvent, updateEvent } = useCalDAV();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Set default dates to current time and current time + 1 hour
  const now = new Date();
  const oneHourLater = addHours(now, 1);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event?.start ? 
        new Date(event.start).toISOString().slice(0, 16) : 
        now.toISOString().slice(0, 16),
      end: event?.end ? 
        new Date(event.end).toISOString().slice(0, 16) : 
        oneHourLater.toISOString().slice(0, 16),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || 1
    }
  });

  async function onSubmit(data: EventFormData) {
    try {
      setLoading(true);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedData = {
        ...data,
        start: formatISO(new Date(data.start)),
        end: formatISO(new Date(data.end)),
        timezone
      };

      if (event?.id) {
        await updateEvent.mutateAsync({
          id: event.id,
          ...formattedData
        });
      } else {
        await createEvent.mutateAsync(formattedData);
      }

      toast({
        title: "Success",
        description: event?.id ? "Meeting updated successfully" : "Meeting created successfully",
      });
      onClose();
      form.reset();
    } catch (error) {
      console.error('Event submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? 'Edit Event' : 'Create Event'}</DialogTitle>
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
                  <FormLabel className="!mt-0">All Day</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Event'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
