import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'merchant' | 'customer';
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    // Redirect if authentication is required but user is not logged in
    if (requireAuth && !user) {
      setLocation(redirectTo);
      return;
    }

    // Redirect if specific role is required but user doesn't have it
    if (requiredRole && user && user.role !== requiredRole) {
      // Redirect based on user's actual role
      switch (user.role) {
        case 'admin':
          setLocation('/admin-dashboard');
          break;
        case 'merchant':
          setLocation('/merchant-dashboard');
          break;
        case 'customer':
          setLocation('/customer-dashboard');
          break;
        default:
          setLocation('/');
      }
      return;
    }

    // Redirect logged in users away from auth pages
    if (!requireAuth && user) {
      switch (user.role) {
        case 'admin':
          setLocation('/admin-dashboard');
          break;
        case 'merchant':
          setLocation('/merchant-dashboard');
          break;
        case 'customer':
          setLocation('/customer-dashboard');
          break;
        default:
          setLocation('/');
      }
      return;
    }
  }, [user, loading, requireAuth, requiredRole, redirectTo, setLocation]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
            <span className="text-white font-bold">K</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && !user) return null;
  if (requiredRole && (!user || user.role !== requiredRole)) return null;
  if (!requireAuth && user) return null;

  return <>{children}</>;
}