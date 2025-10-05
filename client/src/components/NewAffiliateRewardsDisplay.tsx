import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, DollarSign, TrendingUp, Copy, Share2, Gift, Wallet } from 'lucide-react';

interface ReferredCustomer {
  id: string;
  name: string;
  email: string;
  totalPointsEarned: number;
  commissionEarned: number;
  lastActivity: string;
  isActive: boolean;
}

interface AffiliateRewardsData {
  totalCommissionEarned: number;
  totalReferrals: number;
  activeReferrals: number;
  lifetimeCommission: number;
  monthlyCommission: number;
  referredCustomers: ReferredCustomer[];
  referralLink: string;
}

interface WalletData {
  incomeBalance: string;
  totalIncomeEarned: string;
  rewardPointBalance: number;
  totalRewardPointsEarned: number;
}

export default function NewAffiliateRewardsDisplay({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();

  // Fetch affiliate rewards data
  const { data: affiliateData, isLoading: affiliateLoading, refetch: refetchAffiliate } = useQuery({
    queryKey: ['/api/customer/affiliate-rewards', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 10000, // Refresh every 10 seconds
    select: (data: AffiliateRewardsData) => data || {
      totalCommissionEarned: 0,
      totalReferrals: 0,
      activeReferrals: 0,
      lifetimeCommission: 0,
      monthlyCommission: 0,
      referredCustomers: [],
      referralLink: ''
    }
  });

  // Fetch wallet data to show income balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['/api/customer/wallet', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 10000, // Refresh every 10 seconds
    select: (data: WalletData) => data || {
      incomeBalance: "0.00",
      totalIncomeEarned: "0.00",
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0
    }
  });

  const copyReferralLink = async () => {
    if (affiliateData?.referralLink) {
      try {
        await navigator.clipboard.writeText(affiliateData.referralLink);
        toast({
          title: "Referral Link Copied",
          description: "Your referral link has been copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy referral link",
          variant: "destructive",
        });
      }
    }
  };

  const shareReferralLink = async () => {
    if (affiliateData?.referralLink) {
      try {
        await navigator.share({
          title: 'Join Holyloy Rewards',
          text: 'Join Holyloy and start earning rewards!',
          url: affiliateData.referralLink
        });
      } catch (error) {
        // Fallback to copy
        copyReferralLink();
      }
    }
  };

  const refreshData = () => {
    refetchAffiliate();
    toast({
      title: "Data Refreshed",
      description: "Affiliate rewards data has been updated",
    });
  };

  if (affiliateLoading || walletLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Affiliate Rewards (5% Lifetime Commission)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-blue-200 rounded w-3/4"></div>
            <div className="h-8 bg-blue-200 rounded w-1/2"></div>
            <div className="h-4 bg-blue-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    totalCommissionEarned = 0, 
    totalReferrals = 0, 
    activeReferrals = 0, 
    lifetimeCommission = 0, 
    monthlyCommission = 0,
    referredCustomers = [],
    referralLink = '' 
  } = affiliateData || {};

  const { 
    incomeBalance = "0.00",
    totalIncomeEarned = "0.00"
  } = walletData || {};

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-800">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Affiliate Rewards (5% Lifetime Commission)
          </div>
          <Button size="sm" variant="outline" onClick={refreshData}>
            <TrendingUp className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income Wallet Display */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <Wallet className="w-4 h-4 mr-2" />
            Your Income Wallet (Affiliate Commissions)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{parseFloat(incomeBalance).toLocaleString()}</div>
              <div className="text-sm text-green-700">Current Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{parseFloat(totalIncomeEarned).toLocaleString()}</div>
              <div className="text-sm text-green-700">Total Earned</div>
            </div>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{totalCommissionEarned.toLocaleString()}</div>
            <div className="text-sm text-blue-700">Total Commission</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-green-600">{totalReferrals}</div>
            <div className="text-sm text-green-700">Total Referrals</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-purple-600">{activeReferrals}</div>
            <div className="text-sm text-purple-700">Active Referrals</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-orange-600">{monthlyCommission.toLocaleString()}</div>
            <div className="text-sm text-orange-700">This Month</div>
          </div>
        </div>

        {/* Referral Link */}
        {referralLink && (
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-3">Your Referral Link</h4>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-2 bg-gray-50 rounded border text-sm font-mono">
                {referralLink}
              </div>
              <Button size="sm" variant="outline" onClick={copyReferralLink}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={shareReferralLink}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Share this link to earn 5% commission on all points your referrals earn
            </div>
          </div>
        )}

        {/* Referred Customers */}
        {referredCustomers && referredCustomers.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-blue-800">Your Referrals</h4>
            <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Points Earned</TableHead>
                    <TableHead>Your Commission (5%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{customer.totalPointsEarned.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {customer.commissionEarned.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.isActive ? "default" : "secondary"}
                          className={customer.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(customer.lastActivity).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg border border-blue-100 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-semibold text-gray-700 mb-2">No Referrals Yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Share your referral link to start earning 5% commission on your referrals' points
            </p>
            {referralLink && (
              <Button onClick={shareReferralLink} className="bg-blue-600 hover:bg-blue-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share Referral Link
              </Button>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Gift className="w-4 h-4 mr-2" />
            How Affiliate Rewards Work
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• Earn 5% commission on every point your referrals earn from merchants</div>
            <div>• Commission is lifetime - you earn as long as they earn</div>
            <div>• Share your referral link to get started</div>
            <div>• Commission is automatically added to your income wallet</div>
            <div>• Track all your referrals and their earnings in real-time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

