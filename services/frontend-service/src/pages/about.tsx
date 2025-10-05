import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Target, Users, Award, Zap, Heart, Globe, 
  Leaf, ShoppingBag, TrendingUp, Star
} from 'lucide-react';

export default function About() {
  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-600 to-red-600 bg-clip-text text-transparent">
            Revolutionizing E-commerce with Loyalty
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Holyloy is a unified e-commerce and loyalty ecosystem that connects customers, merchants, and administrators in a sustainable marketplace where every transaction contributes to environmental goals while earning valuable reward points.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Target className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Our Mission</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                To create a sustainable e-commerce platform that rewards conscious consumers and empowers merchants while contributing to global environmental initiatives through innovative loyalty programs.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Globe className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Our Vision</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                To become the world's leading loyalty-driven marketplace, fostering sustainable commerce across Bangladesh, Malaysia, UAE, and Philippines while creating lasting positive impact.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Makes Us Different</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover the innovative features that set Holyloy apart in the e-commerce landscape
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sustainability Focus</h3>
                <p className="text-gray-600">Every transaction contributes to environmental goals and sustainable practices</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Award className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Loyalty Rewards</h3>
                <p className="text-gray-600">Four-tier reward system with points, badges, and exclusive benefits</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Vendor Platform</h3>
                <p className="text-gray-600">Connect customers with verified merchants across multiple countries</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Modern Technology</h3>
                <p className="text-gray-600">Built with latest technologies for fast, secure, and reliable experience</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-pink-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Customer First</h3>
                <p className="text-gray-600">Designed with customer satisfaction and user experience as top priority</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-indigo-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Growth Focused</h3>
                <p className="text-gray-600">Helping merchants grow their business with powerful analytics and tools</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-600 to-red-500 text-white mb-16">
          <CardContent className="p-12">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">4</div>
                <div className="text-red-100">Countries Served</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">1M+</div>
                <div className="text-red-100">Points Distributed</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="text-red-100">Active Merchants</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">10K+</div>
                <div className="text-red-100">Happy Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Join Holyloy?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Whether you're a customer looking for sustainable products or a merchant wanting to grow your business, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace">
              <Button size="lg" className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-semibold px-8">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Shopping
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-2 border-red-200 text-red-700 hover:bg-red-50 font-semibold px-8">
                <Star className="w-5 h-5 mr-2" />
                Become a Merchant
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}