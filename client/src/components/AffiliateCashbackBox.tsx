import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface AffiliateCashbackBoxProps {
  affiliateCashback: number;
  currency?: string;
}

export const AffiliateCashbackBox: React.FC<AffiliateCashbackBoxProps> = ({
  affiliateCashback,
  currency = '৳'
}) => {
  // Only show the component if there's affiliate cashback to display
  if (affiliateCashback <= 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Affiliate Cashback</p>
            <p className="text-2xl font-bold text-blue-700">
              {currency}{affiliateCashback}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              2% commission from referrals
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};