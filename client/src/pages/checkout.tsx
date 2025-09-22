import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Wallet, Building, Coins, Shield, ArrowLeft, Loader2 } from 'lucide-react';

export default function Checkout() {
  const { user, profile } = useAuth();
  const { cartItems = [], cartTotal } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [shippingInfo, setShippingInfo] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    country: user?.country || 'BD',
    postalCode: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('/api/orders', 'POST', orderData);
      return response.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order placed successfully!",
        description: `Your order #${order.orderNumber} has been confirmed.`
      });
      setLocation('/dashboard/customer');
    },
    onError: (error: any) => {
      toast({
        title: "Order failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (!user) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please Login</h2>
            <p className="text-gray-600 mb-6">You need to login to complete your order</p>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
            <Button asChild>
              <Link href="/marketplace">Shop Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shipping = cartTotal >= 50 ? 0 : 5;
  const tax = cartTotal * 0.08;
  const total = cartTotal + shipping + tax;
  const pointsEarned = cartItems.reduce((sum: number, item: any) => 
    sum + (item.product?.pointsReward || 0) * item.quantity, 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'card') {
      if (!cardInfo.cardNumber || !cardInfo.expiryDate || !cardInfo.cvv || !cardInfo.cardholderName) {
        toast({
          title: "Missing card information",
          description: "Please fill in all card details",
          variant: "destructive"
        });
        return;
      }
    }

    // Create order data
    const firstProduct = cartItems[0]?.product || cartItems[0];
    const orderData = {
      merchantId: firstProduct?.merchantId || 'tech-store-id', // Use actual merchant ID from products
      totalAmount: total.toFixed(2),
      paymentMethod,
      paymentStatus: 'pending',
      shippingAddress: shippingInfo,
      items: cartItems.map((item: any) => ({
        productId: item.product?.id || item.productId,
        productName: item.product?.name || item.name,
        price: item.product?.price || item.price,
        quantity: item.quantity || 1,
        pointsReward: item.product?.pointsReward || 0
      }))
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <Button variant="ghost" asChild>
            <Link href="/cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Shipping & Payment */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <CreditCard className="w-5 h-5" />
                        <span>Credit/Debit Card</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <Wallet className="w-5 h-5" />
                        <span>PayPal</span>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <Building className="w-5 h-5" />
                        <span>Bank Transfer</span>
                      </Label>
                    </div>

                    {user.role === 'customer' && (
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                        <RadioGroupItem value="points" id="points" />
                        <Label htmlFor="points" className="flex items-center space-x-2 cursor-pointer flex-1">
                          <Coins className="w-5 h-5" />
                          <span>Use Points ({profile?.totalPoints || 0} available)</span>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>

                  {/* Card Details Form */}
                  {paymentMethod === 'card' && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          value={cardInfo.cardNumber}
                          onChange={(e) => setCardInfo(prev => ({ ...prev, cardNumber: e.target.value }))}
                          placeholder="1234 5678 9012 3456"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            value={cardInfo.expiryDate}
                            onChange={(e) => setCardInfo(prev => ({ ...prev, expiryDate: e.target.value }))}
                            placeholder="MM/YY"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={cardInfo.cvv}
                            onChange={(e) => setCardInfo(prev => ({ ...prev, cvv: e.target.value }))}
                            placeholder="123"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="cardholderName">Cardholder Name</Label>
                        <Input
                          id="cardholderName"
                          value={cardInfo.cardholderName}
                          onChange={(e) => setCardInfo(prev => ({ ...prev, cardholderName: e.target.value }))}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-32">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cartItems.map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <img
                          src={item.product?.images?.[0] || `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=center`}
                          alt={item.product?.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product?.name}</p>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(parseFloat(item.product?.price || '0') * item.quantity).toFixed(2)}</p>
                          <Badge variant="secondary" className="text-xs">
                            +{(item.product?.pointsReward || 0) * item.quantity} pts
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Points Earned */}
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      🎉 You'll earn {pointsEarned} reward points!
                    </p>
                  </div>

                  {/* Place Order Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Complete Order - $${total.toFixed(2)}`
                    )}
                  </Button>

                  <div className="flex items-center justify-center text-sm text-gray-600 space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Secure payment powered by SSL encryption</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
