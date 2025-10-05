import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/product-card';
import { Search, Filter, Grid, List } from 'lucide-react';

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [, setLocation] = useLocation();

  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search');
    const category = urlParams.get('category');
    const brand = urlParams.get('brand');
    
    if (search) setSearchQuery(search);
    if (category) setSelectedCategory(category);
    if (brand) setSelectedBrand(brand);
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['/api/brands']
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products', { 
      search: searchQuery,
      categoryId: selectedCategory,
      brandId: selectedBrand
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'all') {
        const category = categories.find((c: any) => c.slug === selectedCategory);
        if (category) params.append('categoryId', category.id);
      }
      if (selectedBrand && selectedBrand !== 'all') {
        const brand = brands.find((b: any) => b.slug === selectedBrand);
        if (brand) params.append('brandId', brand.id);
      }
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: categories.length > 0 && brands.length > 0
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedBrand) params.append('brand', selectedBrand);
    
    setLocation(`/marketplace${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setLocation('/marketplace');
  };

  const sortedProducts = products ? [...products].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-high':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'rating':
        return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
      case 'points':
        return b.pointsReward - a.pointsReward;
      default:
        return a.name.localeCompare(b.name);
    }
  }) : [];

  const activeFiltersCount = [searchQuery, selectedCategory !== 'all' ? selectedCategory : '', selectedBrand !== 'all' ? selectedBrand : ''].filter(Boolean).length;

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketplace</h1>
          <p className="text-gray-600">Discover amazing products and earn reward points</p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" key="all-categories">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.slug || category.id || 'unknown'}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" key="all-brands">All Brands</SelectItem>
                  {brands.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.slug || brand.id || 'unknown'}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1 bg-red-600 hover:bg-red-700">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="border-red-200 text-red-600 hover:bg-red-50">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary">
                    Category: {categories?.find((c: any) => c.slug === selectedCategory)?.name}
                  </Badge>
                )}
                {selectedBrand && (
                  <Badge variant="secondary">
                    Brand: {brands?.find((b: any) => b.slug === selectedBrand)?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sort and View Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {productsLoading ? 'Loading...' : `${sortedProducts.length} products found`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="points">Most Points</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {productsLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(12)].map((_, i) => (
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
        ) : sortedProducts.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {sortedProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or browse our categories
            </p>
            <Button onClick={clearFilters} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
