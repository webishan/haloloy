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
import { apiRequest } from '@/lib/queryClient';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
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
      
      if (!data.user || data.user.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "This login is only for administrators.",
          variant: "destructive"
        });
        return;
      }
      
      login(data.token, data.user);
      toast({
        title: "Admin Login Successful",
        description: "Welcome to KOMARCE Admin Dashboard"
      });
      setLocation('/admin-dashboard');
    },
    onError: (error: any) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login Failed", 
        description: error.message || "Invalid admin credentials",
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
    <div className="pt-32 min-h-screen bg-gradient-to-br from-red-50 to-red-50/20 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Admin Access
              </CardTitle>
              <p className="text-gray-600 mt-2">
                KOMARCE Administrative Portal
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert className="bg-yellow-50 border-yellow-200">
                <Shield className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  This portal is restricted to authorized administrators only.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@komarce.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Authenticating..." : "Access Admin Dashboard"}
                </Button>
              </form>

              <div className="text-center pt-6 border-t">
                <p className="text-sm text-gray-600 mb-4">
                  Default admin credentials for testing:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><strong>Email:</strong> admin@komarce.com</p>
                  <p><strong>Password:</strong> admin123</p>
                </div>
                <Button 
                  onClick={() => {
                    setEmail('admin@komarce.com');
                    setPassword('admin123');
                  }}
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                >
                  Use Default Credentials
                </Button>
              </div>

              <div className="text-center">
                <Link href="/">
                  <Button variant="ghost" className="text-gray-600">
                    ← Back to Homepage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}