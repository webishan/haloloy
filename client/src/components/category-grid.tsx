import { Link } from 'wouter';
import { Smartphone, Shirt, Home, Utensils, Heart, Gamepad2, Car, MoreHorizontal } from 'lucide-react';

const categories = [
  { name: "Electronics", slug: "electronics", icon: Smartphone },
  { name: "Fashion", slug: "fashion", icon: Shirt },
  { name: "Home & Living", slug: "home-living", icon: Home },
  { name: "Food & Drink", slug: "food-drink", icon: Utensils },
  { name: "Health & Beauty", slug: "health-beauty", icon: Heart },
  { name: "Sports & Toys", slug: "sports-toys", icon: Gamepad2 },
  { name: "Automotive", slug: "automotive", icon: Car },
  { name: "More", slug: "all", icon: MoreHorizontal }
];

export default function CategoryGrid() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Link 
                key={category.slug} 
                href={`/marketplace?category=${category.slug}`}
                className="text-center group cursor-pointer"
              >
                <div className="w-16 h-16 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">
                  {category.name}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
