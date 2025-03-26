import { useState } from 'react';
import { Check, Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  
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
    // Add this console.log just for debugging
    console.log("Connecting with values:", { 
      url: values.url,
      authType: values.authType,
      username: values.username,
      password: values.password ? "***" : undefined,
      token: values.token ? "***" : undefined
    });
    
    // Format URL for DAViCal - ensure proper path structure
    let serverUrl = values.url;
    if (values.authType === 'username' && values.username && serverUrl.includes('zpush.ajaydata.com/davical')) {
      serverUrl = `https://zpush.ajaydata.com/davical/caldav.php/${values.username}/`;
    }
    
    connectServerMutation.mutate({
      url: serverUrl,
      authType: values.authType,
      username: values.username,
      password: values.password,
      token: values.token
    });
  }
  
  return (
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        Server Connection
      </h2>
      
      {isConnected && servers?.length > 0 ? (
        <div>
          <Alert className="bg-green-50 border-green-200 mb-2">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <AlertDescription className="text-sm text-green-700">
              Connected to server
            </AlertDescription>
          </Alert>
          <div className="text-xs text-gray-600 break-all px-2">
            Server URL: {servers[0].url}
          </div>
        </div>
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
                      placeholder="https://zpush.ajaydata.com/davical"
                      className="w-full p-2 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 mt-1">
                    Example: https://zpush.ajaydata.com/davical
                  </p>
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
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            className="w-full p-2 text-sm pr-10"
                            {...field}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
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
