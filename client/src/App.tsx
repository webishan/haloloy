import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminLogin from "@/pages/admin-login";
import Marketplace from "@/pages/marketplace";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import CustomerDashboard from "@/pages/customer-dashboard";
import MerchantDashboard from "@/pages/merchant-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AuthGuard from "@/components/auth-guard";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login">
            <AuthGuard requireAuth={false}>
              <Login />
            </AuthGuard>
          </Route>
          <Route path="/register">
            <AuthGuard requireAuth={false}>
              <Register />
            </AuthGuard>
          </Route>
          <Route path="/admin-login">
            <AuthGuard requireAuth={false}>
              <AdminLogin />
            </AuthGuard>
          </Route>
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/product/:slug" component={ProductDetail} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/customer-dashboard">
            <AuthGuard requiredRole="customer">
              <CustomerDashboard />
            </AuthGuard>
          </Route>
          <Route path="/merchant-dashboard">
            <AuthGuard requiredRole="merchant">
              <MerchantDashboard />
            </AuthGuard>
          </Route>
          <Route path="/admin-dashboard">
            <AuthGuard requiredRole="admin">
              <AdminDashboard />
            </AuthGuard>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
