import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'AE',
    role: 'customer',
    businessName: '',
    referralCode: '',
    merchantType: 'merchant'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const { register, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      const dashboardPath = user.role === 'admin' ? '/dashboard/admin' 
                          : user.role === 'merchant' ? '/dashboard/merchant'
                          : user.role === 'customer' ? '/dashboard/customer'
                          : '/';
      setLocation(dashboardPath);
    }
  }, [user, setLocation]);

  useEffect(() => {
    // Check for role and referral code parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    const refParam = urlParams.get('ref');
    
    if (roleParam && ['customer', 'merchant'].includes(roleParam)) {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }
    
    if (refParam) {
      setFormData(prev => ({ ...prev, referralCode: refParam }));
      setHasReferralCode(true);
      toast({
        title: "Referral Code Applied!",
        description: `You're signing up with referral code: ${refParam}`,
      });
    }
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        phone: formData.phone,
        country: formData.country,
        role: formData.role,
        businessName: formData.businessName || undefined,
        referralCode: formData.referralCode || undefined,
        merchantType: formData.merchantType || undefined
      };

      await register(registrationData);
      
      toast({
        title: "Welcome to Holyloy!",
        description: "Your account has been created successfully."
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/">
            <div className="flex flex-col items-center justify-center mb-6">
              <img 
                src="/images/holyloy-logo.png" 
                alt="HOLYLOY Logo" 
                className="w-24 h-24 mb-2 object-contain"
              />
              <p className="text-sm text-gray-600 font-medium">LOYALTY IS ROYALTY</p>
            </div>
          </Link>
          <p className="mt-4 text-gray-600 font-medium">Create your account</p>
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Join Holyloy and start earning rewards today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={formData.role} onValueChange={(value) => handleChange('role', value)}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="customer" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                  🛍️ Customer
                </TabsTrigger>
                <TabsTrigger value="merchant" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-semibold">
                  🏪 Become a Merchant
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      placeholder="First name"
                      className="h-11 w-full"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      placeholder="Last name"
                      className="h-11 w-full"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 w-full"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="Choose a username"
                    className="h-11 w-full"
                    required
                    disabled={loading}
                  />
                </div>

                {formData.role === 'merchant' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">Business Name</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                        placeholder="Your business name"
                        className="h-11 w-full"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="merchantType" className="text-sm font-medium text-gray-700">Merchant Type</Label>
                      <Select value={formData.merchantType} onValueChange={(value) => handleChange('merchantType', value)}>
                        <SelectTrigger className="h-11 w-full [&>svg]:text-red-500">
                          <SelectValue placeholder="Select merchant type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merchant">Merchant</SelectItem>
                          <SelectItem value="e_merchant">E-Merchant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Your phone number"
                    className="h-11 w-full"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                  <Select value={formData.country} onValueChange={(value) => handleChange('country', value)}>
                    <SelectTrigger className="h-11 w-full [&>svg]:text-red-500">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                      <SelectItem value="BD">🇧🇩 Bangladesh</SelectItem>
                      <SelectItem value="BH">🇧🇭 Bahrain</SelectItem>
                      <SelectItem value="ID">🇮🇩 Indonesia</SelectItem>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                      <SelectItem value="LK">🇱🇰 Sri Lanka</SelectItem>
                      <SelectItem value="MU">🇲🇺 Mauritius</SelectItem>
                      <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                      <SelectItem value="PK">🇵🇰 Pakistan</SelectItem>
                      <SelectItem value="PH">🇵🇭 Philippines</SelectItem>
                      <SelectItem value="QA">🇶🇦 Qatar</SelectItem>
                      <SelectItem value="RW">🇷🇼 Rwanda</SelectItem>
                      <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                      <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                      <SelectItem value="TR">🇹🇷 Turkey</SelectItem>
                      <SelectItem value="UG">🇺🇬 Uganda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Referral Code for both customers and merchants */}
                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
                    {formData.role === 'merchant' ? 'Merchant Referral Code' : 'Referral Code'} 
                    {hasReferralCode && <span className="text-green-600">(Applied ✓)</span>}
                  </Label>
                  <Input
                    id="referralCode"
                    value={formData.referralCode}
                    onChange={(e) => handleChange('referralCode', e.target.value.toUpperCase())}
                    placeholder={formData.role === 'merchant' ? "Enter merchant referral code (optional)" : "Enter referral code (optional)"}
                    className={`h-11 w-full ${hasReferralCode ? "bg-green-50 font-semibold" : ""}`}
                    disabled={loading || hasReferralCode}
                    data-testid="input-referral-code-signup"
                  />
                  {hasReferralCode && (
                    <p className="text-xs text-green-600">
                      {formData.role === 'merchant' 
                        ? '🎉 You were referred by another merchant! They will earn 2% commission from your point transfers.'
                        : '🎉 You\'ll earn rewards with this referral!'
                      }
                    </p>
                  )}
                  {formData.role === 'merchant' && !hasReferralCode && (
                    <p className="text-xs text-gray-500">
                      💡 If another merchant referred you, enter their referral code to give them 2% commission on your future point transfers.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Create a password"
                      className="h-11 w-full pr-10"
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className="h-11 w-full pr-10"
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    `Create ${formData.role === 'customer' ? 'Customer' : 'Merchant'} Account`
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    href={formData.role === 'customer' ? '/customer-login' : '/merchant-login'} 
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
