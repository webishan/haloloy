import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, User, CreditCard, Send, Copy, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CustomerInfo {
  id: string;
  fullName: string;
  accountNumber: string;
  mobileNumber: string;
  currentPointsBalance: number;
  tier: string;
}

interface MerchantUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function MerchantQRScan() {
  const { toast } = useToast();
  const [scannedQR, setScannedQR] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [pointsToTransfer, setPointsToTransfer] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState<MerchantUser | null>(null);

  // Check if there's a QR code in the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrCode = urlParams.get('qr');
    if (qrCode) {
      setScannedQR(qrCode);
      handleScanQR(qrCode);
    }
  }, []);

  // Get current merchant user
  useEffect(() => {
    const user = localStorage.getItem('merchantUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  // Scan QR code mutation
  const scanQRMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      return await apiRequest('/api/merchant/scan-customer', {
        method: 'POST',
        body: JSON.stringify({ qrCode }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      setCustomerInfo(data.customer);
      toast({
        title: "Customer Found",
        description: `Found customer: ${data.customer.fullName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "QR Scan Failed",
        description: error.message || "Invalid QR code",
        variant: "destructive",
      });
      setCustomerInfo(null);
    }
  });

  // Transfer points mutation
  const transferPointsMutation = useMutation({
    mutationFn: async (data: { qrCode: string; points: number; description: string }) => {
      return await apiRequest('/api/merchant/transfer-points-qr', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Points Transferred",
        description: `Successfully transferred ${pointsToTransfer} points to ${data.customer.fullName}`,
      });
      setPointsToTransfer('');
      setCustomerInfo(null);
      setScannedQR('');
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer points",
        variant: "destructive",
      });
    }
  });

  const handleScanQR = (qrCode: string) => {
    if (!qrCode.trim()) {
      toast({
        title: "Invalid QR Code",
        description: "Please enter a valid QR code",
        variant: "destructive",
      });
      return;
    }

    scanQRMutation.mutate(qrCode);
  };

  const handleTransferPoints = () => {
    if (!customerInfo || !pointsToTransfer) {
      toast({
        title: "Invalid Input",
        description: "Please enter points to transfer",
        variant: "destructive",
      });
      return;
    }

    const points = parseInt(pointsToTransfer);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid number of points",
        variant: "destructive",
      });
      return;
    }

    transferPointsMutation.mutate({
      qrCode: scannedQR,
      points,
      description: `Point transfer from merchant ${currentUser?.firstName} ${currentUser?.lastName}`
    });
  };

  const copyCustomerInfo = () => {
    if (customerInfo) {
      const info = `Customer: ${customerInfo.fullName}\nAccount: ${customerInfo.accountNumber}\nMobile: ${customerInfo.mobileNumber}\nPoints: ${customerInfo.currentPointsBalance}`;
      navigator.clipboard.writeText(info);
      toast({
        title: "Customer Info Copied",
        description: "Customer information copied to clipboard",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              Please log in as a merchant to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/merchant/login'}>
              Go to Merchant Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer QR Scanner</h1>
          <p className="text-gray-600">Scan customer QR codes or use shareable links to transfer points instantly</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan Customer QR Code
              </CardTitle>
              <CardDescription>
                Enter QR code data or scan customer's QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Data
                </label>
                <Input
                  value={scannedQR}
                  onChange={(e) => setScannedQR(e.target.value)}
                  placeholder="Paste QR code data here or scan..."
                  className="font-mono text-sm"
                />
              </div>
              
              <Button 
                onClick={() => handleScanQR(scannedQR)}
                disabled={scanQRMutation.isPending}
                className="w-full"
              >
                {scanQRMutation.isPending ? "Scanning..." : "Scan QR Code"}
              </Button>

              <div className="text-center text-sm text-gray-500">
                <p>Or customers can share their QR code link with you</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info & Transfer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
              <CardDescription>
                {customerInfo ? "Customer found! Transfer points below." : "Scan a QR code to see customer information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerInfo ? (
                <>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-green-900">{customerInfo.fullName}</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {customerInfo.tier.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-green-800">
                      <p><strong>Account:</strong> {customerInfo.accountNumber}</p>
                      <p><strong>Mobile:</strong> {customerInfo.mobileNumber}</p>
                      <p><strong>Current Points:</strong> {customerInfo.currentPointsBalance.toLocaleString()}</p>
                    </div>
                    <Button
                      onClick={copyCustomerInfo}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Info
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Points to Transfer
                      </label>
                      <Input
                        type="number"
                        value={pointsToTransfer}
                        onChange={(e) => setPointsToTransfer(e.target.value)}
                        placeholder="Enter points to transfer..."
                        min="1"
                      />
                    </div>

                    <Button 
                      onClick={handleTransferPoints}
                      disabled={transferPointsMutation.isPending || !pointsToTransfer}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {transferPointsMutation.isPending ? "Transferring..." : "Transfer Points"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No customer information available</p>
                  <p className="text-sm">Scan a QR code to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <QrCode className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold mb-1">1. Scan QR Code</h3>
                <p className="text-sm text-gray-600">Customer shows their QR code or shares the link</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-1">2. Customer Found</h3>
                <p className="text-sm text-gray-600">Customer profile is automatically created in your system</p>
              </div>
              <div className="text-center">
                <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="font-semibold mb-1">3. Transfer Points</h3>
                <p className="text-sm text-gray-600">Enter points and transfer instantly to customer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
