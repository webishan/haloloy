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
    <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="mb-6 bg-white/20 text-white border-white/30 text-base px-6 py-2">
                  🌟 Loyalty Marketplace Revolution
                </Badge>
                <h1 className="text-6xl lg:text-7xl font-black leading-tight mb-8">
                  Shop Smart,
                  <br />
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Earn More
                  </span>
                </h1>
              </div>
              <p className="text-2xl text-white/90 leading-relaxed font-medium max-w-xl">
                Join KOMARCE's revolutionary loyalty ecosystem where every purchase 
                earns rewards while contributing to a sustainable future.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-white text-blue-700 hover:bg-gray-100 text-xl font-bold py-8 px-12 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <Link href="/marketplace">
                    <ShoppingBag className="w-6 h-6 mr-3" />
                    Start Shopping
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="border-2 border-white bg-white/10 text-white hover:bg-white hover:text-blue-700 text-xl font-bold py-8 px-12 rounded-2xl backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
                >
                  <Link href="/register?role=merchant">
                    <Store className="w-6 h-6 mr-3" />
                    Become a Merchant
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lg:flex lg:justify-center">
              <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-10 max-w-md shadow-2xl border border-white/20">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">🏆 Reward Tiers</h3>
                  <p className="text-white/80">Unlock exclusive benefits</p>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-5 bg-white/20 rounded-2xl border border-white/30">
                    <div className="flex items-center space-x-3">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="font-bold text-white text-lg">Bronze</span>
                    </div>
                    <span className="text-yellow-300 font-black text-xl">800 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-white/20 rounded-2xl border border-white/30">
                    <div className="flex items-center space-x-3">
                      <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                      <span className="font-bold text-white text-lg">Silver</span>
                    </div>
                    <span className="text-yellow-300 font-black text-xl">1.5K pts</span>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-white/20 rounded-2xl border border-white/30">
                    <div className="flex items-center space-x-3">
                      <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                      <span className="font-bold text-white text-lg">Gold</span>
                    </div>
                    <span className="text-yellow-300 font-black text-xl">3.5K pts</span>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-yellow-400/30 to-orange-400/30 rounded-2xl border-2 border-yellow-400/50">
                    <div className="flex items-center space-x-3">
                      <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                      <span className="font-bold text-white text-lg">Diamond</span>
                    </div>
                    <span className="text-yellow-300 font-black text-xl">32.2K pts</span>
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
            {Array.isArray(brands) && brands.slice(0, 6).map((brand: any) => (
              <Link
                key={brand.id}
                href={`/marketplace?brand=${brand.slug}`}
                className="group bg-white rounded-2xl p-6 text-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border-2 border-gray-100 hover:border-blue-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 hover:scale-105 cursor-pointer"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border-2 border-blue-200 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-6">
                  <img 
                    src={`https://logo.clearbit.com/${brand.name.toLowerCase().replace(/\s+/g, '')}.com`}
                    alt={brand.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden">
                    {brand.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors text-lg mb-1">{brand.name}</h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Various Products</p>
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                    SJ
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Sarah Johnson</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  "KOMARCE has completely changed how I shop. The reward system is amazing 
                  and I love contributing to sustainability while earning points on every purchase!"
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
