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
  Store, Users, Search, Shield
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">KOMARCE</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className={`text-sm font-semibold transition-colors hover:text-blue-600 ${
                location === '/' ? 'text-blue-600' : 'text-gray-700'
              }`}>
                Home
              </span>
            </Link>
            <Link href="/marketplace">
              <span className={`text-sm font-semibold transition-colors hover:text-blue-600 ${
                location === '/marketplace' ? 'text-blue-600' : 'text-gray-700'
              }`}>
                Marketplace
              </span>
            </Link>
            <Link href="/about">
              <span className={`text-sm font-semibold transition-colors hover:text-blue-600 ${
                location === '/about' ? 'text-blue-600' : 'text-gray-700'
              }`}>
                About Us
              </span>
            </Link>
            <Link href="/contact">
              <span className={`text-sm font-semibold transition-colors hover:text-blue-600 ${
                location === '/contact' ? 'text-blue-600' : 'text-gray-700'
              }`}>
                Contact Us
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
              <div className="flex items-center space-x-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6">
                      Login Portal
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/customer-login" className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span>Customer Login</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/merchant-login" className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-orange-600" />
                        <span>Merchant Portal</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin-login" className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Admin Access</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link href="/register">
                  <Button size="sm" variant="outline" className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold px-6">
                    Sign Up
                  </Button>
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