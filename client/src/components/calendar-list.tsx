import { useState, useEffect } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

const calendarFormSchema = z.object({
  name: z.string().min(1, 'Calendar name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
});

const createCalendarSchema = z.object({
  name: z.string().min(1, 'Calendar name is required').regex(/^[a-zA-Z0-9._-]+$/, 'Allowed Characters - [Letters, digits, _, -, and .]'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
});

export default function CalendarList() {
  const { toast } = useToast();
  const { 
    calendars, 
    calendarsLoading, 
    calendarError, 
    activeCalendar,
    setActiveCalendar,
    servers,
    serversLoading,
    discoverCalendarsMutation,
    updateCalendarMutation,
    createCalendarMutation
  } = useCalDAV();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);


  const form = useForm<z.infer<typeof calendarFormSchema>>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: '',
      color: '#3B82F6'
    }
  });

  const createForm = useForm<z.infer<typeof createCalendarSchema>>({
    resolver: zodResolver(createCalendarSchema),
    defaultValues: {
      name: '',
      color: '#3B82F6'
    }
  });

  useEffect(() => {
    if (selectedCalendar) {
      form.reset({
        name: selectedCalendar.name,
        color: selectedCalendar.color
      });
    }
  }, [selectedCalendar, form]);

  const handleRefreshCalendars = () => {
    if (servers && servers.length > 0) {
      servers.forEach(server => {
        discoverCalendarsMutation.mutate(server.id);
      });
    } else {
      toast({
        title: "No servers connected",
        description: "Please connect to a CalDAV server first",
        variant: "destructive"
      });
    }
  };

  const handleCalendarSelect = (calendar: Calendar) => {
    setActiveCalendar(calendar);
  };

  const handleEditCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCalendar = (values: z.infer<typeof calendarFormSchema>) => {
    if (selectedCalendar) {
      updateCalendarMutation.mutate({
        id: selectedCalendar.id,
        data: values
      });
      setIsEditDialogOpen(false);
    }
  };

  const handleCreateCalendar = (values: z.infer<typeof createCalendarSchema>) => {
    if (servers && servers.length > 0) {
      createCalendarMutation.mutate(
        { serverId: servers[0].id, data: values },
        {
          onSuccess: () => {
            setIsCreateDialogOpen(false);
            toast({ title: 'Calendar created successfully!' });
          },
          onError: (error) => {
            toast({ title: 'Error creating calendar', description: error.message, variant: 'destructive' });
          },
        }
      );
    } else {
      toast({
        title: "No servers connected",
        description: "Please connect to a CalDAV server first",
        variant: "destructive"
      });
    }
  };

  const handleAddCalendar = () => {
    setIsCreateDialogOpen(true);
  };

  async function onCreateSubmit(data: z.infer<typeof createCalendarSchema>) {
    if (!servers || servers.length === 0) {
      toast({
        title: "Error",
        description: "No servers available to create calendar",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating calendar with data:', {
        name: data.name,
        color: data.color,
        serverId: servers[0].id,
        userId: servers[0].userId
      });

      await createCalendarMutation.mutateAsync({
        name: data.name,
        color: data.color,
        serverId: servers[0].id,
        userId: servers[0].userId,
        url: `${servers[0].url}/calendar/${data.name}`
      });

      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      console.error('Failed to create calendar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create calendar. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            My Calendars
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500 hover:text-primary h-8 w-8 p-0"
            onClick={handleRefreshCalendars}
            disabled={discoverCalendarsMutation.isLoading || serversLoading}
          >
            <RefreshCw size={16} className={discoverCalendarsMutation.isLoading ? "animate-spin" : ""} />
            <span className="sr-only">Resync Calendars</span>
          </Button>
        </div>

        {/* Loading state */}
        {(calendarsLoading || discoverCalendarsMutation.isPending) && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {/* Error state */}
        {calendarError && !calendarsLoading && (
          <div className="bg-red-50 p-3 rounded-md mb-3">
            <p className="text-sm text-red-600 flex items-center">
              <span className="i-lucide-alert-circle mr-1" /> Failed to load calendars
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs text-primary p-0 h-auto"
              onClick={handleRefreshCalendars}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Calendars list */}
        {!calendarsLoading && !discoverCalendarsMutation.isPending && calendars && calendars.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No calendars found</p>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary mt-1"
              onClick={handleRefreshCalendars}
            >
              Resync calendars
            </Button>
          </div>
        )}

        {calendars && calendars.length > 0 && (
          <div className="space-y-1 mt-2">
            {calendars.map((calendar) => (
              <div 
                key={calendar.id}
                className={`flex items-center py-2 px-1 rounded-md hover:bg-gray-100 cursor-pointer group ${
                  activeCalendar?.id === calendar.id ? 'bg-gray-100' : ''
                }`}
                onClick={() => handleCalendarSelect(calendar)}
              >
                <span 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: calendar.color }}
                />
                <span className="text-sm flex-grow">{calendar.name}</span>
                <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCalendar(calendar);
                    }}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button 
          variant="link" 
          size="sm" 
          className="mt-3 text-sm text-primary p-0 h-auto flex items-center"
          onClick={handleAddCalendar}
        >
          <Plus size={16} className="mr-1" />
          Add Calendar
        </Button>
      </div>

      {/* Edit calendar dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Calendar</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateCalendar)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input {...field} type="color" className="w-14 h-8 p-0" />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateCalendarMutation.isLoading}
                >
                  {updateCalendarMutation.isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create calendar dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Calendar</DialogTitle>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Allowed Characters - [Letters, digits, _, -, and .]
                    </FormDescription>
                  </FormItem>
                )}
              />



              <FormField
                control={createForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Color</FormLabel>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: field.value }}
                      />
                      <FormControl>
                        <Input {...field} type="color" className="w-14 h-8 p-0" />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />


              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createCalendarMutation.isLoading}
                  >
                    {createCalendarMutation.isLoading ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}