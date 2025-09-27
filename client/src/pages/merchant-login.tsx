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
          body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        });

        if (!response.ok) {
          // Try to parse JSON error first, then fallback to text
          let message = 'Login failed';
          try {
            const json = await response.json();
            if (json && (json.message || json.error)) {
              message = json.message || json.error;
            }
          } catch (_) {
            const text = await response.text();
            if (text) message = text;
          }
          throw new Error(message);
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
        description: "Welcome to KOMARCE Merchant Portal"
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
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      toast({ title: 'Missing credentials', description: 'Enter both email and password.', variant: 'destructive' });
      return;
    }
    loginMutation.mutate({ email: trimmedEmail, password: trimmedPassword });
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-orange-50 to-primary/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border border-gray-100 bg-neutral-900 text-white">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Merchant Portal
              </CardTitle>
              <p className="text-white/70 mt-2">
                Access your KOMARCE merchant dashboard
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your business email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
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
                        <EyeOff className="h-4 w-4 text-white/60" />
                      ) : (
                        <Eye className="h-4 w-4 text-white/60" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Access Merchant Dashboard"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-white/80">
                  Want to become a merchant?{' '}
                  <Link href="/register?role=merchant" className="text-primary hover:underline font-medium">
                    Apply here
                  </Link>
                </p>
              </div>

              <div className="text-center pt-6 border-t border-white/10">
                <p className="text-sm text-white mb-4">
                  Demo merchant credentials for testing:
                </p>
                <div className="bg-white/5 rounded-xl p-3 text-sm mb-3 border border-white/10">
                  <p className="font-semibold text-white">TechStore (BD)</p>
                  <p className="text-white/80">Email: merchant@techstore.com</p>
                  <p className="text-white/80">Password: merchant123</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-sm border border-white/10">
                  <p className="font-semibold text-white">Fashion Hub (MY)</p>
                  <p className="text-white/80">Email: merchant@fashionhub.com</p>
                  <p className="text-white/80">Password: merchant123</p>
                </div>
                <Button 
                  onClick={() => {
                    setEmail('merchant@techstore.com');
                    setPassword('merchant123');
                  }}
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                >
                  Use TechStore Login
                </Button>
                <Button 
                  onClick={() => {
                    setEmail('merchant@fashionhub.com');
                    setPassword('merchant123');
                  }}
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                >
                  Use Fashion Hub Login
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Looking for a different login?{' '}
              <Link href="/admin-login" className="text-red-600 hover:underline">Admin</Link>
              {' | '}
              <Link href="/customer-login" className="text-red-500 hover:underline">Customer</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}