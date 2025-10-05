import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Share2, 
  Gift, 
  UserPlus,
  Activity,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ReferredMerchant {
  id: string;
  businessName: string;
  email: string;
  totalPointsTransferred: number;
  commissionEarned: number;
  lastActivity: string;
  isActive: boolean;
  registrationDate: string;
}

interface MerchantReferralData {
  referralLink: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionEarned: number;
  monthlyCommission: number;
  referredMerchants: ReferredMerchant[];
}

export default function MerchantReferralProgram({ currentUser }: { currentUser: any }) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  // Get referral link from affiliate API
  const { data: referralLinkData, isLoading: linkLoading } = useQuery({
    queryKey: ['/api/affiliate/referral-link', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 10000, // More frequent updates for real-time feel
  });

  // Get affiliate stats with real-time updates
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/affiliate/stats', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 5000, // Update every 5 seconds for real-time stats
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale for real-time updates
  });

  // Get cashback balance with real-time updates
  const { data: cashbackData, isLoading: cashbackLoading } = useQuery({
    queryKey: ['/api/affiliate/cashback-balance', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 3000, // Update every 3 seconds for commission updates
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale for real-time updates
  });

  // Get real-time cashback updates
  const { data: realtimeUpdates } = useQuery({
    queryKey: ['/api/affiliate/cashback-updates', currentUser?.id],
    enabled: !!currentUser,
    refetchInterval: 2000, // Very frequent updates for real-time commission tracking
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const isLoading = linkLoading || statsLoading || cashbackLoading;

  // Combine data from different endpoints with fallbacks and real-time updates
  const referralData = {
    referralLink: referralLinkData?.referralLink || 
                  referralLinkData?.data?.referralLink || 
                  (currentUser?.id ? `${window.location.origin}/merchant/register?ref=MERCH_${currentUser.id.substring(0, 8).toUpperCase()}` : ''),
    referralCode: (referralLinkData?.referralLink || referralLinkData?.data?.referralLink)?.split('ref=')[1] || 
                  (currentUser?.id ? `MERCH_${currentUser.id.substring(0, 8).toUpperCase()}` : ''),
    totalReferrals: statsData?.stats?.totalReferrals || 0,
    activeReferrals: statsData?.stats?.activeReferrals || 0,
    totalCommissionEarned: realtimeUpdates?.updates?.currentBalance || statsData?.stats?.totalCommissionEarned || cashbackData?.affiliateCashback || 0,
    monthlyCommission: realtimeUpdates?.updates?.recentEarnings || 0,
    referredMerchants: [],
    recentCommissions: realtimeUpdates?.updates?.recentCommissions || [],
    lastUpdated: realtimeUpdates?.updates?.lastUpdated
  };

  const copyReferralLink = async () => {
    let linkToCopy = referralData?.referralLink;
    
    // If no link exists, try to generate one via API
    if (!linkToCopy) {
      try {
        const response = await apiRequest('/api/affiliate/referral-link', 'POST');
        if (response.success && response.referralLink) {
          linkToCopy = response.referralLink;
        }
      } catch (error) {
        console.error('Failed to generate referral link via API:', error);
        
        // Fallback: Create a basic referral link format
        if (currentUser?.id) {
          const baseUrl = window.location.origin;
          const referralCode = `MERCH_${currentUser.id.substring(0, 8).toUpperCase()}`;
          linkToCopy = `${baseUrl}/merchant/register?ref=${referralCode}`;
          
          toast({
            title: "Referral Link Generated",
            description: "Using fallback referral link format",
          });
        }
      }
    }
    
    if (linkToCopy) {
      try {
        // Try modern clipboard API first
        await navigator.clipboard.writeText(linkToCopy);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast({
          title: "Referral Link Copied",
          description: "Your referral link has been copied to clipboard",
        });
      } catch (error) {
        // Fallback for browsers that don't support clipboard API or HTTPS
        try {
          const textArea = document.createElement('textarea');
          textArea.value = linkToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
            toast({
              title: "Referral Link Copied",
              description: "Your referral link has been copied to clipboard (fallback method)",
            });
          } else {
            throw new Error('Fallback copy failed');
          }
        } catch (fallbackError) {
          // Show the link in a modal or alert for manual copying
          const message = `Please copy your referral link manually:\n\n${linkToCopy}`;
          
          if (window.confirm(`Copy failed. Would you like to see the link to copy manually?\n\nClick OK to show the link.`)) {
            alert(message);
          }
          
          toast({
            title: "Manual Copy Required",
            description: "Please copy the referral link manually from the text box above",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Unable to Generate Link",
        description: "Please try refreshing the page or contact support",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = async () => {
    if (referralData?.referralLink) {
      try {
        await navigator.share({
          title: 'Join Holyloy Merchant Network',
          text: 'Join Holyloy as a merchant and start earning rewards!',
          url: referralData.referralLink
        });
      } catch (error) {
        // Fallback to copy
        copyReferralLink();
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <UserPlus className="w-5 h-5 mr-2 text-green-600" />
            Merchant Referral Program
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

  const { 
    referralLink = '', 
    referralCode = '',
    totalReferrals = 0, 
    activeReferrals = 0, 
    totalCommissionEarned = 0, 
    monthlyCommission = 0,
    referredMerchants = [],
    recentCommissions = [],
    lastUpdated = null
  } = referralData || {};

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center text-green-800">
          <UserPlus className="w-5 h-5 mr-2 text-green-600" />
          Merchant Referral Program (2% Commission)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Commission Summary with Real-time Updates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-green-100 relative">
            <div className="text-2xl font-bold text-green-600">
              {(totalCommissionEarned || 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-700">Total Commission</div>
            {realtimeUpdates?.updates?.lastUpdated && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Real-time updates active"></div>
              </div>
            )}
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-green-100 relative">
            <div className="text-2xl font-bold text-blue-600">{totalReferrals}</div>
            <div className="text-sm text-blue-700">Total Referrals</div>
            {totalReferrals > 0 && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" title="Referrals tracked"></div>
              </div>
            )}
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-purple-600">{activeReferrals}</div>
            <div className="text-sm text-purple-700">Active Referrals</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-green-100 relative">
            <div className="text-2xl font-bold text-orange-600">
              {(monthlyCommission || 0).toLocaleString()}
            </div>
            <div className="text-sm text-orange-700">Recent Earnings</div>
            {monthlyCommission > 0 && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Recent commission earned"></div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Commission Activity */}
        {recentCommissions && recentCommissions.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-green-100">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Recent Commission Activity
            </h4>
            <div className="space-y-2">
              {recentCommissions.slice(0, 5).map((commission: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                  <span className="text-gray-600">
                    Commission earned
                  </span>
                  <span className="font-semibold text-green-600">
                    +৳{parseFloat(commission.amount || '0').toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {lastUpdated && (
              <div className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Referral Link Section */}
        <div className="bg-white p-4 rounded-lg border border-green-100">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center">
            <Gift className="w-4 h-4 mr-2" />
            Your Merchant Referral Link
          </h4>
          <div className="space-y-3">
            {referralLink ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-3 bg-gray-50 rounded border text-sm font-mono break-all select-all cursor-pointer hover:bg-gray-100" 
                         onClick={() => {
                           // Select text when clicked for easy manual copying
                           const selection = window.getSelection();
                           const range = document.createRange();
                           range.selectNodeContents(event.target as Node);
                           selection?.removeAllRanges();
                           selection?.addRange(range);
                         }}>
                      {referralLink}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={copyReferralLink}
                      className={copiedLink ? 'bg-green-100 border-green-300' : ''}
                      title="Copy to clipboard"
                    >
                      {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={shareReferralLink} title="Share link">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    💡 Tip: Click on the link above to select it for manual copying
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  <strong>Referral Code:</strong> {referralCode}
                </div>
                <div className="text-xs text-gray-600">
                  Share this link to earn 2% commission on all points your referred merchants transfer to their customers
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-500 mb-3">
                  {isLoading ? 'Loading referral link...' : 'Click below to generate your referral link'}
                </div>
                <Button 
                  onClick={copyReferralLink}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Generate & Copy Referral Link'}
                </Button>
                <div className="text-xs text-gray-500 mt-2">
                  Your referral link will be generated and copied to clipboard
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Referred Merchants */}
        {referredMerchants && referredMerchants.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-green-800 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Your Referred Merchants
            </h4>
            <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Points Transferred</TableHead>
                    <TableHead>Your Commission (2%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredMerchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{merchant.businessName}</div>
                          <div className="text-sm text-gray-500">{merchant.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{(merchant.totalPointsTransferred || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ৳{(merchant.commissionEarned || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={merchant.isActive ? "default" : "secondary"}
                          className={merchant.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {merchant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(merchant.registrationDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(merchant.lastActivity).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            How Merchant Referral Program Works
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• Earn 2% commission on every point your referred merchants transfer to their customers</div>
            <div>• Commission is lifetime - you earn as long as they transfer points</div>
            <div>• Share your referral link with potential merchants to get started</div>
            <div>• Commission is automatically added to your affiliate cashback balance</div>
            <div>• Track all your referrals and their point transfers in real-time</div>
            <div>• No limit on the number of merchants you can refer</div>
          </div>
        </div>

        {/* Call to Action */}
        {totalReferrals === 0 && (
          <div className="text-center p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200">
            <UserPlus className="w-12 h-12 mx-auto text-green-600 mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">Start Referring Merchants Today!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share your referral link and start earning 2% commission on every point transfer
            </p>
            <Button onClick={copyReferralLink} className="bg-green-600 hover:bg-green-700">
              <Copy className="w-4 h-4 mr-2" />
              Copy Referral Link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}