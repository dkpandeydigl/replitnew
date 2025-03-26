import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useCalDAV } from '@/hooks/use-caldav';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

const serverSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  authType: z.enum(['username', 'token']),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
}).refine(data => {
  if (data.authType === 'username') {
    return !!data.username && !!data.password;
  } else {
    return !!data.token;
  }
}, {
  message: "Please provide authentication details",
  path: ['authType'],
});

export default function ServerConnection() {
  const { servers, serversLoading, connectServerMutation } = useCalDAV();
  const isConnected = servers && servers.length > 0;
  
  const form = useForm<z.infer<typeof serverSchema>>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      url: '',
      authType: 'username',
      username: '',
      password: '',
      token: '',
    },
  });
  
  const authType = form.watch('authType');
  
  function onSubmit(values: z.infer<typeof serverSchema>) {
    connectServerMutation.mutate(values);
  }
  
  return (
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        Server Connection
      </h2>
      
      {isConnected ? (
        <Alert className="bg-green-50 border-green-200 mb-3">
          <Check className="h-4 w-4 text-green-500 mr-2" />
          <AlertDescription className="text-sm text-green-700">
            Connected to server
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    CalDAV Server URL
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://nextcloud.example.com/remote.php/dav"
                      className="w-full p-2 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="username" id="username" />
                        <FormLabel htmlFor="username" className="text-sm font-normal cursor-pointer">
                          Username/Password
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="token" id="token" />
                        <FormLabel htmlFor="token" className="text-sm font-normal cursor-pointer">
                          Token Authentication
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {authType === 'username' && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Username" 
                          className="w-full p-2 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Password" 
                          className="w-full p-2 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {authType === 'token' && (
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Authentication Token" 
                        className="w-full p-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={connectServerMutation.isPending}
            >
              {connectServerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
