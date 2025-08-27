import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, 
  Scan, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Coins,
  User,
  Gift
} from "lucide-react";

interface QRTransferProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export default function QRTransferComponent({ currentUser }: QRTransferProps) {
  const [generateForm, setGenerateForm] = useState({
    points: '',
    expirationMinutes: '30'
  });
  
  const [scanForm, setScanForm] = useState({
    qrCode: ''
  });
  
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['/api/loyalty/wallets', currentUser.id]
  });

  // Get recent QR transfers
  const { data: recentTransfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ['/api/loyalty/qr-transfers', currentUser.id]
  });

  // Generate QR code mutation
  const generateQRMutation = useMutation({
    mutationFn: async (data: { senderId: string; points: number; expirationMinutes: number }) => {
      return await apiRequest('/api/loyalty/generate-qr', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (result) => {
      setGeneratedQR(result.qrCode);
      toast({
        title: "QR Code Generated",
        description: `QR code created for ${generateForm.points} points`,
      });
      setGenerateForm({ points: '', expirationMinutes: '30' });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/qr-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/wallets'] });
    },
    onError: (error: any) => {
      toast({
        title: "QR Generation Failed",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      });
    }
  });

  // Process QR code mutation
  const processQRMutation = useMutation({
    mutationFn: async (data: { qrCode: string; receiverId: string }) => {
      return await apiRequest('/api/loyalty/process-qr', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (result) => {
      toast({
        title: "QR Code Processed",
        description: `Successfully received ${result.points} points`,
      });
      setScanForm({ qrCode: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/qr-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/wallets'] });
    },
    onError: (error: any) => {
      toast({
        title: "QR Processing Failed",
        description: error.message || "Failed to process QR code",
        variant: "destructive",
      });
    }
  });

  const handleGenerateQR = () => {
    const points = parseInt(generateForm.points);
    const expirationMinutes = parseInt(generateForm.expirationMinutes);

    if (!points || points <= 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid number of points",
        variant: "destructive",
      });
      return;
    }

    if (!walletData?.wallets?.reward_points || walletData.wallets.reward_points < points) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough points in your reward wallet",
        variant: "destructive",
      });
      return;
    }

    generateQRMutation.mutate({
      senderId: currentUser.id,
      points: points,
      expirationMinutes: expirationMinutes
    });
  };

  const handleProcessQR = () => {
    if (!scanForm.qrCode.trim()) {
      toast({
        title: "QR Code Required",
        description: "Please enter a QR code",
        variant: "destructive",
      });
      return;
    }

    processQRMutation.mutate({
      qrCode: scanForm.qrCode.trim(),
      receiverId: currentUser.id
    });
  };

  const copyQRCode = () => {
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR);
      toast({
        title: "Copied",
        description: "QR code copied to clipboard",
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="qr-transfer-component">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QR Point Transfer</h2>
          <p className="text-gray-600">Send and receive points using QR codes</p>
        </div>
        <Badge className="bg-purple-100 text-purple-800">
          <QrCode className="h-3 w-3 mr-1" />
          QR Transfer System
        </Badge>
      </div>

      {/* Wallet Balance */}
      {!walletLoading && walletData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Points</p>
                <p className="text-2xl font-bold text-blue-600">
                  {walletData.wallets.reward_points.toLocaleString()} Points
                </p>
              </div>
              <Coins className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Transfer Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Send className="w-4 h-4 mr-2" />
            Send Points
          </TabsTrigger>
          <TabsTrigger value="scan" data-testid="tab-scan">
            <Scan className="w-4 h-4 mr-2" />
            Receive Points
          </TabsTrigger>
        </TabsList>

        {/* Generate QR Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card data-testid="generate-qr-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                Generate QR Code
              </CardTitle>
              <CardDescription>
                Create a QR code to send points to another user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points-amount">Points Amount</Label>
                  <Input
                    id="points-amount"
                    type="number"
                    placeholder="Enter points to send"
                    value={generateForm.points}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, points: e.target.value }))}
                    min="1"
                    data-testid="input-points-amount"
                  />
                </div>
                
                <div>
                  <Label htmlFor="expiration">Expiration (minutes)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    placeholder="30"
                    value={generateForm.expirationMinutes}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, expirationMinutes: e.target.value }))}
                    min="1"
                    max="1440"
                    data-testid="input-expiration"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateQR}
                disabled={generateQRMutation.isPending || !generateForm.points}
                className="w-full"
                data-testid="button-generate-qr"
              >
                {generateQRMutation.isPending ? (
                  "Generating QR Code..."
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>

              {generatedQR && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">QR Code Generated Successfully!</p>
                      <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
                        {generatedQR}
                      </div>
                      <Button onClick={copyQRCode} variant="outline" size="sm">
                        Copy QR Code
                      </Button>
                      <p className="text-xs text-gray-600">
                        Share this code with the recipient. It will expire in {generateForm.expirationMinutes || '30'} minutes.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scan QR Tab */}
        <TabsContent value="scan" className="space-y-4">
          <Card data-testid="scan-qr-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Enter a QR code to receive points from another user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="qr-code">QR Code</Label>
                <Input
                  id="qr-code"
                  placeholder="Paste or enter QR code here"
                  value={scanForm.qrCode}
                  onChange={(e) => setScanForm(prev => ({ ...prev, qrCode: e.target.value }))}
                  data-testid="input-qr-code"
                />
              </div>

              <Button
                onClick={handleProcessQR}
                disabled={processQRMutation.isPending || !scanForm.qrCode.trim()}
                className="w-full"
                data-testid="button-process-qr"
              >
                {processQRMutation.isPending ? (
                  "Processing QR Code..."
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Points
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Transfers */}
      <Card data-testid="recent-transfers">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent QR Transfers
          </CardTitle>
          <CardDescription>
            Your recent QR code transfer history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="text-center py-4">Loading transfers...</div>
          ) : recentTransfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No QR transfers found
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransfers.slice(0, 10).map((transfer: any) => (
                <div key={transfer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={transfer.isUsed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {transfer.isUsed ? 'Completed' : 'Pending'}
                        </Badge>
                        <span className="font-medium">{transfer.points} points</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {transfer.transferType === 'sent' ? 'Sent to recipient' : 'Received from sender'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(transfer.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {transfer.isUsed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}