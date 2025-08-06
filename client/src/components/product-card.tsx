import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { Star, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    originalPrice?: string;
    pointsReward: number;
    images?: string[];
    rating?: string;
    reviewCount: number;
    category?: string;
    brand?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, addingToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart({ productId: product.id, quantity: 1 });
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toast({
      title: "Added to wishlist",
      description: `${product.name} has been added to your wishlist.`
    });
  };

  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center`;

  return (
    <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative overflow-hidden">
        <Link href={`/product/${product.slug}`}>
          <img 
            src={imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        
        {/* Points Badge */}
        <Badge className="absolute top-3 right-3 bg-accent text-black">
          +{product.pointsReward} pts
        </Badge>
        
        {/* Wishlist Button */}
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-3 left-3 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
          onClick={handleAddToWishlist}
        >
          <Heart className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-800 mb-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {product.category && (
          <p className="text-sm text-gray-600 mb-3">{product.category}</p>
        )}
        
        {/* Rating */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-4 h-4 ${i < Math.floor(parseFloat(product.rating || '0')) ? 'fill-current' : ''}`} 
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">({product.reviewCount})</span>
        </div>
        
        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-800">${product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through ml-2">
                ${product.originalPrice}
              </span>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
