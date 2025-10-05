import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Store, Gift, TrendingUp } from 'lucide-react';

export default function MerchantRegister() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'BD',
    businessName: '',
    businessType: 'retail',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [referringMerchant, setReferringMerchant] = useState<any>(null);
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
    // Check for referral code parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
      setFormData(prev => ({ ...prev, referralCode: refParam }));
      setHasReferralCode(true);
      validateReferralCode(refParam);
    }
  }, []);

  const validateReferralCode = async (code: string) => {
    try {
      const response = await fetch(`/api/affiliate/validate-referral/${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.referringMerchant) {
          setReferringMerchant(data.referringMerchant);
          toast({
            title: "Valid Referral Code!",
            description: `You're being referred by ${data.referringMerchant.businessName}. They will earn 2% commission from your point transfers.`,
          });
        }
      } else {
        toast({
          title: "Invalid Referral Code",
          description: "The referral code is invalid or expired.",
          variant: "destructive"
        });
        setHasReferralCode(false);
        setReferringMerchant(null);
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate referral code when it changes
    if (field === 'referralCode' && value.length > 5) {
      validateReferralCode(value);
    }
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

    if (!formData.businessName.trim()) {
      toast({
        title: "Business name required",
        description: "Please enter your business name.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (!formData.username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username.",
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
        role: 'merchant',
        businessName: formData.businessName,
        businessType: formData.businessType,
        referralCode: formData.referralCode || undefined
      };

      await register(registrationData);
      
      toast({
        title: "Welcome to Holyloy!",
        description: referringMerchant 
          ? `Your merchant account has been created successfully! ${referringMerchant.businessName} will earn 2% commission from your point transfers.`
          : "Your merchant account has been created successfully."
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific error messages
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.message) {
        if (error.message.includes("User already exists")) {
          errorMessage = error.message;
        } else if (error.message.includes("Username")) {
          errorMessage = error.message;
        } else if (error.message.includes("email")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Link href="/">
            <div className="flex flex-col items-center justify-center mb-6">
              <img 
                src="/images/holyloy-logo.png" 
                alt="KOMARCE Logo" 
                className="w-24 h-24 mb-2 object-contain"
              />
              <p className="text-sm text-gray-600 font-medium">LOYALTY IS ROYALTY</p>
            </div>
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Store className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Become a Merchant</h1>
          </div>
          <p className="text-gray-600">Join our merchant network and start earning rewards</p>
        </div>

        {/* Referral Info Banner */}
        {referringMerchant && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Gift className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Referred by {referringMerchant.businessName}
                  </p>
                  <p className="text-xs text-green-600">
                    They will earn 2% commission from your point transfers to customers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-purple-600" />
              <span>Merchant Registration</span>
            </CardTitle>
            <CardDescription>
              Create your merchant account and start earning with our affiliate program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  placeholder="Your business name"
                  className="h-11 w-full"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">Business Type</Label>
                <Select value={formData.businessType} onValueChange={(value) => handleChange('businessType', value)}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">🛍️ Retail Store</SelectItem>
                    <SelectItem value="restaurant">🍽️ Restaurant</SelectItem>
                    <SelectItem value="service">🔧 Service Business</SelectItem>
                    <SelectItem value="online">💻 Online Business</SelectItem>
                    <SelectItem value="other">📦 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
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
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BD">🇧🇩 Bangladesh</SelectItem>
                    <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                    <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    <SelectItem value="PH">🇵🇭 Philippines</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
                  Merchant Referral Code 
                  {hasReferralCode && <span className="text-green-600">(Applied ✓)</span>}
                </Label>
                <Input
                  id="referralCode"
                  value={formData.referralCode}
                  onChange={(e) => handleChange('referralCode', e.target.value.toUpperCase())}
                  placeholder="Enter merchant referral code (optional)"
                  className={`h-11 w-full ${hasReferralCode ? "bg-green-50 font-semibold" : ""}`}
                  disabled={loading}
                />
                {hasReferralCode && referringMerchant && (
                  <p className="text-xs text-green-600">
                    🎉 Referred by {referringMerchant.businessName}! They will earn 2% commission from your point transfers.
                  </p>
                )}
                {!hasReferralCode && (
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

              {/* Benefits Section */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Merchant Benefits
                </h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Earn 2% commission by referring other merchants</li>
                  <li>• Get 10% instant cashback on customer point transfers</li>
                  <li>• Access to comprehensive merchant dashboard</li>
                  <li>• Real-time commission tracking and analytics</li>
                </ul>
              </div>

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating merchant account...
                  </>
                ) : (
                  'Create Merchant Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have a merchant account?{' '}
                <Link 
                  href="/merchant-login" 
                  className="text-purple-600 hover:text-purple-500 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}