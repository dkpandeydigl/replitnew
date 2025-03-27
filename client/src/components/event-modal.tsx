
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Attendees</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search Attendees"
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                    />
                    <Button variant="outline" onClick={addAttendee}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {attendees.map((email) => (
                      <div key={email} className="flex items-center justify-between bg-secondary p-2 rounded">
                        <span>{email}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeAttendee(email)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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

              <div>
                <h3 className="font-medium mb-2">Venue</h3>
                <Input placeholder="Enter meeting location" />
              </div>
            </div>

            <div className="col-span-3 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <div className="space-y-2">
                  <Input placeholder="Subject" />
                  <Textarea placeholder="Description" className="h-[120px]" />
                </div>
              </div>

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
                <div className="flex justify-between items-center">
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label>Start</label>
                    <div className="flex flex-col sm:flex-row gap-2">
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
                  <div className="space-y-2">
                    <label>End</label>
                    <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => form.handleSubmit(onSubmit)()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
