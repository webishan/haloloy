import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Star, Heart, ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw } from 'lucide-react';

export default function ProductDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { addToCart, addingToCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  const { data: product, isLoading } = useQuery({
    queryKey: ['/api/products', slug],
    queryFn: async () => {
      // Since we don't have a direct slug endpoint, we'll fetch all products and filter
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const products = await response.json();
      const product = products.find((p: any) => p.slug === slug);
      if (!product) throw new Error('Product not found');
      
      // Get product details including reviews
      const detailResponse = await fetch(`/api/products/${product.id}`);
      if (!detailResponse.ok) throw new Error('Failed to fetch product details');
      return detailResponse.json();
    }
  });

  const addReviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      const response = await apiRequest(`/api/products/${product.id}/reviews`, 'POST', {
        rating,
        comment
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', slug] });
      setReviewData({ rating: 5, comment: '' });
      toast({
        title: "Review added",
        description: "Thank you for your review!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add review",
        variant: "destructive"
      });
    }
  });

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to login to add items to cart",
        variant: "destructive"
      });
      return;
    }
    addToCart({ productId: product.id, quantity });
  };

  const handleAddToWishlist = () => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to login to add items to wishlist",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Added to wishlist",
      description: "Product has been added to your wishlist."
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'customer') {
      toast({
        title: "Unable to review",
        description: "Only customers can leave reviews",
        variant: "destructive"
      });
      return;
    }
    addReviewMutation.mutate(reviewData);
  };

  if (isLoading) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/marketplace">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [
    `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop&crop=center`
  ];

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-primary">Marketplace</Link>
          <span>/</span>
          <span>{product.category}</span>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link href="/marketplace">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
              <Badge className="absolute top-4 right-4 bg-accent text-black">
                +{product.pointsReward} pts
              </Badge>
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-lg text-gray-600">by {product.brand}</p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.floor(parseFloat(product.rating || '0')) ? 'fill-current' : ''}`} 
                  />
                ))}
              </div>
              <span className="text-gray-600">({product.reviewCount} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-bold text-gray-900">${product.price}</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-500 line-through">${product.originalPrice}</span>
              )}
              {product.originalPrice && (
                <Badge variant="destructive">
                  {Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}% OFF
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{product.description}</p>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Quantity and Add to Cart */}
            {product.stock > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="font-medium">Quantity:</label>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                      className="w-16 text-center border-0"
                      min="1"
                      max={product.stock}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-1"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </Button>
                  <Button variant="outline" onClick={handleAddToWishlist}>
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Truck className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Free Shipping</p>
                <p className="text-xs text-gray-600">Orders over $50</p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Secure Payment</p>
                <p className="text-xs text-gray-600">SSL protected</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Easy Returns</p>
                <p className="text-xs text-gray-600">30 day policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList>
            <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Reviews List */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Customer Reviews</h3>
                {product.reviews?.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.map((review: any) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-current' : ''}`} 
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
                )}
              </div>

              {/* Add Review Form */}
              {user && user.role === 'customer' && (
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Write a Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Rating</label>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                                className="text-2xl"
                              >
                                <Star 
                                  className={`w-6 h-6 ${star <= reviewData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Comment</label>
                          <Textarea
                            value={reviewData.comment}
                            onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                            placeholder="Share your experience with this product..."
                            required
                          />
                        </div>

                        <Button type="submit" disabled={addReviewMutation.isPending}>
                          {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Product Details</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">SKU:</dt>
                        <dd>{product.sku}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Category:</dt>
                        <dd>{product.category}</dd>
                      </div>
                      {product.brand && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Brand:</dt>
                          <dd>{product.brand}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Reward Points:</dt>
                        <dd>{product.pointsReward} points</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Additional Info</h4>
                    <p className="text-gray-600">
                      For detailed specifications, please contact our customer support 
                      or check the manufacturer's official documentation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Shipping Information</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Free shipping on orders over $50</li>
                      <li>• Standard delivery: 3-5 business days</li>
                      <li>• Express delivery: 1-2 business days (additional charges apply)</li>
                      <li>• International shipping available</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Returns & Exchanges</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• 30-day return policy</li>
                      <li>• Items must be in original condition</li>
                      <li>• Free return shipping for defective items</li>
                      <li>• Refunds processed within 5-7 business days</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
