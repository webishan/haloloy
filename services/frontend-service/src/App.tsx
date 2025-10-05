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
import CustomerLogin from "@/pages/customer-login";
import MerchantLogin from "@/pages/merchant-login";
import Marketplace from "@/pages/marketplace";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import CustomerDashboard from "@/pages/customer-dashboard";
import MerchantDashboard from "@/pages/merchant-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminPortal from "@/pages/admin-portal";
import GlobalAdminPortal from "@/pages/global-admin-portal";
import LocalAdminPortal from "@/pages/local-admin-portal";
import MerchantPortal from "@/pages/merchant-portal";
import CustomerPortal from "@/pages/customer-portal";
import CustomerAuth from "@/pages/customer-auth";
import MerchantPanel from "@/pages/merchant-panel";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AuthGuard from "@/components/auth-guard";
import About from "@/pages/about";
import Contact from "@/pages/contact";

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
          <Route path="/customer-login">
            <AuthGuard requireAuth={false}>
              <CustomerLogin />
            </AuthGuard>
          </Route>
          <Route path="/merchant-login">
            <AuthGuard requireAuth={false}>
              <MerchantLogin />
            </AuthGuard>
          </Route>
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
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
          <Route path="/admin-portal" component={AdminPortal} />
          <Route path="/global-admin-portal" component={GlobalAdminPortal} />
          <Route path="/local-admin-portal" component={LocalAdminPortal} />
          <Route path="/merchant-portal" component={MerchantPortal} />
          <Route path="/customer-portal" component={CustomerPortal} />
          <Route path="/customer-auth">
            <AuthGuard requireAuth={false}>
              <CustomerAuth />
            </AuthGuard>
          </Route>
          <Route path="/merchant-panel" component={MerchantPanel} />
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
