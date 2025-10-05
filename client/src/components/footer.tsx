import { Link } from 'wouter';
import { Logo } from '@/components/ui/logo';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-red-600 to-red-700 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 lg:col-span-2">
            <div className="mb-4">
              <Logo size="md" className="text-white" />
            </div>
            <p className="text-white mb-6 max-w-md">
              A unified e-commerce and loyalty ecosystem focused on sustainability. 
              Connect with merchants, earn rewards, and contribute to environmental goals 
              with every purchase.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/marketplace">
                  <span className="text-white/70 hover:text-white transition-colors">Marketplace</span>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <span className="text-white/70 hover:text-white transition-colors">About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-white/70 hover:text-white transition-colors">Contact</span>
                </Link>
              </li>
              <li>
                <Link href="/help">
                  <span className="text-white/70 hover:text-white transition-colors">Help Center</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-white" />
                <span className="text-white/70">support@holyloy.com</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-white" />
                <span className="text-white/70">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-white mt-1" />
                <span className="text-white/70">
                  Global Operations<br />
                  Bangladesh • Malaysia • UAE • Philippines
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-white/70 text-sm">
                © {currentYear} DotQuanta. All rights reserved.
              </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy">
                <span className="text-white/70 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </span>
              </Link>
              <Link href="/terms">
                <span className="text-white/70 hover:text-white text-sm transition-colors">
                  Terms of Service
                </span>
              </Link>
              <Link href="/cookies">
                <span className="text-white/70 hover:text-white text-sm transition-colors">
                  Cookie Policy
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}