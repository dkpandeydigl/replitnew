import { useState, useEffect } from 'react';
import { useCalDAV } from '@/hooks/use-caldav';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@shared/schema';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added import

const calendarFormSchema = z.object({
  name: z.string().min(1, 'Calendar name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
});

const createCalendarSchema = z.object({
  name: z.string().min(1, 'Calendar name is required').regex(/^[a-zA-Z0-9._-]+$/, 'Allowed Characters - [Letters, digits, _, -, and .]'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
});

// Added type definition
type CalendarFormValues = {
  name: string;
  color: string;
};


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
    createCalendarMutation,
    deleteCalendarMutation
  } = useCalDAV();

  const queryClient = useQueryClient(); // Added useQueryClient hook

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState<Calendar | null>(null);

  const form = useForm<CalendarFormValues>({ // Updated to use CalendarFormValues
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: '',
      color: '#3B82F6'
    }
  });

  // Reset form when selected calendar changes
  useEffect(() => {
    if (selectedCalendar) {
      form.reset({
        name: selectedCalendar.name,
        color: selectedCalendar.color
      });
    }
  }, [selectedCalendar, form]);

  const createForm = useForm<z.infer<typeof createCalendarSchema>>({
    resolver: zodResolver(createCalendarSchema),
    defaultValues: {
      name: '',
      color: '#3B82F6'
    }
  });

  const handleEditCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    form.reset({
      name: calendar.name,
      color: calendar.color
    });
    setIsEditDialogOpen(true);
  };

  // Added defaultServerId - needs to be defined appropriately based on application logic.
  const defaultServerId = servers && servers.length > 0 ? servers[0].id : null;

  const handleCreateCalendar = () => {
    createForm.reset({
      serverId: defaultServerId, // Added serverId to default values
      name: '',
      color: '#3B82F6'
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenDeleteDialog = (calendar: Calendar) => {
    setCalendarToDelete(calendar);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCalendar = () => {
    if (calendarToDelete) {
      deleteCalendarMutation.mutate(calendarToDelete.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setCalendarToDelete(null);
          toast({ title: 'Calendar deleted successfully!' });
          queryClient.invalidateQueries({ queryKey: ['/api/calendars'] }); // Added invalidation
        },
        onError: (error) => {
          toast({ title: 'Error deleting calendar', description: error.message, variant: 'destructive' });
        },
      });
    }
  };

  // Added placeholder for apiRequest function.  Needs to be defined elsewhere.
  const apiRequest = async (method: string, url: string, data?: any) => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || response.statusText);
    }
    return response;
  };

  const updateCalendarMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color: string }) => {
      const res = await apiRequest('PATCH', `/api/calendars/${data.id}`, data);
      const updatedCalendar = await res.json();
      return updatedCalendar;
    },
    onSuccess: (updatedCalendar) => {
      setSelectedCalendar(updatedCalendar);
      setIsEditDialogOpen(false);
      toast({ title: 'Calendar updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
    },
    onError: (error) => {
      toast({ title: 'Error updating calendar', description: error.message, variant: 'destructive' });
    }
  });


  const onSubmit = async (data: CalendarFormValues) => {
    if (selectedCalendar) {
      try {
        // Update calendar
        const updatedCalendar = await updateCalendarMutation.mutateAsync(
          { id: selectedCalendar.id, ...data },
          {
            onSuccess: () => {
              setSelectedCalendar({
                ...selectedCalendar,
                name: data.name,
                color: data.color
              });
              setIsEditDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/calendars'] });
              toast({ title: 'Calendar updated successfully!' });
            },
            onError: (error) => {
              toast({ title: 'Error updating calendar', description: error.message, variant: 'destructive' });
            }
          }
        );
      } catch (error) {
        console.error('Failed to update calendar:', error);
        toast({ 
          title: 'Failed to update calendar',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <>
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Calendars</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (servers && servers.length > 0) {
                  discoverCalendarsMutation.mutate(servers[0].id);
                }
              }}
              disabled={!servers || servers.length === 0 || serversLoading || discoverCalendarsMutation.isPending}
            >
              <RefreshCw size={16} className={discoverCalendarsMutation.isPending ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCreateCalendar}
              disabled={!servers || servers.length === 0}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {calendarsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
          </div>
        ) : calendarError ? (
          <div className="text-red-500">{calendarError}</div>
        ) : (
          <div className="space-y-1">
            {calendars?.map((calendar) => (
              <div
                key={calendar.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                  activeCalendar?.id === calendar.id ? 'bg-primary/10' : 'hover:bg-accent'
                }`}
                onClick={() => setActiveCalendar(calendar)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                  <span>{calendar.name}</span>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-primary mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCalendar(calendar);
                    }}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteDialog(calendar);
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog 
  open={isEditDialogOpen} 
  onOpenChange={(open) => {
    if (!open) {
      form.reset();
    }
    setIsEditDialogOpen(open);
  }}
>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Calendar</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}> {/* Updated onSubmit */}
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" className="h-10 w-full p-1 cursor-pointer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateCalendarMutation.isPending}>
                  {updateCalendarMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Calendar</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => {
              if (servers && servers.length > 0) {
                createCalendarMutation.mutate(
                  { ...data, serverId: servers[0].id },
                  {
                    onSuccess: () => {
                      setIsCreateDialogOpen(false);
                      toast({ title: 'Calendar created successfully!' });
                      queryClient.invalidateQueries({ queryKey: ['/api/calendars'] }); // Added invalidation
                    },
                    onError: (error) => {
                      toast({ title: 'Error creating calendar', description: error.message, variant: 'destructive' });
                    },
                  }
                );
              }
            })}>
              <div className="space-y-4 py-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" className="h-10 w-full p-1 cursor-pointer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCalendarMutation.isPending}>
                  {createCalendarMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal 
        isOpen={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCalendar}
        title="Confirm Delete"
        description={`Are you sure you want to delete the calendar "${calendarToDelete?.name}"? This action cannot be undone.`}
      />
    </>
  );
}