import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CategoryGrid from '@/components/category-grid';
import ProductCard from '@/components/product-card';
import { ShoppingBag, Store, Star } from 'lucide-react';

export default function Home() {
  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (products: any[]) => products.slice(0, 8) // Get first 8 products as featured
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['/api/brands']
  });

  return (
    <div className="pt-32">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primary/90 text-white">
        <div className="absolute inset-0 opacity-20" 
             style={{
               backgroundImage: "url('https://images.unsplash.com/photo-1556740758-90de374c12ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=800')", 
               backgroundSize: 'cover', 
               backgroundPosition: 'center'
             }}>
        </div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Turn Your <span className="text-accent">Waste</span> Into{' '}
                <span className="text-accent">Rewards</span>
              </h1>
              <p className="text-xl text-primary-foreground/90 leading-relaxed">
                Join KOMARCE's unified loyalty ecosystem where every purchase, every action 
                contributes to a sustainable future while earning you amazing rewards.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button asChild size="lg" className="bg-accent text-black hover:bg-accent/90">
                  <Link href="/marketplace">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Start Shopping
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                  <Link href="/register?role=merchant">
                    <Store className="w-5 h-5 mr-2" />
                    Become a Merchant
                  </Link>
                </Button>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-6">
                <h3 className="text-2xl font-bold">Reward Tiers</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
                    <span className="font-semibold">Tier 1</span>
                    <span className="text-accent font-bold">800 Points</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
                    <span className="font-semibold">Tier 2</span>
                    <span className="text-accent font-bold">1,500 Points</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/20 rounded-lg">
                    <span className="font-semibold">Tier 3</span>
                    <span className="text-accent font-bold">3,500 Points</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border-2 border-accent">
                    <span className="font-semibold">Tier 4</span>
                    <span className="text-accent font-bold">32,200 Points</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CategoryGrid />

      {/* Main Advertising Area */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl overflow-hidden text-white"
                 style={{
                   backgroundImage: "linear-gradient(rgba(37, 99, 235, 0.8), rgba(29, 78, 216, 0.8)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400')",
                   backgroundSize: 'cover',
                   backgroundPosition: 'center'
                 }}>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-4">Mega Sale Event</h3>
                <p className="text-blue-100 mb-6">Earn double points on all purchases this weekend!</p>
                <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
                  <Link href="/marketplace">Shop Now</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-accent rounded-xl p-6 text-white"
                   style={{
                     backgroundImage: "linear-gradient(rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.9)), url('https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200')",
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}>
                <h4 className="font-bold mb-2">Flash Sale</h4>
                <p className="text-sm mb-4">Up to 70% off</p>
                <Button asChild size="sm" className="bg-white text-accent hover:bg-gray-100">
                  <Link href="/marketplace">View Deals</Link>
                </Button>
              </div>
              <div className="bg-primary rounded-xl p-6 text-white"
                   style={{
                     backgroundImage: "linear-gradient(rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9)), url('https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200')",
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}>
                <h4 className="font-bold mb-2">New Member</h4>
                <p className="text-sm mb-4">Get 1000 bonus points</p>
                <Button asChild size="sm" className="bg-white text-primary hover:bg-gray-100">
                  <Link href="/register">Join Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Selling Brands */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Top Selling Brands</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {brands?.slice(0, 6).map((brand: any) => (
              <Link
                key={brand.id}
                href={`/marketplace?brand=${brand.slug}`}
                className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {brand.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">{brand.name}</h3>
                <p className="text-sm text-gray-600">Various Products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Button asChild variant="ghost">
              <Link href="/marketplace">
                View All
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </Button>
          </div>
          
          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse"></div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProducts?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No featured products available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                    alt="Customer testimonial"
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">Sarah Johnson</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "KOMARCE has completely changed how I shop. The reward system is amazing 
                  and I love contributing to sustainability while saving money!"
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                    alt="Business owner testimonial"
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">Mike Chen</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "As a merchant, KOMARCE has brought me so many new customers. 
                  The platform is easy to use and the cashback system really works!"
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                    alt="Young professional testimonial"
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">Emma Wilson</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "I've earned over 5000 points in just 3 months! The variety of products 
                  and the reward tiers make every purchase feel rewarding."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
