import { useEffect } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventFormData, eventFormSchema, type Event } from '@shared/schema';
import { useCalDAV } from '@/hooks/use-caldav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export default function EventModal({ isOpen, onClose, event, selectedDate }: {isOpen:boolean, onClose:()=>void, event?:Event, selectedDate?: Date}) {
  const { calendars, createEventMutation, updateEventMutation } = useCalDAV();

  const form = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      start: selectedDate?.toISOString().slice(0, 16) || '',
      end: selectedDate?.toISOString().slice(0, 16) || '',
      allDay: false,
      calendarId: calendars[0]?.id,
      recurrence: null
    }
  });

  // Populate form when event is selected
  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start: new Date(event.start).toISOString().slice(0, 16),
        end: new Date(event.end).toISOString().slice(0, 16),
        allDay: event.allDay,
        calendarId: event.calendarId,
        recurrence: event.recurrence || null
      });
    }
  }, [event, form]);

  const onSubmit = async (data: EventFormData) => {
    try {
      if (event) {
        await updateEventMutation.mutateAsync({ id: event.id, ...data });
      } else {
        await createEventMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event ? 'Edit Event' : 'Create Event'}
          </DialogTitle>
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
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <FormMessage />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="calendarId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select
                      value={field.value?.toString() || ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((calendar) => (
                          <SelectItem key={calendar.id} value={calendar.id.toString()}>
                            {calendar.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Add location" className="pl-8" {...field} />
                    </div>
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
                    <Textarea 
                      placeholder="Event description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                  <FormLabel className="!mt-0">All day event</FormLabel>
                </FormItem>
              )}
            />

        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="recurrence"
              checked={form.watch('recurrence') !== null}
              onCheckedChange={(checked) => {
                if (checked) {
                  form.setValue('recurrence', { frequency: 'DAILY' });
                } else {
                  form.setValue('recurrence', null);
                }
              }}
            />
            <Label htmlFor="recurrence">Repeat event</Label>
          </div>

          {form.watch('recurrence') && (
            <div className="space-y-4 pl-4">
              <FormField
                control={form.control}
                name="recurrence.frequency"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant={event ? "default" : "primary"}
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Creating..." : 
                 updateEventMutation.isPending ? "Updating..." : 
                 event ? "Update Event" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}