
import { useState, useEffect } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Search, X } from 'lucide-react';
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
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState('');

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

  const addAttendee = () => {
    if (newAttendee && !attendees.includes(newAttendee)) {
      setAttendees([...attendees, newAttendee]);
      setNewAttendee('');
    }
  };

  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email));
  };

  const onSubmit = (data: any) => {
    createEventMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Meeting
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Attendees */}
                <div>
                  <h3 className="font-medium mb-2">Attendees</h3>
                  <div className="flex gap-2 mb-2">
                    <Input 
                      placeholder="Add attendee email"
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                    />
                    <Button type="button" onClick={addAttendee}>Add</Button>
                  </div>
                  <div className="space-y-2">
                    {attendees.map((email) => (
                      <div key={email} className="flex items-center justify-between bg-secondary p-2 rounded">
                        <span>{email}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeAttendee(email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meeting Resources */}
                <div>
                  <h3 className="font-medium mb-2">Meeting Resources</h3>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projector">Projector</SelectItem>
                      <SelectItem value="whiteboard">Whiteboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue */}
                <div>
                  <h3 className="font-medium mb-2">Venue</h3>
                  <Input placeholder="Enter meeting location" />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <div className="space-y-2">
                    <Input placeholder="Subject" />
                    <Textarea placeholder="Description" className="h-[120px]" />
                  </div>
                </div>

                {/* Meeting Time */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Meeting Time</h3>
                    <Select defaultValue="Asia/Colombo">
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Colombo">(GMT +05:30) Asia/Colombo</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-1">Start</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          type="date" 
                          value={form.watch('start').split('T')[0]}
                          onChange={(e) => {
                            const time = form.watch('start').split('T')[1] || '00:00';
                            form.setValue('start', `${e.target.value}T${time}`);
                          }}
                        />
                        <Input 
                          type="time"
                          value={form.watch('start').split('T')[1] || ''}
                          onChange={(e) => {
                            const date = form.watch('start').split('T')[0];
                            form.setValue('start', `${date}T${e.target.value}`);
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1">End</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          type="date"
                          value={form.watch('end').split('T')[0]}
                          onChange={(e) => {
                            const time = form.watch('end').split('T')[1] || '00:00';
                            form.setValue('end', `${e.target.value}T${time}`);
                          }}
                        />
                        <Input 
                          type="time"
                          value={form.watch('end').split('T')[1] || ''}
                          onChange={(e) => {
                            const date = form.watch('end').split('T')[0];
                            form.setValue('end', `${date}T${e.target.value}`);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Repeat Event */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Repeat event</h3>
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
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
