import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, Phone, MapPin, Clock, Send, 
  MessageCircle, Globe, Users, Headphones
} from 'lucide-react';

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', subject: '', message: '', category: 'general' });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="pt-32 min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-red-600 to-red-600 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Have questions about Holyloy? We're here to help! Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Headphones className="w-5 h-5 text-red-600" />
                  </div>
                  <span>Customer Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-sm text-gray-600">support@holyloy.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-sm text-gray-600">+880 1234-567890</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold">Hours</p>
                    <p className="text-sm text-gray-600">24/7 Support</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <span>Regional Offices</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold flex items-center space-x-2">
                    <span>🇧🇩</span>
                    <span>Bangladesh</span>
                  </p>
                  <p className="text-sm text-gray-600">Dhaka, Bangladesh</p>
                </div>
                <div>
                  <p className="font-semibold flex items-center space-x-2">
                    <span>🇲🇾</span>
                    <span>Malaysia</span>
                  </p>
                  <p className="text-sm text-gray-600">Kuala Lumpur, Malaysia</p>
                </div>
                <div>
                  <p className="font-semibold flex items-center space-x-2">
                    <span>🇦🇪</span>
                    <span>UAE</span>
                  </p>
                  <p className="text-sm text-gray-600">Dubai, UAE</p>
                </div>
                <div>
                  <p className="font-semibold flex items-center space-x-2">
                    <span>🇵🇭</span>
                    <span>Philippines</span>
                  </p>
                  <p className="text-sm text-gray-600">Manila, Philippines</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-r from-red-600 to-red-600 text-white">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-red-100" />
                <h3 className="text-xl font-bold mb-2">Live Chat</h3>
                <p className="text-red-100 mb-4">Get instant help from our support team</p>
                <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  Start Chat
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                <p className="text-gray-600">Fill out the form below and we'll get back to you within 24 hours.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Full Name
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                      required
                      className="w-full border-2 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your.email@example.com"
                      required
                      className="w-full border-2 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Subject
                    </label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="How can we help you?"
                      required
                      className="w-full border-2 border-gray-200 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange as any}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="merchant">Merchant Partnership</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="feedback">Feedback & Suggestions</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Message
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      required
                      className="w-full border-2 border-gray-200 focus:border-red-500 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm text-left">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">How do I earn reward points?</h3>
                <p className="text-gray-600">You earn points with every purchase, product review, and by referring friends to Holyloy.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm text-left">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">How can I become a merchant?</h3>
                <p className="text-gray-600">Click "Sign Up" and select merchant registration. Our team will guide you through the onboarding process.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm text-left">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">Is Holyloy available in my country?</h3>
                <p className="text-gray-600">We currently serve Bangladesh, Malaysia, UAE, and Philippines with plans to expand further.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm text-left">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">How secure are my transactions?</h3>
                <p className="text-gray-600">We use industry-standard encryption and security measures to protect all your personal and payment information.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}