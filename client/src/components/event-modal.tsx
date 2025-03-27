import { useState, useEffect } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Dialog,
  DialogContent,
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { eventFormSchema } from '@shared/schema';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const { calendars, createEventMutation } = useCalDAV();
  const [recurrenceType, setRecurrenceType] = useState('none');

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      start: '',
      end: '',
      location: '',
      calendarId: calendars[0]?.id || 0,
      recurrence: {
        type: 'none',
        interval: 1,
        weekday: 'monday',
        endType: 'never',
        occurrences: 1,
        until: ''
      }
    }
  });

  const onSubmit = (data: any) => {
    createEventMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Meeting
          </DialogTitle>
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
                    <Input placeholder="Meeting subject" {...field} />
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
                    <Textarea rows={4} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-medium">Repeat event</h3>
              <RadioGroup 
                value={recurrenceType}
                onValueChange={setRecurrenceType}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <label htmlFor="none">No repeat</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <label htmlFor="daily">Daily</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <label htmlFor="weekly">Weekly</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <label htmlFor="monthly">Monthly</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <label htmlFor="yearly">Yearly</label>
                </div>
              </RadioGroup>

              {recurrenceType !== 'none' && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-20" min="1" defaultValue="1" />
                    <Select defaultValue="monday">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Meeting Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input type="datetime-local" />
                <Input type="datetime-local" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Reminder</h3>
              <div className="flex items-center gap-2">
                <span>Before</span>
                <Input type="number" className="w-20" defaultValue="10" />
                <span>minutes via</span>
                <Input type="email" placeholder="Email" className="flex-1" />
                <span>SMS:</span>
                <Input type="text" className="w-32" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}