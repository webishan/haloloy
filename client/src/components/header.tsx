import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Menu, X, ShoppingCart, User, LogOut, LayoutDashboard,
  Store, Users, Search
} from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const [location] = useLocation();

  const cartItemCount = Array.isArray(cartItems) ? cartItems.reduce((total: number, item: any) => total + (item.quantity || 0), 0) : 0;

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin': return '/admin-dashboard';
      case 'merchant': return '/merchant-dashboard';
      case 'customer': return '/customer-dashboard';
      default: return '/';
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-xl font-bold text-gray-900">KOMARCE</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className={`text-sm font-medium transition-colors hover:text-primary ${
                location === '/' ? 'text-primary' : 'text-gray-600'
              }`}>
                Home
              </span>
            </Link>
            <Link href="/marketplace">
              <span className={`text-sm font-medium transition-colors hover:text-primary ${
                location === '/marketplace' ? 'text-primary' : 'text-gray-600'
              }`}>
                Marketplace
              </span>
            </Link>
            <Link href="/admin-login">
              <span className={`text-sm font-medium transition-colors hover:text-primary ${
                location === '/admin-login' ? 'text-primary' : 'text-gray-600'
              }`}>
                Admin
              </span>
            </Link>
            {user && (
              <Link href={getDashboardPath()}>
                <span className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.includes('dashboard') ? 'text-primary' : 'text-gray-600'
                }`}>
                  Dashboard
                </span>
              </Link>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            {user && user.role === 'customer' && (
              <Link href="/cart">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.firstName?.charAt(0) || user.email.charAt(0)}
                      </span>
                    </div>
                    <span className="hidden md:block text-sm">{user.firstName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardPath()} className="flex items-center space-x-2">
                      {user.role === 'admin' ? (
                        <Users className="w-4 h-4" />
                      ) : user.role === 'merchant' ? (
                        <Store className="w-4 h-4" />
                      ) : (
                        <LayoutDashboard className="w-4 h-4" />
                      )}
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Link href="/">
                <span className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded">
                  Home
                </span>
              </Link>
              <Link href="/marketplace">
                <span className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded">
                  Marketplace
                </span>
              </Link>
              {user && (
                <Link href={getDashboardPath()}>
                  <span className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded">
                    Dashboard
                  </span>
                </Link>
              )}
              {!user && (
                <>
                  <Link href="/login">
                    <span className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded">
                      Login
                    </span>
                  </Link>
                  <Link href="/register">
                    <span className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded">
                      Sign Up
                    </span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}