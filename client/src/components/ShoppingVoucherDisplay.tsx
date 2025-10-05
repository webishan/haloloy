import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Gift, Store, DollarSign, Bell, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ShoppingVoucher {
  id: string;
  merchantId: string;
  merchantName: string;
  voucherPoints: number;
  originalPoints: number;
  ratio: number;
  createdAt: string;
  status: 'active' | 'used' | 'expired';
}

interface ShoppingVoucherData {
  vouchers: ShoppingVoucher[];
  totalBalance: number;
  totalEarned: number;
  totalUsed: number;
  notifications: number;
}

export default function ShoppingVoucherDisplay({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [isCashOutDialogOpen, setIsCashOutDialogOpen] = useState(false);

  const { data: voucherData, isLoading } = useQuery({
    queryKey: ['/api/customer/shopping-vouchers', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 5000,
    select: (data: ShoppingVoucherData) => data || {
      vouchers: [],
      totalBalance: 0,
      totalEarned: 0,
      totalUsed: 0,
      notifications: 0
    }
  });

  const cashOutMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest('/api/customer/shopping-voucher-cashout', {
        method: 'POST',
        body: JSON.stringify({ amount }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Cash-Out Request Submitted",
        description: "Your shopping voucher cash-out request has been submitted",
      });
      setCashOutAmount('');
      setIsCashOutDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/customer/shopping-vouchers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit cash-out request",
        variant: "destructive",
      });
    }
  });

  const handleCashOut = () => {
    const amount = parseFloat(cashOutAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    cashOutMutation.mutate(amount);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <ShoppingBag className="w-5 h-5 mr-2 text-green-600" />
            Shopping Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-green-200 rounded w-3/4"></div>
            <div className="h-8 bg-green-200 rounded w-1/2"></div>
            <div className="h-4 bg-green-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { vouchers = [], totalBalance = 0, totalEarned = 0, totalUsed = 0, notifications = 0 } = voucherData || {};

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-green-800">
          <div className="flex items-center">
            <ShoppingBag className="w-5 h-5 mr-2 text-green-600" />
            Shopping Vouchers
            {notifications > 0 && (
              <Badge variant="destructive" className="ml-2">
                <Bell className="w-3 h-3 mr-1" />
                {notifications}
              </Badge>
            )}
          </div>
          <Dialog open={isCashOutDialogOpen} onOpenChange={setIsCashOutDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="bg-green-100 text-green-700 border-green-300">
                <DollarSign className="w-4 h-4 mr-1" />
                Cash Out
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cash Out Shopping Vouchers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (Points)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                    placeholder="Enter amount to cash out"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Available Balance: {(totalBalance || 0).toLocaleString()} points
                </div>
                <Button 
                  onClick={handleCashOut} 
                  disabled={cashOutMutation.isPending}
                  className="w-full"
                >
                  {cashOutMutation.isPending ? "Processing..." : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-600">{(totalBalance || 0).toLocaleString()}</div>
            <div className="text-sm text-green-700">Current Balance</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-blue-600">{(totalEarned || 0).toLocaleString()}</div>
            <div className="text-sm text-blue-700">Total Earned</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-orange-600">{(totalUsed || 0).toLocaleString()}</div>
            <div className="text-sm text-orange-700">Total Used</div>
          </div>
        </div>

        {/* Merchant Vouchers */}
        {vouchers && vouchers.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-green-800">Your Merchant Vouchers</h4>
            <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Voucher Points</TableHead>
                    <TableHead>Original Points</TableHead>
                    <TableHead>Ratio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Store className="w-4 h-4 mr-2 text-green-600" />
                          {voucher.merchantName}
                        </div>
                      </TableCell>
                      <TableCell>{voucher.voucherPoints.toLocaleString()}</TableCell>
                      <TableCell>{voucher.originalPoints.toLocaleString()}</TableCell>
                      <TableCell>{(voucher.ratio * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge 
                          variant={voucher.status === 'active' ? 'default' : 'secondary'}
                          className={voucher.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {voucher.status === 'active' ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            voucher.status
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(voucher.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
          <h4 className="font-semibold text-green-800 mb-2">How Shopping Vouchers Work</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• When you reach 30,000 points, 6,000 points become shopping vouchers</div>
            <div>• Vouchers are distributed proportionally among merchants you've shopped with</div>
            <div>• You can use vouchers at those specific merchants</div>
            <div>• You can also cash out your voucher balance directly</div>
            <div>• Each voucher point = 1 Taka value</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
