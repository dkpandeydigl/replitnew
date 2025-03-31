import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Textarea } from "./ui/textarea";
import { useForm } from "react-hook-form";
import { useCalDAV } from "@/hooks/use-caldav";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { activeCalendar, createEvent, updateEvent } = useCalDAV();
  const { toast } = useToast();
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const form = useForm({
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start: event ? new Date(event.start).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
      end: event ? new Date(event.end).toISOString().slice(0, 16) : oneHourLater.toISOString().slice(0, 16),
      allDay: event?.allDay || false,
      calendarId: event?.calendarId || activeCalendar?.id || 1,
      timezone: event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      repeatType: "none",
      repeatInterval: "1",
      repeatEnd: "never",
      reminder: "10",
      reminderUnit: "minutes",
      attendees: event?.attendees || [],
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (event?.id) {
        await updateEvent(event.id, {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          allDay: data.allDay || false,
          timezone: data.timezone,
          calendarId: data.calendarId,
        });
      } else {
        await createEvent({
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          allDay: data.allDay || false,
          timezone: data.timezone,
          calendarId: data.calendarId,
        });
      }
      toast({
        title: "Success",
        description: event?.id ? "Event updated successfully" : "Event created successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-[90vw] mx-auto">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Meeting" : "Create Meeting"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
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

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Repeat event</h3>
              <RadioGroup defaultValue="none" className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none">None</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly">Yearly</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
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
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Reminder</h3>
              <div className="flex items-center space-x-2">
                <span>Before</span>
                <Input type="number" className="w-20" defaultValue="10" />
                <Select defaultValue="minutes">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">minutes</SelectItem>
                    <SelectItem value="hours">hours</SelectItem>
                    <SelectItem value="days">days</SelectItem>
                  </SelectContent>
                </Select>
                <span>via Email:</span>
                <Input className="flex-1" type="email" placeholder="Enter email" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}