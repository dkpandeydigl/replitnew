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
    
    connectServerMutation.mutate({
      url: values.url,
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
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
