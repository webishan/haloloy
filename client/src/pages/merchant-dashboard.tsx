import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
// MerchantRewardsDisplay removed - will be rebuilt from scratch
import { useSimpleRealtime } from '@/hooks/use-simple-realtime';
import { NotificationProvider } from '@/hooks/use-notifications';
import NotificationBadge, { NotificationWrapper, MessageNotificationBadge } from '@/components/NotificationBadge';
import SecureChat from '@/components/SecureChat';
import MerchantReferralProgram from '@/components/MerchantReferralProgram';
import { AffiliateCashbackBox } from '@/components/AffiliateCashbackBox';
import { 
  LayoutDashboard, Package, ShoppingCart, Coins, BarChart, 
  Plus, Edit, Trash2, DollarSign, TrendingUp, Users, Store,
  Star, Award, Calendar, Eye, Settings, Target, Copy,
  CreditCard, Wallet, Send, Download, Gift, Crown,
  ArrowUpRight, ArrowDownRight, Filter, Search, MoreHorizontal,
  RefreshCw, MessageCircle,
  QrCode, UserPlus, Activity, PieChart, LineChart, Bell,
  Menu, X as XIcon, Home, Infinity, Trophy, User, Zap,
  AlertCircle, Percent, Calculator, Building2, Upload,
  Smartphone, Mail, CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
         BarChart as RechartsBar, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

// QR Code Scan Component
function QRScanComponent({ onCustomerScanned, onError }: { 
  onCustomerScanned: (customer: any) => void; 
  onError: (error: string) => void; 
}) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scanQRCode = async (qrCode: string) => {
    try {
      setIsScanning(true);
      const token = localStorage.getItem('token');
      if (!token) {
        onError('Please log in to scan QR codes');
        return;
      }

      const response = await fetch('/api/merchant/scan-customer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle blocked customer error specifically
        if (response.status === 403 && errorData.details?.blockedAt) {
          const blockedDate = new Date(errorData.details.blockedAt).toLocaleDateString();
          const errorMessage = `❌ Customer Access Denied\n\n${errorData.details.customerName} (${errorData.details.accountNumber}) was previously removed from your customer list on ${blockedDate}.\n\nYou cannot re-add them using their QR code. If you need to re-add this customer, please use the "Create Customer" option instead.`;
          throw new Error(errorMessage);
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to scan QR code');
      }

      const result = await response.json();
      onCustomerScanned(result.customer);
    } catch (error: any) {
      onError(error.message || 'Failed to scan QR code');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      // Handle image files - decode QR code
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            onError('Failed to process image');
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            setQrCodeInput(code.data);
            // Auto-scan the decoded QR code
            setTimeout(() => {
              scanQRCode(code.data);
            }, 500);
          } else {
            onError('No QR code found in the image');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // For text files, read the content
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setQrCodeInput(result.trim());
      };
      reader.readAsText(file);
    }
  };

  const handleManualInput = () => {
    if (qrCodeInput.trim()) {
      scanQRCode(qrCodeInput.trim());
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setCameraError(null);
      console.log('🎥 Starting camera...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }
      
      console.log('📱 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('✅ Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        
        // Wait for video to be ready before starting scanning
        videoRef.current.onloadedmetadata = () => {
          console.log('🎬 Video metadata loaded, starting QR scanning');
          startQRScanning();
        };
      }
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      let errorMessage = 'Camera access denied or not available.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints cannot be satisfied.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const startQRScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    console.log('🔍 Starting QR code scanning...');
    
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && !isScanning && cameraActive) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          // Use a smaller canvas for better performance
          const scale = 0.5;
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            console.log('✅ QR code detected:', code.data);
            // Found a QR code, stop scanning and process it
            stopCamera();
            scanQRCode(code.data);
          }
        }
      }
    }, 200); // Check every 200ms for better performance
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera when switching modes
  useEffect(() => {
    if (scanMode !== 'camera') {
      stopCamera();
    }
  }, [scanMode]);

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex space-x-2">
        <Button
          variant={scanMode === 'camera' ? 'default' : 'outline'}
          onClick={() => setScanMode('camera')}
          className="flex-1"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Camera Scan
        </Button>
        <Button
          variant={scanMode === 'upload' ? 'default' : 'outline'}
          onClick={() => setScanMode('upload')}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {scanMode === 'camera' ? (
        <div className="space-y-4">
          {/* Camera Section */}
          <div className="space-y-4">
            {!cameraActive ? (
              <div className="text-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-xl shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to scan QR codes</h3>
                <p className="text-gray-600 mb-6">Click "Start Camera" to begin real-time scanning</p>
                <Button 
                  onClick={startCamera}
                  disabled={isScanning}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-white rounded-xl shadow-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-blue-500 rounded-lg bg-transparent">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-white bg-opacity-95 backdrop-blur-sm text-gray-900 text-center py-3 px-4 rounded-lg shadow-lg border border-gray-200">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium">Point your camera at a QR code</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={stopCamera}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Stop Camera
                </Button>
              </div>
            )}
            
            {cameraError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 text-sm">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Manual QR Code Input */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <Label htmlFor="qrInput" className="text-sm font-medium text-gray-700 mb-2 block">Or enter QR code manually:</Label>
            <Input
              id="qrInput"
              placeholder="KOMARCE:CUSTOMER:..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              className="mb-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button 
              onClick={handleManualInput}
              disabled={!qrCodeInput.trim() || isScanning}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 rounded-lg font-medium transition-all duration-200"
            >
              {isScanning ? 'Scanning...' : 'Scan QR Code'}
            </Button>
          </div>
          
          {/* Hidden canvas for QR code detection */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-xl shadow-sm">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-50 to-pink-100 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload QR code image or text file</h3>
            <p className="text-gray-600 mb-6">Supports PNG, JPG, GIF, TXT, JSON</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Choose File
            </Button>
          </div>
          
          {/* Manual QR Code Input */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <Label htmlFor="qrInputUpload" className="text-sm font-medium text-gray-700 mb-2 block">Or enter QR code manually:</Label>
            <Input
              id="qrInputUpload"
              placeholder="KOMARCE:CUSTOMER:..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              className="mb-3 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
            <Button 
              onClick={handleManualInput}
              disabled={!qrCodeInput.trim() || isScanning}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 rounded-lg font-medium transition-all duration-200"
            >
              {isScanning ? 'Scanning...' : 'Scan QR Code'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchantDashboard() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSendPointsDialog, setShowSendPointsDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showQRScanDialog, setShowQRScanDialog] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ['/api/dashboard/merchant'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  const { data: walletData = {}, isLoading: walletsLoading } = useQuery({
    queryKey: ['/api/merchant/wallet'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds instead of 3 seconds
    refetchIntervalInBackground: false, // Don't refetch in background
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true // Only refetch on component mount
  });

  // Fetch real-time cashback data
  const { data: cashbackData, refetch: refetchCashback } = useQuery({
    queryKey: ['/api/merchant/cashback/summary'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0
  });

  // Fetch comprehensive rewards history data with pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showCashbackNotification, setShowCashbackNotification] = useState(true);
  const { data: rewardsHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/merchant/rewards/history', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/merchant/rewards/history?page=${currentPage}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch rewards history');
      }
      return response.json();
    },
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: rawCustomers = [], refetch: refetchCustomers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/merchant/scanned-customers'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: false,
    staleTime: 5000, // Consider data fresh for 5 seconds (reduced for faster updates)
    cacheTime: 60000, // Cache for 1 minute (reduced for faster updates)
    refetchOnWindowFocus: true, // Enable refetch on window focus for better UX
    refetchOnMount: true,
    retry: 3,
    retryDelay: 1000,
    onSuccess: (data) => {
      console.log('✅ Customer list updated:', data);
      if (data && data.length > 0) {
        console.log('📋 Available customers:', data.map((c: any) => `${c.fullName} - ${c.accountNumber}`));
      }
    },
    onError: (error) => {
      console.error('❌ Failed to fetch customers:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load customer list",
        variant: "destructive"
      });
    }
  });

  // Use raw customers data directly - no localStorage filtering
  const customers = rawCustomers;

  // Only refresh on component mount, not continuously
  useEffect(() => {
    if (user && user.role === 'merchant') {
      // Only clear cache on initial load, not continuously
      queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
    }
  }, [user, queryClient]);

  // Real-time updates for all merchant data including reports
  const { forceRefresh } = useSimpleRealtime([
    '/api/merchant/wallet',
    '/api/dashboard/merchant',
    '/api/merchant/scanned-customers',
    '/api/merchant/profile',
    '/api/merchant/leaderboard',
    '/api/merchant/point-transfers',
    '/api/merchant/points-received',
    '/api/merchant/transactions',
    '/api/merchant/reports'
  ], 5000); // Update every 5 seconds for real-time reports

  // Manual refresh function for immediate updates
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
    queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
    toast({ title: "Refreshing Data", description: "Merchant data is being refreshed..." });
  };

  // Listen for point distribution updates
  useEffect(() => {
    const checkForPointUpdates = () => {
      // Check if loyalty points have increased
      const currentPoints = walletData?.rewardPointBalance || 0;
      const previousPoints = localStorage.getItem('previousLoyaltyPoints');
      
      if (previousPoints && parseInt(previousPoints) < currentPoints) {
        const pointsGained = currentPoints - parseInt(previousPoints);
        toast({ 
          title: "🎉 Points Received!", 
          description: `You received ${pointsGained} loyalty points from admin distribution!`,
          duration: 5000
        });
      }
      
      // Store current points for next comparison
      localStorage.setItem('previousLoyaltyPoints', currentPoints.toString());
    };

    if (walletData?.rewardPointBalance !== undefined) {
      checkForPointUpdates();
    }
  }, [walletData?.rewardPointBalance]);

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['/api/merchant/leaderboard'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: merchantProfile = {} } = useQuery({
    queryKey: ['/api/merchant/profile'],
    enabled: !!user && user.role === 'merchant'
  });

  const { data: pointTransfers = [] } = useQuery({
    queryKey: ['/api/merchant/point-transfers'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
    cacheTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  const { data: merchantReports = {} } = useQuery({
    queryKey: ['/api/merchant/reports'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
    cacheTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  const { data: pointsReceived = [] } = useQuery({
    queryKey: ['/api/merchant/points-received'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 5000, // More frequent updates for real-time data
    refetchIntervalInBackground: false,
    staleTime: 2000, // Consider data fresh for 2 seconds only
    cacheTime: 60000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const { data: merchantTransactions = [] } = useQuery({
    queryKey: ['/api/merchant/transactions'],
    enabled: !!user && user.role === 'merchant',
    refetchInterval: 5000, // Real-time updates
    refetchIntervalInBackground: false,
    staleTime: 2000,
    cacheTime: 60000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Mutations
  const sendPointsMutation = useMutation({
    mutationFn: (data: { customerId: string; points: number; description: string }) => {
      return apiRequest('/api/merchant/rewards/send', 'POST', data);
    },
    onMutate: async (variables) => {
      // Optimistically update customer points
      await queryClient.cancelQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      
      const previousCustomers = queryClient.getQueryData(['/api/merchant/scanned-customers']);
      
      queryClient.setQueryData(['/api/merchant/scanned-customers'], (old: any) => {
        if (!old) return [];
        return old.map((customer: any) => {
          if (customer.id === variables.customerId) {
            return {
              ...customer,
              currentPointsBalance: (customer.currentPointsBalance || 0) + variables.points
            };
          }
          return customer;
        });
      });
      
      return { previousCustomers };
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: "Points sent successfully!" });
      
      // Force comprehensive refresh of all related data including reports
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/point-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/points-received'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/cashback/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/rewards/history'] });
      
      // Force immediate refresh
      forceRefresh();
      refetchCashback();
      
      // Show notification for new cashback earned
      setShowCashbackNotification(true);
      
      // Additional immediate updates
      setTimeout(() => {
        refetchCustomers();
        forceRefresh();
      }, 100);
      
      setShowSendPointsDialog(false);
    },
    onError: (error: any, variables, context) => {
      // Roll back optimistic update
      queryClient.setQueryData(['/api/merchant/scanned-customers'], context?.previousCustomers);
      toast({ title: "Error", description: error.message || "Failed to send points" });
    }
  });

  const purchasePointsMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string }) => {
      return apiRequest('/api/merchant/points/purchase', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Points purchased successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      setShowPurchaseDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to purchase points" });
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; bankAccount: string }) => {
      return apiRequest('/api/merchant/wallet/withdraw', 'POST', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Withdrawal request submitted!" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      setShowWithdrawDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to process withdrawal" });
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { fullName: string; mobileNumber: string; email?: string }) => {
      const response = await fetch('/api/merchant/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const isReAdded = data.message && data.message.includes('re-added');
      
      // Show different messages based on whether customer was created or re-added
      if (isReAdded) {
        toast({ 
          title: "Customer Re-added Successfully!", 
          description: `${data.customer.fullName} has been re-added to your customer list.`
        });
      } else {
        // Show temporary password for newly created customers
        const tempPassword = data.customer.tempPassword;
        const loginInfo = data.customer.loginInfo;
        
        toast({ 
          title: "Customer Created Successfully!", 
          description: `${data.customer.fullName} has been added to your customer list.\n\n🔑 Temporary Password: ${tempPassword}\n📱 Login Options: ${loginInfo.canLoginWith}\n\nPlease share these credentials with the customer.`,
          duration: 10000 // Show for 10 seconds so merchant can copy the password
        });
        
        // Also show an alert with the login details
        setTimeout(() => {
          alert(`Customer Created Successfully!\n\nCustomer: ${data.customer.fullName}\nPhone: ${data.customer.mobileNumber}\nEmail: ${data.customer.email || 'Not provided'}\nAccount Number: ${data.customer.accountNumber}\n\n🔑 TEMPORARY PASSWORD: ${tempPassword}\n\nLogin Options: ${loginInfo.canLoginWith}\n\nPlease share these credentials with the customer so they can log in to their account.`);
        }, 1000);
      }
      

      
      // Comprehensive refresh of customer data
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      
      // Force immediate refresh with multiple attempts
      setTimeout(() => {
        refetchCustomers();
      }, 100);
      
      setTimeout(() => {
        refetchCustomers();
      }, 500);
      
      setTimeout(() => {
        refetchCustomers();
      }, 1000);
      
      setShowCreateCustomerDialog(false);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create customer";
      let title = "Cannot Create Customer";
      
      // Parse the error response to get more details
      try {
        const response = JSON.parse(error.message);
        if (response.details?.canUnblock) {
          title = "Customer Previously Removed";
          errorMessage = `${response.message}\n\nWould you like to unblock this customer so they can be re-added?`;
          // TODO: Add unblock functionality here
        } else {
          errorMessage = response.message || response.error || errorMessage;
        }
      } catch (e) {
        // Handle string error messages
        if (error.message.includes("previously removed")) {
          title = "Customer Previously Removed";
          errorMessage = error.message;
        } else if (error.message.includes("already exists")) {
          if (error.message.includes("already in your customer list")) {
            errorMessage = "This customer is already in your customer list. Please check the Customers section.";
          } else if (error.message.includes("mobile number")) {
            errorMessage = "A customer with this phone number already exists. Please use a different phone number.";
          } else if (error.message.includes("email")) {
            errorMessage = "A customer with this email already exists. Please use a different email address.";
          }
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({ 
        title, 
        description: errorMessage,
        variant: "destructive",
        duration: 8000 // Longer duration for blocked customer messages
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await fetch(`/api/merchant/reset-customer-password/${customerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const customer = data.customer;
      const tempPassword = data.tempPassword;
      
      toast({ 
        title: "Password Reset Successfully!", 
        description: `New password for ${customer.fullName}: ${tempPassword}`,
        duration: 10000
      });
      
      // Show detailed alert with login information
      setTimeout(() => {
        alert(`Password Reset Successful!\n\nCustomer: ${customer.fullName}\nPhone: ${customer.mobileNumber}\nEmail: ${customer.email || 'Not provided'}\nAccount: ${customer.accountNumber}\n\n🔑 NEW PASSWORD: ${tempPassword}\n\nPlease share this new password with the customer so they can log in.`);
      }, 1000);
    },
    onError: (error: any) => {
      toast({ 
        title: "Password Reset Failed", 
        description: error.message || "Failed to reset customer password",
        variant: "destructive"
      });
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      console.log('🗑️ Attempting to delete customer:', customerId);
      console.log('🔍 Available customers:', customers.map(c => ({ id: c.id, name: c.fullName })));
      
      // Use the primary POST endpoint which has better debugging
      try {
        const response = await fetch(`/api/merchant/delete-customer/${customerId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('📡 Delete response status:', response.status);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          if (response.ok) {
            console.log('✅ Delete successful:', result);
            return result;
          } else {
            console.error('❌ Delete failed:', result);
            throw new Error(result.error || 'Failed to delete customer');
          }
        } else {
          const textResponse = await response.text();
          console.error('❌ Server returned non-JSON response:', textResponse);
          throw new Error('Server returned invalid response format');
        }
      } catch (error) {
        console.error('❌ Delete request failed:', error);
        throw error;
      }
    },
    onMutate: async (customerId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/merchant/scanned-customers'] });

      // Snapshot the previous value
      const previousCustomers = queryClient.getQueryData(['/api/merchant/scanned-customers']);

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/merchant/scanned-customers'], (old: any) => {
        if (!old) return [];
        return old.filter((customer: any) => customer.id !== customerId);
      });

      // Return a context object with the snapshotted value
      return { previousCustomers };
    },
    onSuccess: (data, customerId) => {
      toast({ 
        title: "Customer Removed", 
        description: "Customer has been removed from your customer list." 
      });
      
      // Force comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/merchant'] });
      queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
      
      // Force immediate refresh
      setTimeout(() => {
        refetchCustomers();
      }, 100);
    },
    onError: (error: any, customerId, context) => {
      console.error('❌ Delete customer error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        customerId,
        availableCustomers: customers.map(c => ({ id: c.id, name: c.fullName }))
      });
      
      // Roll back optimistic update on error
      queryClient.setQueryData(['/api/merchant/scanned-customers'], context?.previousCustomers);
      
      let errorMessage = "Failed to delete customer";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "Delete Failed", 
        description: errorMessage,
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Country data with flags
  const countryData = {
    'BD': { name: 'Bangladesh', flag: '🇧🇩', currency: '৳' },
    'IN': { name: 'India', flag: '🇮🇳', currency: '₹' },
    'PK': { name: 'Pakistan', flag: '🇵🇰', currency: '₨' },
    'US': { name: 'United States', flag: '🇺🇸', currency: '$' },
    'GB': { name: 'United Kingdom', flag: '🇬🇧', currency: '£' }
  };

  // Merchant data from API
  const merchantData = {
    loyaltyPoints: walletData?.rewardPointBalance || 0,
    totalCashback: cashbackData?.totalCashback || 0,
    balance: walletData?.commerceWalletBalance || 0,
    incomeBalance: walletData?.incomeWalletBalance || 0,
    registeredCustomers: customers?.length || 0,
    merchantName: merchantProfile?.merchant?.businessName || "Tech Store",
    tier: "Star Merchant",
    joinedDate: "Aug 2025",
    referralLink: "komarce.com/ref/m001",
    country: merchantProfile?.user?.country || 'BD', // Default to Bangladesh
    // Wallet breakdown
    rewardPointBalance: walletData?.rewardPointBalance || 0,
    totalPointsIssued: walletData?.totalPointsIssued || 0,
    cashbackIncome: walletData?.cashbackIncome || 0,
    referralIncome: walletData?.referralIncome || 0,
    royaltyIncome: walletData?.royaltyIncome || 0,
    totalDeposited: walletData?.totalDeposited || 0,
    totalWithdrawn: walletData?.totalWithdrawn || 0
  };

  const currentCountry = countryData[merchantData.country as keyof typeof countryData] || countryData['BD'];

  const pointDistributionData = [
    { month: 'Jan', points: 0 },
    { month: 'Feb', points: 300 },
    { month: 'Mar', points: 200 },
    { month: 'Apr', points: 250 },
    { month: 'May', points: 200 },
    { month: 'Jun', points: 250 },
    { month: 'Jul', points: 0 }
  ];

  const weeklyDistributionData = [
    { day: 'Mon', points: 120 },
    { day: 'Tue', points: 200 },
    { day: 'Wed', points: 300 },
    { day: 'Thu', points: 250 },
    { day: 'Fri', points: 400 },
    { day: 'Sat', points: 350 },
    { day: 'Sun', points: 280 }
  ];

  const marketingData = {
    templatesDownloaded: 1200,
    campaignViews: 15600,
    socialShares: 890,
    engagementRate: 7.2
  };

  const leaderboardData = leaderboard || [
    { rank: 1, name: "Ahmed Hassan", code: "AH01", points: 15420, customers: 247, revenue: 45600, tier: "Co Founder" },
    { rank: 2, name: "Sarah Khan", code: "SK02", points: 14250, customers: 198, revenue: 38900, tier: "Regional Manager" },
    { rank: 3, name: "Mohammad Ali", code: "MA03", points: 13890, customers: 176, revenue: 35200, tier: "Business Manager" },
    { rank: 4, name: "Fatima Rahman", code: "FR04", points: 12500, customers: 165, revenue: 32800, tier: "Super Star Merchant" }
  ];

  // Render Main Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              merchantProfile?.merchant?.accountType === 'e_merchant' 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {merchantProfile?.merchant?.accountType === 'e_merchant' ? 'E-Merchant' : 'Merchant'}
            </span>
          </div>
          <p className="text-gray-600">Here's what's happening with your business today</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{merchantData.loyaltyPoints}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Infinity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cashback</p>
                <div className="flex items-center space-x-2">
                  <span className="text-orange-600">{currentCountry.currency}</span>
                  <p className="text-2xl font-bold text-gray-900">{merchantData.totalCashback}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +6.2% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">{currentCountry.currency}</span>
                  <p className="text-2xl font-bold text-gray-900">{merchantData.balance}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">After VAT & Service Charge</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registered Customers</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{merchantData.registeredCustomers}</p>
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +10 new this week
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Point Distribution Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Point Distribution Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={pointDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-between text-sm text-gray-600">
              <span>0 Points Distributed Today</span>
              <span>0 Monthly Total</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowQRScanDialog(true)}
              className="w-full justify-start bg-red-600 hover:bg-red-700"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Customer QR
            </Button>
            <Button 
              onClick={() => setShowSendPointsDialog(true)}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Transfer Points
            </Button>
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full justify-start bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Purchase Points
            </Button>
            <Button 
              onClick={() => setShowWithdrawDialog(true)}
              className="w-full justify-start bg-orange-600 hover:bg-orange-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Point Transfers Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Point Transfers</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveSection('loyalty-points')}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pointTransfers && pointTransfers.length > 0 ? (
            <div className="space-y-3">
              {pointTransfers.slice(0, 3).map((transfer: any) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Send className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transfer.customerName}</p>
                      <p className="text-xs text-gray-500">{transfer.customerAccountNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{transfer.points} pts</p>
                    <p className="text-xs text-gray-500">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Send className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No point transfers yet</p>
              <p className="text-sm text-gray-400">Start sending points to customers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Program */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Program</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Referred Merchants: 0</p>
              <p className="text-sm text-gray-600">Commission Earned: {currentCountry.currency}0</p>
            </div>
            <div>
              <Button variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Your Referral Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Loyalty Points Section
  const renderLoyaltyPoints = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reward Point Wallet</h2>
        <Button onClick={() => setShowSendPointsDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Issue Loyalty Points
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{merchantData.rewardPointBalance}</p>
              <p className="text-sm text-gray-600">Available Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{merchantData.totalPointsIssued}</p>
              <p className="text-sm text-gray-600">Total Points Issued</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Points Issued Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Point Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Points Sent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pointTransfers && pointTransfers.length > 0 ? pointTransfers.slice(0, 10).map((transfer: any) => (
                <TableRow key={transfer.id}>
                  <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{transfer.customerName}</TableCell>
                  <TableCell>{transfer.customerAccountNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">
                      +{transfer.points} pts
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{transfer.description}</TableCell>
                  <TableCell>
                    <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                      {transfer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No point transfers yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Income Wallet Section
  const renderIncomeWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Income Wallet</h2>
        <Button onClick={() => setShowTransferDialog(true)}>
          <Send className="w-4 h-4 mr-2" />
          Transfer to Commerce
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{currentCountry.currency}{merchantData.incomeBalance}</p>
              <p className="text-sm text-gray-600">Total Income Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{currentCountry.currency}{merchantData.cashbackIncome}</p>
              <p className="text-sm text-gray-600">15% Cashback Income</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{currentCountry.currency}{merchantData.referralIncome}</p>
              <p className="text-sm text-gray-600">2% Referral Income</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{currentCountry.currency}{merchantData.royaltyIncome}</p>
              <p className="text-sm text-gray-600">1% Royalty Income</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">15% Cashback (on 1500+ Taka discount)</span>
                <span className="font-semibold">৳{merchantData.cashbackIncome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">2% Referral (per 1000 Taka sales)</span>
                <span className="font-semibold">৳{merchantData.referralIncome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">1% Royalty (monthly distribution)</span>
                <span className="font-semibold">৳{merchantData.royaltyIncome}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold">
                <span>Total Income</span>
                <span>৳{merchantData.incomeBalance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer to Commerce Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Transfer funds from Income Wallet to Commerce Wallet. 
                A 12.5% VAT and service charge will be applied during transfer.
              </p>
              <Button 
                onClick={() => setShowTransferDialog(true)}
                className="w-full"
                disabled={merchantData.incomeBalance <= 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer to Commerce Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Commerce Wallet Section
  const renderCommerceWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Commerce Wallet</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setShowPurchaseDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Balance
          </Button>
          <Button onClick={() => setShowWithdrawDialog(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{currentCountry.currency}{merchantData.balance}</p>
              <p className="text-sm text-gray-600">Available Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{currentCountry.currency}{merchantData.totalDeposited}</p>
              <p className="text-sm text-gray-600">Total Deposited</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{currentCountry.currency}{merchantData.totalWithdrawn}</p>
              <p className="text-sm text-gray-600">Total Withdrawn</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Add Balance</p>
                  <p className="text-sm text-gray-600">Deposit from bank or mobile financial services</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Transfer from Income</p>
                  <p className="text-sm text-gray-600">Transfer from Income Wallet (12.5% VAT applies)</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Withdraw</p>
                  <p className="text-sm text-gray-600">Withdraw to bank account (profile required)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Complete your profile to enable withdrawals:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Father's name</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Mother's name</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>NID/Passport number</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span>Nominee details</span>
                </li>
              </ul>
              <Button variant="outline" size="sm" className="mt-3">
                <Edit className="w-4 h-4 mr-2" />
                Update Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render Customers Section
  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={async () => {
              // Debug: Check what customers exist on server
              try {
                const response = await fetch('/api/merchant/debug-customers', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                });
                const debugData = await response.json();
                console.log('🔍 Server customers:', debugData);
                toast({ 
                  title: "Debug Info", 
                  description: `Server has ${debugData.customerCount} customers. Check console for details.` 
                });
              } catch (error) {
                console.error('Debug failed:', error);
              }
              
              // Force complete refresh of customer data
              queryClient.removeQueries({ queryKey: ['/api/merchant/scanned-customers'] });
              queryClient.invalidateQueries({ queryKey: ['/api/merchant/scanned-customers'] });
              refetchCustomers();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Debug & Refresh
          </Button>
          <Button onClick={() => setShowQRScanDialog(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            Scan Customer QR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{merchantData.registeredCustomers}</p>
              <p className="text-sm text-gray-600">Total Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Active Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">New This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Points Redeemed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {customers.length > 0 ? `Showing ${customers.length} customer(s)` : 'No customers found'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force refresh customer list
                queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
                queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
                setTimeout(() => {
                  refetchCustomers();
                }, 100);
              }}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear Cache & Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                      <p>Loading customers...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length > 0 ? customers.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.fullName}</TableCell>
                  <TableCell>{customer.accountNumber}</TableCell>
                  <TableCell>{customer.mobileNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">
                      {customer.currentPointsBalance} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.tier === 'gold' ? 'default' : customer.tier === 'silver' ? 'secondary' : 'outline'}>
                      {customer.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowSendPointsDialog(true);
                          // Pre-select this customer in the form
                          setTimeout(() => {
                            const select = document.querySelector('select[name="customerId"]') as HTMLSelectElement;
                            if (select) select.value = customer.id;
                          }, 100);
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send Points
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to remove ${customer.fullName} (${customer.accountNumber}) from your customer list?\n\nThis action cannot be undone.`)) {
                            try {
                              // Show loading state
                              toast({ 
                                title: "Removing Customer", 
                                description: `Removing ${customer.fullName} from your list...` 
                              });
                              
                              // Call delete customer API
                              await deleteCustomerMutation.mutateAsync(customer.id);
                            } catch (error) {
                              console.error('Delete customer error:', error);
                            }
                          }
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        disabled={deleteCustomerMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <QrCode className="w-8 h-8 text-gray-400" />
                      <p>No scanned customers yet</p>
                      <p className="text-sm">Scan customer QR codes to add them to your list</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Leaderboard Section
  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Merchant Leaderboard</h2>
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <Star className="w-4 h-4 mr-1" />
          {merchantData.tier}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((merchant: any) => (
                <TableRow key={merchant.rank}>
                  <TableCell>
                    <Badge variant={merchant.rank <= 3 ? "default" : "secondary"}>
                      #{merchant.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{merchant.name}</TableCell>
                  <TableCell>{merchant.code}</TableCell>
                  <TableCell>{merchant.points.toLocaleString()}</TableCell>
                  <TableCell>{merchant.customers}</TableCell>
                  <TableCell>৳{merchant.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{merchant.tier}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" value={merchantData.merchantName} readOnly />
            </div>
            <div>
              <Label htmlFor="tier">Current Tier</Label>
              <Input id="tier" value={merchantData.tier} readOnly />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="joinedDate">Joined Date</Label>
              <Input id="joinedDate" value={merchantData.joinedDate} readOnly />
            </div>
            <div>
              <Label htmlFor="referralLink">Referral Link</Label>
              <Input id="referralLink" value={merchantData.referralLink} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Point Recharge Section
  const renderPointRecharge = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Point Recharge System</h2>
        <Button onClick={() => setShowRechargeDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Recharge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-900 text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white">Direct Cash Payment</h3>
              <p className="text-sm text-white/70 mt-2">Pay cash directly to the company</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white">Bank/Mobile Transfer</h3>
              <p className="text-sm text-white/70 mt-2">Transfer to company account and request points</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white">Automatic Payment Gateway</h3>
              <p className="text-sm text-white/70 mt-2">Instant recharge via payment gateway</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 text-white">
        <CardHeader>
          <CardTitle className="text-white">Recharge History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white/80">Date</TableHead>
                <TableHead className="text-white/80">Method</TableHead>
                <TableHead className="text-white/80">Amount</TableHead>
                <TableHead className="text-white/80">Points</TableHead>
                <TableHead className="text-white/80">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center text-white/60">
                  No recharge history found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Product Sales Section
  const renderProductSales = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Product Sales with Mandatory Discounts</h2>
        <Button onClick={() => setShowSaleDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Sale
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mandatory Discount Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">Reward Points (Mandatory)</p>
                  <p className="text-sm text-gray-600">Must give reward points for every sale</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">Cash Discount (Optional)</p>
                  <p className="text-sm text-gray-600">Additional cash discount is optional</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Edit className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Manual Distribution</p>
                  <p className="text-sm text-gray-600">Give points as you wish</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Percent className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Automatic Percentage</p>
                  <p className="text-sm text-gray-600">Pre-set percentage of sales amount</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Automatic Fixed</p>
                  <p className="text-sm text-gray-600">Pre-set fixed amount per product</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Points Given</TableHead>
                <TableHead>Cash Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No sales recorded yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render Activity Tracking Section
  const renderActivityTracking = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Merchant Activity Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Points Distributed This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">1000</p>
              <p className="text-sm text-gray-600">Required Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
              <p className="text-sm text-gray-600 mt-2">Current Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              To remain active, merchants must distribute a minimum number of points to customers each month.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Basic Level</h4>
                <p className="text-2xl font-bold text-blue-600">1,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Standard Level</h4>
                <p className="text-2xl font-bold text-green-600">2,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Premium Level</h4>
                <p className="text-2xl font-bold text-purple-600">5,000</p>
                <p className="text-sm text-gray-600">Points per month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // renderRewards function removed - will be rebuilt from scratch

  // CSV Download Function
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({ title: "No Data", description: "No data available to download" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Report Data from Real Dashboard Data
  const generateReportData = (reportType: string, period: string) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(period);
    }

    // Filter data based on selected period
    const filterByPeriod = (items: any[]) => {
      return items.filter((item: any) => {
        const itemDate = new Date(item.createdAt || item.date);
        return itemDate >= startDate && itemDate <= now;
      });
    };

    // Real data from merchant dashboard and transactions
    const filteredPointTransfers = filterByPeriod(pointTransfers || []);
    const filteredPointsReceived = filterByPeriod(pointsReceived || []);

    // Calculate real totals from dashboard data
    const totalPointsDistributed = filteredPointTransfers.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
    const totalPointsReceived = filteredPointsReceived.reduce((sum: number, t: any) => sum + (t.points || 0), 0);
    const currentBalance = merchantData.loyaltyPoints || 0; // Real balance from dashboard

    const realData = {
      pointsReceived: filteredPointsReceived.map((item: any) => ({
        date: new Date(item.createdAt || item.date).toLocaleDateString(),
        time: new Date(item.createdAt || item.date).toLocaleTimeString(),
        source: item.source || 'Local Admin',
        points: item.points || 0,
        description: item.description || 'Points allocation'
      })),
      pointsDistributed: filteredPointTransfers.map((transfer: any) => ({
        date: new Date(transfer.createdAt).toLocaleDateString(),
        time: new Date(transfer.createdAt).toLocaleTimeString(),
        customer: transfer.customerName || 'Unknown Customer',
        accountNumber: transfer.customerAccountNumber || 'N/A',
        points: transfer.points || 0,
        description: transfer.description || 'Point transfer',
        status: transfer.status || 'completed'
      })),
      summary: {
        totalReceived: totalPointsReceived,
        totalDistributed: totalPointsDistributed,
        balance: currentBalance, // Real current balance from dashboard
        transactions: filteredPointTransfers.length + filteredPointsReceived.length
      }
    };

    return realData;
  };

  // Render Create Customer Section
  const renderCreateCustomer = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Create Customer Profile</h2>
        <Button onClick={() => setShowCreateCustomerDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create New Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Customer Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Name Required</p>
                  <p className="text-sm text-gray-600">Customer's full name is mandatory</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Phone Number Required</p>
                  <p className="text-sm text-gray-600">Mobile number for login and communication</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Email Optional</p>
                  <p className="text-sm text-gray-600">Email address is optional but recommended</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Instant account creation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Login with phone number or email</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Automatic loyalty points system</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">QR code generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Transaction history tracking</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );

  // Render Reports Section
  const renderReports = () => {
    const reportData = generateReportData('comprehensive', 'monthly');
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Merchant Reports</h2>
          <Button onClick={() => setShowReportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Generate & Download Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{reportData.summary.totalReceived}</p>
                <p className="text-sm text-gray-600">Points Received</p>
                <p className="text-xs text-gray-500">From Local Admin</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{reportData.summary.totalDistributed}</p>
                <p className="text-sm text-gray-600">Points Distributed</p>
                <p className="text-xs text-gray-500">To Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{reportData.summary.balance}</p>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-xs text-gray-500">Available Points</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{reportData.summary.transactions}</p>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Points Received from Local Admin */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Points Received from Local Admin</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadCSV(reportData.pointsReceived, 'points_received')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.pointsReceived.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {item.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        +{item.points} pts
                      </Badge>
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Points Distributed to Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Points Distributed to Customers</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadCSV(reportData.pointsDistributed, 'points_distributed')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.pointsDistributed.length > 0 ? reportData.pointsDistributed.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.time}</TableCell>
                    <TableCell className="font-medium">{item.customer}</TableCell>
                    <TableCell>{item.accountNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-blue-600">
                        -{item.points} pts
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      No points distributed yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Downloads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => downloadCSV(reportData.pointsReceived, 'points_received_today')}
              >
                <Download className="w-4 h-4 mr-2" />
                Today's Received Points
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => downloadCSV(reportData.pointsDistributed, 'points_distributed_today')}
              >
                <Download className="w-4 h-4 mr-2" />
                Today's Distributed Points
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => downloadCSV([reportData.summary], 'monthly_summary')}
              >
                <Download className="w-4 h-4 mr-2" />
                Monthly Summary
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Periods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowReportDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today's Report
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowReportDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Weekly Report
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowReportDialog(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Monthly Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Distribution Rate</span>
                  <span className="font-semibold">
                    {reportData.summary.totalReceived > 0 
                      ? Math.round((reportData.summary.totalDistributed / reportData.summary.totalReceived) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Points per Customer</span>
                  <span className="font-semibold">
                    {reportData.pointsDistributed.length > 0 
                      ? Math.round(reportData.summary.totalDistributed / reportData.pointsDistributed.length)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Customers</span>
                  <span className="font-semibold">{reportData.pointsDistributed.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render Cashback & Rewards Section
  const renderCashback = () => {
    const downloadRewardsHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/merchant/rewards/export', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `merchant-rewards-history-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast({ title: "Success", description: "Rewards history downloaded successfully!" });
        } else {
          throw new Error('Failed to download');
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to download rewards history", variant: "destructive" });
      }
    };

    const getRewardTypeColor = (type: string) => {
      switch (type) {
        case 'cashback_15_percent':
          return 'bg-green-100 text-green-800';
        case 'referral_2_percent':
          return 'bg-blue-100 text-blue-800';
        case 'royalty_1_percent':
          return 'bg-purple-100 text-purple-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getRewardTypeName = (type: string) => {
      switch (type) {
        case 'cashback_15_percent':
          return 'Instant Cashback';
        case 'referral_2_percent':
          return 'Referral Commission';
        case 'royalty_1_percent':
          return 'Monthly Royalty';
        default:
          return 'Other Reward';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Cashback & Rewards</h2>
          <Button onClick={downloadRewardsHistory} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Cashback Rewards Section */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <DollarSign className="w-6 h-6 mr-2" />
              Cashback Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cashback Summary Cards */}
            <div className={`grid grid-cols-1 gap-4 ${cashbackData?.affiliateCashback > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Cashback</p>
                      <p className="text-2xl font-bold text-green-600">
                        {cashbackData?.totalCashback || 0} pts
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Cashback</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {cashbackData?.todayCashback || 0} pts
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {cashbackData?.thisMonthCashback || 0} pts
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {cashbackData?.totalTransfers || 0}
                      </p>
                    </div>
                    <Send className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Affiliate Cashback Card - Only show if balance > 0 */}
              {cashbackData?.affiliateCashback > 0 && (
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Affiliate Cashback</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {cashbackData?.affiliateCashback || 0} pts
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                          2% commission from referrals
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Cashback Info */}
            <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Percent className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How Instant Cashback Works
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Transfer points to any customer and earn 10% instant cashback</li>
                    <li>• Minimum 1 point transfer required</li>
                    <li>• Cashback is credited immediately to your income wallet</li>
                    <li>• Use cashback points for business operations or withdraw as cash</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instant Cashback History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Instant Cashback History (10% on Point Transfers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading cashback history...</p>
              </div>
            ) : rewardsHistory?.rewards?.filter((r: any) => r.type === 'cashback_15_percent')?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Points Transferred</TableHead>
                      <TableHead>Cashback Earned</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewardsHistory.rewards
                      .filter((reward: any) => reward.type === 'cashback_15_percent')
                      .map((reward: any) => (
                        <TableRow key={reward.id}>
                          <TableCell>
                            {new Date(reward.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {reward.sourceAmount} pts
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            +{reward.amount} pts
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">10%</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {reward.description}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Cashback Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start transferring points to customers to earn 10% instant cashback!
                </p>
                <Button onClick={() => setShowSendPointsDialog(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Transfer Points Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comprehensive Rewards History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                All Merchant Rewards History
              </div>
              <div className="text-sm text-gray-500">
                Showing {rewardsHistory?.pagination?.totalRecords || 0} total rewards
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading rewards history...</p>
              </div>
            ) : rewardsHistory?.rewards?.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Reward Type</TableHead>
                        <TableHead>Amount Earned</TableHead>
                        <TableHead>Source Amount</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewardsHistory.rewards.map((reward: any) => (
                        <TableRow key={reward.id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(reward.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-gray-500">
                                {new Date(reward.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRewardTypeColor(reward.type)}>
                              {getRewardTypeName(reward.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            +{reward.amount} pts
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {reward.sourceAmount ? `${reward.sourceAmount} pts` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs">
                            {reward.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {rewardsHistory.pagination && rewardsHistory.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      Page {rewardsHistory.pagination.currentPage} of {rewardsHistory.pagination.totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!rewardsHistory.pagination.hasPrev}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!rewardsHistory.pagination.hasNext}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rewards Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start transferring points to customers to earn instant cashback and other rewards!
                </p>
                <Button onClick={() => setShowSendPointsDialog(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Transfer Points Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Referral Program Section
  const renderReferralProgram = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Merchant Referral Program</h2>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          2% Commission
        </Badge>
      </div>
      
      <MerchantReferralProgram currentUser={user} />
    </div>
  );

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading merchant dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!user || user.role !== 'merchant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Access Denied</p>
          <p className="text-gray-600">Please log in as a merchant to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider 
      currentUser={user ? {
        id: user.id,
        token: localStorage.getItem('token') || '',
        role: user.role
      } : undefined}
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
        {/* Merchant Portal Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md border border-gray-200">
                  <img 
                    src="/images/holyloy-logo.png" 
                    alt="HOLYLOY Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Merchant Portal</h1>
                  <p className="text-sm text-gray-500">
                    {merchantProfile?.merchant?.businessName || "Business Dashboard"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Account Type:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    merchantProfile?.merchant?.accountType === 'e_merchant' 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                    {merchantProfile?.merchant?.accountType === 'e_merchant' ? 'E-Merchant' : 'Merchant'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Tier:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    {merchantProfile?.merchant?.tier || 'Bronze'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <nav className="p-4 space-y-2">
              <Button
                variant={activeSection === "dashboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              <Button
                variant={activeSection === "loyalty-points" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("loyalty-points")}
              >
                <Infinity className="w-4 h-4 mr-2" />
                Reward Points
              </Button>
              
              <Button
                variant={activeSection === "income-wallet" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("income-wallet")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Income Wallet
              </Button>
              
              <Button
                variant={activeSection === "customers" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("customers")}
              >
                <Users className="w-4 h-4 mr-2" />
                Customers
              </Button>
              
              <Button
                variant={activeSection === "create-customer" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("create-customer")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Customer
              </Button>
              
              <Button
                variant={activeSection === "wallets" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("wallets")}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Wallets
              </Button>


              
              <Button
                variant={activeSection === "referral-program" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("referral-program")}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Referral Program
              </Button>
              
              <Button
                variant={activeSection === "marketing" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("marketing")}
              >
                <Target className="w-4 h-4 mr-2" />
                Marketing Tools
              </Button>
              
              <Button
                variant={activeSection === "leaderboard" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("leaderboard")}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
              
              <Button
                variant={activeSection === "profile" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("profile")}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              
              <Button
                variant={activeSection === "point-recharge" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("point-recharge")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Point Recharge
              </Button>
              
              <Button
                variant={activeSection === "product-sales" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("product-sales")}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Product Sales
              </Button>
              
              <Button
                variant={activeSection === "activity-tracking" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("activity-tracking")}
              >
                <Activity className="w-4 h-4 mr-2" />
                Activity Tracking
              </Button>
              
              <Button
                variant={activeSection === "reports" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection("reports")}
              >
                <BarChart className="w-4 h-4 mr-2" />
                Reports
              </Button>
              
              <Button
                variant={activeSection === "cashback" ? "default" : "ghost"}
                className="w-full justify-start relative"
                onClick={() => {
                  setActiveSection("cashback");
                  setShowCashbackNotification(false);
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Cashback & Rewards
                {showCashbackNotification && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </Button>
              
              <NotificationWrapper badgeProps={{ type: 'messages' }}>
                <Button
                  variant={activeSection === "chat" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("chat")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Secure Chat
                </Button>
              </NotificationWrapper>
            </nav>

            {/* Star Merchant Widget */}
            <div className="p-4 mt-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Star Merchant</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">Current Rank</p>
                <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-yellow-600">75% to next rank</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Mobile Menu Button */}
          <div className="lg:hidden fixed top-4 left-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-white shadow-md"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'loyalty-points' && renderLoyaltyPoints()}
            {activeSection === 'income-wallet' && renderIncomeWallet()}
            {activeSection === 'customers' && renderCustomers()}
            {activeSection === 'create-customer' && renderCreateCustomer()}
            {activeSection === 'leaderboard' && renderLeaderboard()}
            {activeSection === 'profile' && renderProfile()}
            {activeSection === 'wallets' && renderCommerceWallet()}
            {activeSection === 'point-recharge' && renderPointRecharge()}
            {activeSection === 'product-sales' && renderProductSales()}
            {activeSection === 'activity-tracking' && renderActivityTracking()}

            {activeSection === 'reports' && renderReports()}
            {activeSection === 'cashback' && renderCashback()}
            {activeSection === 'chat' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Secure Chat</h2>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Merchant Chat
                  </Badge>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Merchant Secure Chat
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Communicate with local administrators and customers securely
                    </p>
                  </CardHeader>
                  <CardContent>
                    {user && (
                      <SecureChat 
                        currentUser={{
                          id: user.id,
                          name: `${user.firstName} ${user.lastName}`,
                          role: user.role,
                          token: localStorage.getItem('token') || ''
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {activeSection === 'referral-program' && renderReferralProgram()}
            {activeSection === 'marketing' && (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Marketing Tools</h3>
                <p className="text-gray-500">Marketing features coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Points Dialog */}
      <Dialog open={showSendPointsDialog} onOpenChange={(open) => {
        setShowSendPointsDialog(open);
        if (open) {
          // Force refresh customer list when dialog opens
          queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
          queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
          setTimeout(() => {
            refetchCustomers();
          }, 100);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Send Loyalty Points to Customer</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Force refresh customer list
                  queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
                  queryClient.removeQueries(['/api/merchant/scanned-customers']); // Remove all cached data
                  setTimeout(() => {
                    refetchCustomers();
                  }, 100);
                }}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear Cache & Refresh
              </Button>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const customerId = formData.get('customerId') as string;
            const points = parseInt(formData.get('points') as string);
            const description = formData.get('description') as string;
            
            // Validate customer selection
            if (!customerId || customerId.trim() === '') {
              toast({ 
                title: "Error", 
                description: "Please select a customer from the dropdown.", 
                variant: "destructive" 
              });
              return;
            }
            
            // Validate that customer exists in scanned customers
            const selectedCustomer = customers.find((c: any) => c.id === customerId);
            if (!selectedCustomer) {
              toast({ 
                title: "Error", 
                description: "Selected customer not found. Please refresh and try again.", 
                variant: "destructive" 
              });
              return;
            }
            
            sendPointsMutation.mutate({
              customerId,
              points,
              description
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" required key={customers.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length > 0 ? (
                    customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.fullName} - {customer.accountNumber} ({customer.currentPointsBalance} points)
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      No scanned customers found. Please scan a customer QR code first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Use "Scan Customer QR" to add customers to your list
                </p>
              )}
              {customers.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-600 font-medium">
                    ✅ {customers.length} customer(s) available for point transfer
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input name="points" type="number" required min="1" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" required />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowSendPointsDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendPointsMutation.isPending}>
                {sendPointsMutation.isPending ? 'Sending...' : 'Send Loyalty Points'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={showCreateCustomerDialog} onOpenChange={setShowCreateCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const fullName = formData.get('fullName') as string;
            const mobileNumber = formData.get('mobileNumber') as string;
            const email = formData.get('email') as string;
            
            if (!fullName.trim()) {
              toast({ 
                title: "Error", 
                description: "Customer name is required",
                variant: "destructive"
              });
              return;
            }
            
            if (!mobileNumber.trim()) {
              toast({ 
                title: "Error", 
                description: "Mobile number is required",
                variant: "destructive"
              });
              return;
            }
            
            // Validate phone number format (more flexible)
            const phoneRegex = /^(\+88)?01[3-9]\d{8}$/;
            const cleanedNumber = mobileNumber.replace(/\s/g, '');
            if (!phoneRegex.test(cleanedNumber)) {
              toast({ 
                title: "Invalid Phone Number", 
                description: "Please enter a valid Bangladeshi mobile number (e.g., 01712345678 or +8801712345678)",
                variant: "destructive"
              });
              return;
            }

            // Validate email format if provided
            if (email && email.trim()) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email.trim())) {
                toast({ 
                  title: "Invalid Email", 
                  description: "Please enter a valid email address",
                  variant: "destructive"
                });
                return;
              }
            }
            
            createCustomerMutation.mutate({
              fullName: fullName.trim(),
              mobileNumber: mobileNumber.trim(),
              email: email.trim() || undefined
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input 
                name="fullName" 
                required 
                placeholder="Enter customer's full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <Input 
                name="mobileNumber" 
                required 
                placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Customer can use this number to login
              </p>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input 
                name="email" 
                type="email"
                placeholder="customer@example.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, customer can also login with email
              </p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The customer will be able to login to the customer portal using either their phone number or email address (if provided). If you previously deleted a customer, you can re-add them by entering the same phone number.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateCustomerDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Scan Dialog */}
      <Dialog open={showQRScanDialog} onOpenChange={setShowQRScanDialog}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">Scan Customer QR Code</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 rounded-lg p-6 mt-4">
            <QRScanComponent 
              onCustomerScanned={(customer) => {
                toast({
                  title: "Customer Added!",
                  description: `${customer.fullName} has been added to your customer list.`,
                });
                // Force refresh customer list immediately with aggressive cache clearing
                queryClient.invalidateQueries(['/api/merchant/scanned-customers']);
                queryClient.removeQueries(['/api/merchant/scanned-customers']);
                setTimeout(() => {
                  refetchCustomers();
                }, 100);
                setShowQRScanDialog(false);
              }}
              onError={(error) => {
                toast({
                  title: "Scan Failed",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Points Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Points</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            purchasePointsMutation.mutate({
              amount: parseInt(formData.get('amount') as string),
              paymentMethod: formData.get('paymentMethod') as string
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ({currentCountry.currency})</Label>
              <Input name="amount" type="number" required min="100" />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="mobile">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowPurchaseDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={purchasePointsMutation.isPending}>
                {purchasePointsMutation.isPending ? 'Processing...' : 'Purchase'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            withdrawMutation.mutate({
              amount: parseInt(formData.get('amount') as string),
              bankAccount: formData.get('bankAccount') as string
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input name="amount" type="number" required min="100" max={merchantData.balance} />
            </div>
            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input name="bankAccount" required placeholder="Enter bank account details" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Income to Commerce Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Commerce Wallet</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const amount = parseFloat(formData.get('amount') as string);
            const vatAmount = amount * 0.125; // 12.5% VAT and service charge
            const transferAmount = amount - vatAmount;
            
            // Here you would call the API to transfer funds
            toast({ 
              title: "Transfer Successful", 
              description: `৳${transferAmount} transferred (after 12.5% VAT & service charge)` 
            });
            setShowTransferDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to Transfer (৳)</Label>
              <Input name="amount" type="number" required min="1" max={merchantData.incomeBalance} />
              <p className="text-sm text-gray-500 mt-1">
                Available: ৳{merchantData.incomeBalance}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> A 12.5% VAT and service charge will be deducted from the transfer amount.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Transfer to Commerce Wallet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Point Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Point Recharge</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const amount = parseFloat(formData.get('amount') as string);
            const method = formData.get('method') as string;
            const reference = formData.get('reference') as string;
            
            // Here you would call the API to create recharge request
            toast({ 
              title: "Recharge Request Created", 
              description: `৳${amount} recharge request submitted via ${method}` 
            });
            setShowRechargeDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="method">Recharge Method</Label>
              <Select name="method" required>
                <option value="direct_cash">Direct Cash Payment</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_transfer">Mobile Transfer</option>
                <option value="automatic_payment_gateway">Automatic Payment Gateway</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input name="amount" type="number" required min="100" />
              <p className="text-sm text-gray-500 mt-1">
                1 Taka = 1 Point
              </p>
            </div>
            <div>
              <Label htmlFor="reference">Payment Reference</Label>
              <Input name="reference" placeholder="Transaction ID, Reference Number, etc." />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowRechargeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Product Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const customerId = formData.get('customerId') as string;
            const productId = formData.get('productId') as string;
            const quantity = parseInt(formData.get('quantity') as string);
            const unitPrice = parseFloat(formData.get('unitPrice') as string);
            const distributionMethod = formData.get('distributionMethod') as string;
            const distributionValue = parseFloat(formData.get('distributionValue') as string);
            const cashDiscount = parseFloat(formData.get('cashDiscount') as string) || 0;
            
            const totalAmount = quantity * unitPrice;
            const pointsGiven = distributionMethod === 'manual' ? distributionValue : 
                              distributionMethod === 'automatic_percentage' ? Math.floor(totalAmount * distributionValue / 100) :
                              distributionValue;
            
            // Here you would call the API to record the sale
            toast({ 
              title: "Sale Recorded", 
              description: `Sale recorded: ${quantity} items, ${pointsGiven} points given` 
            });
            setShowSaleDialog(false);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerId">Customer ID</Label>
                <Input name="customerId" required />
              </div>
              <div>
                <Label htmlFor="productId">Product ID</Label>
                <Input name="productId" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input name="quantity" type="number" required min="1" />
              </div>
              <div>
                <Label htmlFor="unitPrice">Unit Price (৳)</Label>
                <Input name="unitPrice" type="number" required min="0" step="0.01" />
              </div>
            </div>
            <div>
              <Label htmlFor="distributionMethod">Point Distribution Method</Label>
              <Select name="distributionMethod" required>
                <option value="manual">Manual</option>
                <option value="automatic_percentage">Automatic Percentage</option>
                <option value="automatic_fixed">Automatic Fixed Amount</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="distributionValue">Distribution Value</Label>
              <Input name="distributionValue" type="number" required min="0" />
              <p className="text-sm text-gray-500 mt-1">
                For percentage: enter percentage (e.g., 5 for 5%). For fixed: enter point amount.
              </p>
            </div>
            <div>
              <Label htmlFor="cashDiscount">Cash Discount (৳) - Optional</Label>
              <Input name="cashDiscount" type="number" min="0" step="0.01" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowSaleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Record Sale
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate & Download Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const reportType = formData.get('reportType') as string;
            const period = formData.get('period') as string;
            const customDate = formData.get('customDate') as string;
            
            let selectedPeriod = period;
            if (period === 'custom' && customDate) {
              selectedPeriod = customDate;
            }
            
            // Generate report data
            const reportData = generateReportData(reportType, selectedPeriod);
            
            // Download based on report type
            switch (reportType) {
              case 'points_received':
                downloadCSV(reportData.pointsReceived, `points_received_${selectedPeriod}`);
                break;
              case 'points_distributed':
                downloadCSV(reportData.pointsDistributed, `points_distributed_${selectedPeriod}`);
                break;
              case 'comprehensive':
                // Download all data as separate sheets (combined CSV)
                const combinedData = [
                  ...reportData.pointsReceived.map((item: any) => ({ ...item, type: 'Received' })),
                  ...reportData.pointsDistributed.map((item: any) => ({ ...item, type: 'Distributed' }))
                ];
                downloadCSV(combinedData, `comprehensive_report_${selectedPeriod}`);
                break;
              case 'summary':
                downloadCSV([reportData.summary], `summary_report_${selectedPeriod}`);
                break;
            }
            
            toast({ 
              title: "Report Downloaded", 
              description: `${reportType.replace('_', ' ')} report downloaded successfully!` 
            });
            setShowReportDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select name="reportType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                  <SelectItem value="points_received">Points Received from Admin</SelectItem>
                  <SelectItem value="points_distributed">Points Distributed to Customers</SelectItem>
                  <SelectItem value="summary">Summary Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="period">Period</Label>
              <Select name="period" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="customDate">Custom Date (if selected)</Label>
              <Input name="customDate" type="date" />
              <p className="text-xs text-gray-500 mt-1">Only used if "Custom Date" is selected above</p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Report will include:</strong>
              </p>
              <ul className="text-xs text-blue-600 mt-1 space-y-1">
                <li>• Points received from local admin with date/time</li>
                <li>• Points distributed to customers with details</li>
                <li>• Customer account numbers and transaction status</li>
                <li>• Complete transaction history with descriptions</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Download className="w-4 h-4 mr-2" />
                Generate & Download CSV
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </NotificationProvider>
  );
}