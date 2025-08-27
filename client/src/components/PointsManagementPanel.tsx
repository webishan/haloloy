import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Coins, 
  Users, 
  TrendingUp, 
  Gift, 
  AlertCircle, 
  CheckCircle,
  Send,
  History,
  Zap
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PointGenerationForm {
  recipientEmail: string;
  points: number;
  description: string;
  transactionType: 'admin_manual' | 'bonus' | 'compensation' | 'promotional';
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country: string;
}

export default function PointsManagementPanel({ currentUser }: { currentUser: any }) {
  const [pointGenerationForm, setPointGenerationForm] = useState<PointGenerationForm>({
    recipientEmail: '',
    points: 0,
    description: '',
    transactionType: 'admin_manual'
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all users for recipient selection
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users']
  });

  // Get recent point transactions
  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/loyalty/transactions/admin', currentUser?.id]
  });

  // Get loyalty system statistics
  const { data: loyaltyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/loyalty-stats']
  });

  // Manual point generation mutation
  const generatePointsMutation = useMutation({
    mutationFn: async (data: { adminId: string; recipientId: string; points: number; description: string }) => {
      return await apiRequest('/api/loyalty/admin/generate-points', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (transaction) => {
      toast({
        title: "Points Generated Successfully",
        description: `${pointGenerationForm.points} points sent to ${selectedUser?.firstName} ${selectedUser?.lastName}`,
      });
      
      // Reset form
      setPointGenerationForm({
        recipientEmail: '',
        points: 0,
        description: '',
        transactionType: 'admin_manual'
      });
      setSelectedUser(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/transactions/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/loyalty-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Point Generation Failed",
        description: error.message || "Failed to generate points",
        variant: "destructive",
      });
    }
  });

  // Handle user search and selection
  const handleUserSearch = (email: string) => {
    setPointGenerationForm(prev => ({ ...prev, recipientEmail: email }));
    
    const user = allUsers.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
    setSelectedUser(user || null);
  };

  const handleGeneratePoints = () => {
    if (!selectedUser) {
      toast({
        title: "Recipient Required",
        description: "Please select a valid recipient",
        variant: "destructive",
      });
      return;
    }

    if (pointGenerationForm.points <= 0) {
      toast({
        title: "Invalid Points Amount",
        description: "Points must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!pointGenerationForm.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description for this transaction",
        variant: "destructive",
      });
      return;
    }

    generatePointsMutation.mutate({
      adminId: currentUser.id,
      recipientId: selectedUser.id,
      points: pointGenerationForm.points,
      description: pointGenerationForm.description
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'admin_manual': { label: 'Manual Generation', color: 'bg-blue-100 text-blue-800' },
      'bonus': { label: 'Bonus Points', color: 'bg-green-100 text-green-800' },
      'compensation': { label: 'Compensation', color: 'bg-orange-100 text-orange-800' },
      'promotional': { label: 'Promotional', color: 'bg-purple-100 text-purple-800' }
    };
    return types[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  if (currentUser?.role !== 'global_admin') {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only Global Administrators can access the Points Management Panel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="points-management-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Points Management</h1>
          <p className="text-gray-600">Manually generate and distribute loyalty points across the system</p>
        </div>
        <Badge className="bg-red-100 text-red-800">
          <Zap className="h-3 w-3 mr-1" />
          Global Admin Access
        </Badge>
      </div>

      {/* Loyalty System Stats */}
      {!statsLoading && loyaltyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Points Issued</p>
                  <p className="text-2xl font-bold">{loyaltyStats.totalPointsIssued?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{loyaltyStats.activeUsers?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Reward Numbers</p>
                  <p className="text-2xl font-bold">{loyaltyStats.totalRewardNumbers?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Gift className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Manual Transactions</p>
                  <p className="text-2xl font-bold">{loyaltyStats.manualTransactions?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Point Generation Form */}
      <Card data-testid="point-generation-form">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Generate Points Manually</span>
          </CardTitle>
          <CardDescription>
            Generate and distribute loyalty points to users. This action will be logged and audited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient Selection */}
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              placeholder="Enter recipient email address"
              value={pointGenerationForm.recipientEmail}
              onChange={(e) => handleUserSearch(e.target.value)}
              data-testid="recipient-email-input"
            />
            {selectedUser && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Selected: {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.role} - {selectedUser.country})
                </AlertDescription>
              </Alert>
            )}
            {pointGenerationForm.recipientEmail && !selectedUser && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  User not found. Please enter a valid email address.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Points Amount */}
          <div className="space-y-2">
            <Label htmlFor="points">Points Amount</Label>
            <Input
              id="points"
              type="number"
              placeholder="Enter points amount"
              value={pointGenerationForm.points || ''}
              onChange={(e) => setPointGenerationForm(prev => ({ 
                ...prev, 
                points: parseInt(e.target.value) || 0 
              }))}
              data-testid="points-amount-input"
            />
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Transaction Type</Label>
            <Select
              value={pointGenerationForm.transactionType}
              onValueChange={(value) => setPointGenerationForm(prev => ({ 
                ...prev, 
                transactionType: value as any 
              }))}
            >
              <SelectTrigger data-testid="transaction-type-select">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_manual">Manual Generation</SelectItem>
                <SelectItem value="bonus">Bonus Points</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter description for this transaction (required for audit trail)"
              value={pointGenerationForm.description}
              onChange={(e) => setPointGenerationForm(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              rows={3}
              data-testid="description-textarea"
            />
          </div>

          <Separator />

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePoints}
            disabled={generatePointsMutation.isPending || !selectedUser || pointGenerationForm.points <= 0 || !pointGenerationForm.description.trim()}
            className="w-full"
            data-testid="generate-points-button"
          >
            {generatePointsMutation.isPending ? (
              "Generating Points..."
            ) : (
              <>
                <Coins className="h-4 w-4 mr-2" />
                Generate {pointGenerationForm.points} Points
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card data-testid="recent-transactions">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Recent Manual Transactions</span>
          </CardTitle>
          <CardDescription>
            Latest manually generated point transactions by global administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No manual transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.slice(0, 10).map((transaction: any) => (
                <div key={transaction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getTransactionTypeLabel(transaction.transactionType).color}>
                          {getTransactionTypeLabel(transaction.transactionType).label}
                        </Badge>
                        <span className="font-medium">+{transaction.points} points</span>
                      </div>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Recipient</p>
                      <p className="text-xs text-gray-600">{transaction.recipientEmail || 'Unknown'}</p>
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