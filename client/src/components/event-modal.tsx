
import { useEffect } from "react";
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
import { addHours } from "date-fns";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
}

export function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, createEventMutation, updateEventMutation } = useCalDAV();
  const { toast } = useToast();

  const now = new Date();
  const oneHourLater = addHours(now, 1);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      start: now.toISOString().slice(0, 16),
      end: oneHourLater.toISOString().slice(0, 16),
      allDay: false,
      calendarId: activeCalendar?.id || 1
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (event) {
        form.reset({
          title: event.title,
          description: event.description || "",
          location: event.location || "",
          start: new Date(event.start).toISOString().slice(0, 16),
          end: new Date(event.end).toISOString().slice(0, 16),
          allDay: event.allDay,
          calendarId: event.calendarId
        });
      } else {
        form.reset({
          title: "",
          description: "",
          location: "",
          start: now.toISOString().slice(0, 16),
          end: oneHourLater.toISOString().slice(0, 16),
          allDay: false,
          calendarId: activeCalendar?.id || 1
        });
      }
    }
  }, [isOpen, event, activeCalendar?.id, form]);

  async function onSubmit(data: EventFormData) {
    try {
      if (event?.id) {
        await updateEventMutation.mutateAsync({
          id: event.id,
          ...data
        });
      } else {
        await createEventMutation.mutateAsync(data);
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
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>All Day Event</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {event?.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
