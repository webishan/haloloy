import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { User, Eye, EyeOff } from 'lucide-react';

export default function CustomerLogin() {
  const [identifier, setIdentifier] = useState(''); // Changed from email to identifier
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async ({ identifier, password }: { identifier: string; password: string }) => {
      try {
        const response = await fetch('/api/customer/login', { // Changed to customer-specific endpoint
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ identifier, password }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || 'Login failed');
        }

        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Login success:', data);
      
      if (!data.user || data.user.role !== 'customer') {
        toast({
          title: "Access Denied",
          description: "This login is only for customers.",
          variant: "destructive"
        });
        return;
      }
      
      login(data.token, data.user);
      toast({
        title: "Customer Login Successful",
        description: "Welcome to KOMARCE Marketplace"
      });
      setLocation('/customer-dashboard');
    },
    onError: (error: any) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login Failed", 
        description: error.message || "Invalid customer credentials",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier && password) {
      loginMutation.mutate({ identifier, password });
    }
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-green-50 to-primary/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Customer Login
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Access your KOMARCE customer account
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Phone Number</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Enter your email or phone number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    You can login with either your email address or phone number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Access Customer Dashboard"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Sign up here
                  </Link>
                </p>
              </div>

              <div className="text-center pt-6 border-t">
                <p className="text-sm text-gray-600 mb-4">
                  Login Options:
                </p>
                <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-2">
                  <p><strong>With Email:</strong> customer@komarce.com</p>
                  <p><strong>With Phone:</strong> +8801234567890</p>
                  <p><strong>Password:</strong> customer123</p>
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button 
                    onClick={() => {
                      setIdentifier('customer@komarce.com');
                      setPassword('customer123');
                    }}
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                  >
                    Use Email
                  </Button>
                  <Button 
                    onClick={() => {
                      setIdentifier('+8801234567890');
                      setPassword('customer123');
                    }}
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                  >
                    Use Phone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Looking for a different login?{' '}
              <Link href="/admin-login" className="text-red-600 hover:underline">Admin</Link>
              {' | '}
              <Link href="/merchant-login" className="text-red-500 hover:underline">Merchant</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}