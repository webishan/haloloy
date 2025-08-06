import { Link } from 'wouter';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function Cart() {
  const { user } = useAuth();
  const { cartItems, cartTotal, updateCart, removeFromCart, updatingCart, removingFromCart } = useCart();

  if (!user) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">Please Login</h2>
            <p className="text-gray-600 mb-6">You need to login to view your cart</p>
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
      <div className="pt-32 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="w-24 h-24 mx-auto mb-6 text-gray-400" />
            <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet. 
              Start shopping to earn reward points!
            </p>
            <Button asChild size="lg">
              <Link href="/marketplace">
                Start Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pointsEarned = cartItems.reduce((total: number, item: any) => 
    total + (item.product?.pointsReward || 0) * item.quantity, 0
  );

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
            <p className="text-gray-600">{cartItems.length} items in your cart</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/marketplace">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Product Image */}
                    <Link href={`/product/${item.product?.slug}`} className="flex-shrink-0">
                      <img
                        src={item.product?.images?.[0] || `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop&crop=center`}
                        alt={item.product?.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${item.product?.slug}`}>
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                          {item.product?.name}
                        </h3>
                      </Link>
                      {item.product?.category && (
                        <p className="text-sm text-gray-600 mb-2">{item.product.category}</p>
                      )}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-bold">${item.product?.price}</span>
                        {item.product?.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ${item.product.originalPrice}
                          </span>
                        )}
                        <Badge variant="secondary">
                          +{item.product?.pointsReward || 0} pts
                        </Badge>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCart({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                        disabled={item.quantity <= 1 || updatingCart}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateCart({ id: item.id, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-16 text-center"
                        min="1"
                        disabled={updatingCart}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCart({ id: item.id, quantity: item.quantity + 1 })}
                        disabled={updatingCart}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Subtotal and Remove */}
                    <div className="text-right">
                      <div className="font-semibold text-lg mb-2">
                        ${(parseFloat(item.product?.price || '0') * item.quantity).toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        disabled={removingFromCart}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{cartTotal >= 50 ? 'Free' : '$5.00'}</span>
                </div>

                <div className="flex justify-between">
                  <span>Tax (estimated)</span>
                  <span>${(cartTotal * 0.08).toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${(cartTotal + (cartTotal >= 50 ? 0 : 5) + cartTotal * 0.08).toFixed(2)}</span>
                </div>

                {/* Points Earned */}
                <div className="bg-primary/10 p-3 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    🎉 You'll earn {pointsEarned} reward points!
                  </p>
                </div>

                {/* Free Shipping Notice */}
                {cartTotal < 50 && (
                  <div className="bg-accent/10 p-3 rounded-lg">
                    <p className="text-sm text-accent-foreground">
                      Add ${(50 - cartTotal).toFixed(2)} more for free shipping!
                    </p>
                  </div>
                )}

                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout">
                    Proceed to Checkout
                  </Link>
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/marketplace">
                    Continue Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
