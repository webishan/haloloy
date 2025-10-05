import React from 'react';
import { Crown, Star } from 'lucide-react';

interface GlobalNumberDisplayProps {
  globalNumbers: number[] | number;
  className?: string;
}

export const GlobalNumberDisplay: React.FC<GlobalNumberDisplayProps> = ({ 
  globalNumbers, 
  className = '' 
}) => {
  // Handle both single number and array of numbers
  const numbers = Array.isArray(globalNumbers) ? globalNumbers : [globalNumbers];
  const validNumbers = numbers.filter(num => num > 0);
  const isAssigned = validNumbers.length > 0;

  if (!isAssigned) {
    // Display for Global Number 0 (not assigned yet)
    return (
      <div className={`${className} relative`}>
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center shadow-lg">
          <div className="flex items-center justify-center mb-4">
            <Star className="w-16 h-16 text-gray-400 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-gray-600 uppercase tracking-wide mb-4">
            🎯 Global Number
          </p>
          <p className="text-9xl font-black text-gray-400 mb-4 drop-shadow-lg">
            0
          </p>
          <p className="text-lg font-semibold text-gray-500">
            Not Assigned Yet
          </p>
          <p className="text-base text-gray-400 mt-2">
            Earn 1,500 points to get your first Global Number!
          </p>
        </div>
      </div>
    );
  }

  // Display for assigned Global Number (1, 2, 3, etc.)
  return (
    <div className={`${className} relative`}>
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 text-center shadow-2xl border-2 border-yellow-300 animate-pulse">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <Crown className="w-20 h-20 text-yellow-200 animate-bounce" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
          </div>
          
          <p className="text-3xl font-bold text-white uppercase tracking-wide mb-6 drop-shadow-lg">
            🏆 Global Number
          </p>
          
          <p className="text-6xl font-black text-white mb-6 drop-shadow-2xl leading-none">
            {validNumbers.join(', ')}
          </p>
          
          <p className="text-2xl font-bold text-yellow-100 mb-2">
            Company-wide Achievement
          </p>
          <p className="text-lg text-yellow-200">
            Sequential Orders #{validNumbers.join(', ')}
          </p>
        </div>
        
        {/* Sparkle effects */}
        <div className="absolute top-4 left-4 w-4 h-4 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-8 right-8 w-3 h-3 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute bottom-6 left-8 w-2 h-2 bg-white rounded-full animate-bounce"></div>
        <div className="absolute bottom-4 right-4 w-3 h-3 bg-yellow-100 rounded-full animate-ping"></div>
      </div>
    </div>
  );
};

export default GlobalNumberDisplay;