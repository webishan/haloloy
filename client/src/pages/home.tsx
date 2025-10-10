import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CategoryGrid from '@/components/category-grid';
import ProductCard from '@/components/product-card';
import HeroSlideshow from '@/components/hero-slideshow';
import { Star } from 'lucide-react';

export default function Home() {
  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (products: any[]) => products.slice(0, 8) // Get first 8 products as featured
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['/api/brands']
  });

  // Define the slideshow images using the new banner images
  const slideshowImages = [
    '/images/Web-banner-2.jpg',
    '/images/Web-banner-3.jpg',
    '/images/Web-banner-4.jpg'
  ];

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      {/* Hero Section with Slideshow */}
      <HeroSlideshow 
        images={slideshowImages}
        autoPlay={true}
        autoPlayInterval={5000}
      />

      <CategoryGrid />

      {/* Main Advertising Area */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-r from-red-700 via-red-600 to-red-800 rounded-2xl overflow-hidden text-white"
                 style={{
                  backgroundImage: "linear-gradient(rgba(220, 38, 38, 0.85), rgba(153, 27, 27, 0.85)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400')",
                   backgroundSize: 'cover',
                   backgroundPosition: 'center'
                 }}>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-4">Mega Sale Event</h3>
                <p className="text-red-100 mb-6">Earn double points on all purchases this weekend!</p>
                <Button asChild className="bg-white text-red-600 hover:bg-red-50">
                  <Link href="/marketplace">Shop Now</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl p-6 text-white bg-gradient-to-r from-red-700 to-amber-600"
                   style={{
                    backgroundImage: "linear-gradient(rgba(185, 28, 28, 0.85), rgba(217, 119, 6, 0.75)), url('https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200')",
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}>
                <h4 className="font-bold mb-2">Flash Sale</h4>
                <p className="text-sm mb-4">Up to 70% off</p>
                <Button asChild size="sm" className="bg-white text-red-600 hover:bg-red-50">
                  <Link href="/marketplace">View Deals</Link>
                </Button>
              </div>
              <div className="rounded-xl p-6 text-white bg-gradient-to-r from-red-800 to-rose-700"
                   style={{
                    backgroundImage: "linear-gradient(rgba(127, 29, 29, 0.85), rgba(190, 18, 60, 0.80)), url('https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200')",
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}>
                <h4 className="font-bold mb-2">New Member</h4>
                <p className="text-sm mb-4">Get 1000 bonus points</p>
                <Button asChild size="sm" className="bg-white text-red-600 hover:bg-red-50">
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
          <h2 className="text-3xl font-bold text-center mb-12 text-neutral-900">Top Selling Brands</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.isArray(brands) && brands.slice(0, 6).map((brand: any) => (
              <Link
                key={brand.id}
                href={`/marketplace?brand=${brand.slug}`}
                className="group bg-white rounded-2xl p-6 text-center transition-all duration-300 border-2 border-gray-100 hover:border-red-400 shadow hover:shadow-xl transform hover:-translate-y-2 hover:scale-105 cursor-pointer"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-800 to-red-600 rounded-2xl flex items-center justify-center border-2 border-red-500/40 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-6">
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
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent hidden">
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center text-white font-bold text-lg mr-4">
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
                  "Holyloy has completely changed how I shop. The reward system is amazing 
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
                  "As a merchant, Holyloy has brought me so many new customers. 
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
