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
import { Store, Eye, EyeOff } from 'lucide-react';

export default function MerchantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
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
      
      if (!data.user || data.user.role !== 'merchant') {
        toast({
          title: "Access Denied",
          description: "This login is only for merchants.",
          variant: "destructive"
        });
        return;
      }
      
      login(data.token, data.user);
      toast({
        title: "Merchant Login Successful",
        description: "Welcome to Holyloy Merchant Portal"
      });
      setLocation('/merchant-dashboard');
    },
    onError: (error: any) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login Failed", 
        description: error.message || "Invalid merchant credentials",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-red-50 to-primary/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="flex flex-col items-center justify-center mb-6">
                <img 
                  src="/images/holyloy-logo.png" 
                  alt="HOLYLOY Logo" 
                  className="w-20 h-20 mb-2 object-contain"
                />
                <p className="text-xs text-gray-600 font-medium">LOYALTY IS ROYALTY</p>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Merchant Portal
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Access your Holyloy merchant dashboard
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your business email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                  className="w-full h-12 bg-red-600 hover:bg-red-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Access Merchant Dashboard"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Want to become a merchant?{' '}
                  <Link href="/register" className="text-red-600 hover:underline font-medium">
                    Apply here
                  </Link>
                </p>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}