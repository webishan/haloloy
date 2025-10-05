import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, Mail, Smartphone, Lock, Eye, EyeOff, QrCode, 
  ArrowLeft, CheckCircle, AlertCircle, Shield
} from 'lucide-react';

export default function CustomerAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    mobileNumber: '',
    email: '',
    deliveryMethod: 'mobile'
  });

  // Registration form state
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  });

  // Login form state
  const [loginData, setLoginData] = useState({
    mobileNumber: '',
    password: ''
  });

  // OTP form state
  const [otpData, setOtpData] = useState({
    customerId: '',
    otpCode: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/api/customer/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: registerData.fullName,
          email: registerData.email,
          mobileNumber: registerData.mobileNumber,
          password: registerData.password
        })
      });

      if (response.success) {
        toast({
          title: "Registration Successful",
          description: "Your account has been created successfully"
        });
        
        // Store token and redirect
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setLocation('/customer-dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/customer/login', {
        method: 'POST',
        body: JSON.stringify({
          mobileNumber: loginData.mobileNumber,
          password: loginData.password
        })
      });

      if (response.success) {
        toast({
          title: "Login Successful",
          description: "Welcome back!"
        });
        
        // Store token and redirect
        localStorage.setItem('customerToken', response.token);
        localStorage.setItem('customerUser', JSON.stringify(response.user));
        setLocation('/customer-dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid mobile number or password",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/customer/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          mobileNumber: forgotPasswordData.mobileNumber,
          email: forgotPasswordData.email,
          deliveryMethod: forgotPasswordData.deliveryMethod
        })
      });

      if (response.success) {
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `OTP has been sent to your ${forgotPasswordData.deliveryMethod}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (otpData.newPassword !== otpData.confirmNewPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/api/customer/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          customerId: otpData.customerId,
          otpCode: otpData.otpCode,
          newPassword: otpData.newPassword
        })
      });

      if (response.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset successfully"
        });
        setOtpSent(false);
        setForgotPasswordData({ mobileNumber: '', email: '', deliveryMethod: 'mobile' });
        setOtpData({ customerId: '', otpCode: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Invalid OTP or error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <img 
              src="/images/holyloy-logo.png" 
              alt="HOLYLOY Logo" 
              className="w-16 h-16 mb-2 object-contain"
            />
            <p className="text-xs text-gray-600 font-medium">LOYALTY IS ROYALTY</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Holyloy Customer Portal</h1>
          <p className="text-gray-600 mt-2">Join the loyalty revolution</p>
        </div>

        {/* Back to Home */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-gray-600">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Welcome Back</h2>
                  <p className="text-gray-600">Login with your mobile number and password</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="login-mobile" className="text-sm font-medium text-gray-700">Mobile Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-mobile"
                        type="tel"
                        placeholder="+8801234567890"
                        value={loginData.mobileNumber}
                        onChange={(e) => setLoginData({ ...loginData, mobileNumber: e.target.value })}
                        className="pl-10 h-11 w-full"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">You can login with either your email address or phone number</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 pr-10 h-11 w-full"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>

                {/* Forgot Password */}
                <div className="text-center">
                  <Button variant="link" className="text-sm">
                    Forgot Password?
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Create Account</h2>
                  <p className="text-gray-600">Join Holyloy and start earning points</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium text-gray-700">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={registerData.fullName}
                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        className="pl-10 h-11 w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="pl-10 h-11 w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-mobile" className="text-sm font-medium text-gray-700">Mobile Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-mobile"
                        type="tel"
                        placeholder="+8801234567890"
                        value={registerData.mobileNumber}
                        onChange={(e) => setRegisterData({ ...registerData, mobileNumber: e.target.value })}
                        className="pl-10 h-11 w-full"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      This will be your login ID and default password
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="pl-10 pr-10 h-11 w-full"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        className="pl-10 pr-10 h-11 w-full"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <QrCode className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">QR Code Transfers</h3>
            <p className="text-xs text-gray-600">Easy point transfers with QR codes</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Secure & Safe</h3>
            <p className="text-xs text-gray-600">Your data is protected</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Instant Rewards</h3>
            <p className="text-xs text-gray-600">Earn points on every purchase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
