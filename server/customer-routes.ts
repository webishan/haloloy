import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import bcrypt from 'bcryptjs';
import { 
  insertCustomerProfileSchema,
  insertCustomerPointTransactionSchema,
  insertCustomerOTPSchema,
  insertCustomerPointTransferSchema,
  insertCustomerPurchaseSchema
} from '@shared/schema';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { unifiedStepUpRewardSystem } from './services/UnifiedStepUpRewardSystem';
import { stepUpRewardSystem } from './services/StepUpRewardSystem';
import { globalNumberSystem } from './services/GlobalNumberSystem';

const router = Router();

// Helper function to generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get reward tier based on global serial number (matching the Bengali logic)
const getRewardTierBySerial = (serialNumber: number): { name: string; range: string; reward: number } => {
  if (serialNumber === 1) {
    return { name: 'Champion', range: '1', reward: 38000 };
  } else if (serialNumber >= 2 && serialNumber <= 5) {
    return { name: 'Elite', range: '2-5', reward: 15000 };
  } else if (serialNumber >= 6 && serialNumber <= 15) {
    return { name: 'Premium', range: '6-15', reward: 8000 };
  } else if (serialNumber >= 16 && serialNumber <= 37) {
    return { name: 'Gold', range: '16-37', reward: 3500 };
  } else if (serialNumber >= 38 && serialNumber <= 65) {
    return { name: 'Silver', range: '38-65', reward: 1500 };
  } else {
    return { name: 'Bronze', range: '66+', reward: 800 };
  }
};

// Helper function to get customer ID from user
const getCustomerId = async (userId: string) => {
  let profile = await storage.getCustomerProfile(userId);
  
  // If profile doesn't exist, create it
  if (!profile) {
    // Generate unique account number
    const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
    
    // Create customer profile
    profile = await storage.createCustomerProfile({
      userId: userId,
      uniqueAccountNumber,
      mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
      email: 'customer@komarce.com', // Default email
      fullName: 'Customer User',
      profileComplete: false,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      accumulatedPoints: 0,
      globalSerialNumber: 0,
      localSerialNumber: 0,
      tier: 'bronze',
      isActive: true
    });

    // Create customer wallet
    await storage.createCustomerWallet({
      customerId: profile.id,
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0,
      totalRewardPointsSpent: 0,
      totalRewardPointsTransferred: 0,
      incomeBalance: "0.00",
      totalIncomeEarned: "0.00",
      totalIncomeSpent: "0.00",
      totalIncomeTransferred: "0.00",
      commerceBalance: "0.00",
      totalCommerceAdded: "0.00",
      totalCommerceSpent: "0.00",
      totalCommerceWithdrawn: "0.00"
    });
  }

  return profile.id;
};

// ==================== CUSTOMER REGISTRATION ====================

// Customer registration
router.post('/register', async (req, res) => {
  try {
    const { email, mobileNumber, fullName, password, referralCode } = req.body;
    
    if (!email || !mobileNumber || !fullName || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Check if mobile number already exists
    const existingProfile = await storage.getCustomerProfileByMobile(mobileNumber);
    if (existingProfile) {
      return res.status(400).json({ error: 'User already exists with this mobile number' });
    }

    // Validate referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await storage.getCustomerByReferralCode(referralCode);
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      role: 'customer',
      username: email.split('@')[0] + '_' + Date.now(),
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      country: 'BD',
      phone: mobileNumber
    });

    // Generate unique account number
    const uniqueAccountNumber = await storage.generateUniqueAccountNumber();

    // Create customer profile
    const profile = await storage.createCustomerProfile({
      userId: user.id,
      uniqueAccountNumber,
      mobileNumber,
      email,
      fullName,
      profileComplete: false,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      accumulatedPoints: 0,
      globalSerialNumber: 0,
      localSerialNumber: 0,
      tier: 'bronze',
      isActive: true,
    });

    // Generate referral code for new customer
    await storage.ensureCustomerHasReferralCode(profile.id);

    // Create customer wallet
    await storage.createCustomerWallet({
      customerId: profile.id,
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0,
      totalRewardPointsSpent: 0,
      totalRewardPointsTransferred: 0,
      incomeBalance: "0.00",
      totalIncomeEarned: "0.00",
      totalIncomeSpent: "0.00",
      totalIncomeTransferred: "0.00",
      commerceBalance: "0.00",
      totalCommerceAdded: "0.00",
      totalCommerceSpent: "0.00",
      totalCommerceWithdrawn: "0.00"
    });

    // Create referral relationship if referral code was provided
    if (referrer) {
      await storage.createCustomerReferral({
        referrerId: referrer.id,
        referredId: profile.id,
        referralCode: await storage.ensureCustomerHasReferralCode(referrer.id),
        commissionRate: "5.00",
        totalPointsEarned: 0,
        totalCommissionEarned: "0.00"
      });

      // Referral relationship created successfully
    }

    // Generate QR code
    const qrCode = await storage.generateCustomerQRCode(user.id);

    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, role: user.role },
      profile: { ...profile, qrCode },
      referredBy: referrer ? { fullName: referrer.fullName, accountNumber: referrer.uniqueAccountNumber } : null,
      message: 'Customer registered successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== CUSTOMER LOGIN ====================

// Customer login with email or mobile number and password
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // Changed from mobileNumber to identifier
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone number and password are required' });
    }

    let user = null;
    let profile = null;

    // Check if identifier is an email (contains @) or phone number
    if (identifier.includes('@')) {
      // Login with email
      user = await storage.getUserByEmail(identifier);
      if (user && user.role === 'customer') {
        profile = await storage.getCustomerProfile(user.id);
      }
    } else {
      // Login with phone number
      profile = await storage.getCustomerProfileByMobile(identifier);
      if (profile) {
        user = await storage.getUser(profile.userId);
      }
    }

    if (!user || !profile) {
      return res.status(401).json({ error: 'Invalid email/phone number or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email/phone number or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'komarce-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token,
      user: { id: user.id, email: user.email, role: user.role },
      profile,
      message: 'Login successful' 
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== PASSWORD RECOVERY ====================

// Send OTP for password recovery
router.post('/forgot-password', async (req, res) => {
  try {
    const { mobileNumber, email, deliveryMethod } = req.body;
    
    if (!deliveryMethod) {
      return res.status(400).json({ error: 'Delivery method is required' });
    }

    let profile;
    if (deliveryMethod === 'mobile' && mobileNumber) {
      profile = await storage.getCustomerProfileByMobile(mobileNumber);
    } else if (deliveryMethod === 'email' && email) {
      profile = await storage.getCustomerProfile(email);
    }

    if (!profile) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create OTP record
    await storage.createCustomerOTP({
      customerId: profile.id,
      otpCode,
      otpType: 'password_recovery',
      deliveryMethod,
      expiresAt
    });

    // In a real application, you would send the OTP via SMS or email
    // For demo purposes, we'll return it in the response
    res.json({ 
      success: true, 
      message: `OTP sent to ${deliveryMethod}`,
      otpCode: otpCode // Remove this in production
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Verify OTP and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { customerId, otpCode, newPassword } = req.body;
    
    if (!customerId || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify OTP
    const isValidOTP = await storage.verifyCustomerOTP(customerId, otpCode, 'password_recovery');
    if (!isValidOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Get profile and user
    const profile = await storage.getCustomerProfile(customerId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const user = await storage.getUser(profile.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await storage.updateUser(user.id, { password: hashedPassword });

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== CUSTOMER PROFILE ====================

// Get customer profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    // Generate QR code if it doesn't exist
    if (!profile.qrCode) {
      const qrCode = await storage.generateCustomerQRCode(req.user.userId);
      profile = await storage.getCustomerProfile(req.user.userId);
    }

    // Check if customer qualifies for global serial number (1500 points threshold)
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const totalPointsEarned = profile.totalPointsEarned || 0;
    if (totalPointsEarned >= 1500 && !profile.globalSerialNumber) {
      try {
        // Use GlobalNumberSystem to ensure proper totalPointsEarned update
        const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
        const result = await globalNumberSystem.checkAndAssignGlobalNumber(
          req.user.userId,
          totalPointsEarned,
          false // These are earned points, not reward points
        );
        
        if (result.globalNumberAssigned) {
          console.log(`🎯 Global Number #${result.globalNumber} assigned to customer ${req.user.userId}`);
          
          // Get updated profile
          profile = await storage.getCustomerProfile(req.user.userId);
          console.log(`✅ Global serial number #${result.globalNumber} assigned to customer ${req.user.userId} (achievement order)`);
          
          // Log reward tier information
          const rewardTier = getRewardTierBySerial(result.globalNumber || 0);
          console.log(`🏆 Customer ${req.user.userId} assigned to ${rewardTier.name} tier (Reward: ${rewardTier.reward} points)`);
        }
      } catch (error) {
        console.error('Error assigning global serial number:', error);
      }
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Removed duplicate - referral info is handled in customer-wallet-routes.ts

// Alias for older frontend: affiliate-link → returns same payload as referral-info
router.get('/affiliate-link', authenticateToken, async (req, res) => {
  try {
    const profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Customer not found' });
    const finalReferralCode = await storage.ensureCustomerHasReferralCode(profile.id);
    const headerOrigin = (req.headers.origin as string) || '';
    const hostHeader = (req.headers.host as string) || '';
    const protocol = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
    const inferredBase = hostHeader ? `${protocol}://${hostHeader}` : '';
    const baseUrl = process.env.PUBLIC_APP_ORIGIN || headerOrigin || inferredBase || 'http://localhost:5006';
    const referralLink = `${baseUrl}/register?ref=${finalReferralCode}`;
    res.json({ referralCode: finalReferralCode, referralLink });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Affiliate: referral stats
router.get('/wallet/referral-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await storage.getCustomerReferralStats(req.user.userId);
    res.json(stats);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Affiliate: referrals list
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const stats = await storage.getCustomerReferralStats(req.user.userId);
    res.json(stats.referralDetails || []);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Affiliate: commissions list
router.get('/referral-commissions', authenticateToken, async (req, res) => {
  try {
    const customer = await storage.getCustomerProfile(req.user.userId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const commissions = await storage.getCustomerReferralCommissions(customer.id);
    res.json(commissions);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Update customer profile (for withdrawal requirements)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      fathersName, 
      mothersName, 
      nidNumber, 
      passportNumber, 
      bloodGroup, 
      nomineeDetails 
    } = req.body;

    const profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    // Check if all required fields are provided
    const requiredFields = [fathersName, mothersName, nidNumber || passportNumber, bloodGroup, nomineeDetails];
    const profileComplete = requiredFields.every(field => field !== undefined && field !== null && field !== '');

    const updatedProfile = await storage.updateCustomerProfile(req.user.userId, {
      fathersName,
      mothersName,
      nidNumber,
      passportNumber,
      bloodGroup,
      nomineeDetails,
      profileComplete
    });

    res.json({ 
      success: true, 
      profile: updatedProfile,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== CUSTOMER WALLET ====================

// Get customer wallet
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const wallet = await storage.getCustomerWallet(customerId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Customer wallet not found' });
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Wallet overview endpoint for frontend
// NEW: Get StepUp Reward Balance for authenticated customer
router.get('/stepup-reward-balance', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    
    // Get all StepUp reward transactions for this customer
    const allTransactions = await storage.getCustomerPointTransactions(customerId);
    const stepUpTransactions = allTransactions.filter(t => 
      t.transactionType === 'reward' && 
      t.description && 
      t.description.includes('StepUp Reward')
    );
    
    const stepUpRewardBalance = stepUpTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
    
    res.json({
      stepUpRewardBalance: stepUpRewardBalance,
      stepUpTransactions: stepUpTransactions,
      totalStepUpRewards: stepUpTransactions.length
    });
  } catch (error) {
    console.error('Error fetching StepUp reward balance:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Shopping Voucher wallet - list customer's vouchers and proportional merchant breakdown
router.get('/wallet/shopping-vouchers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const vouchers = await storage.getCustomerShoppingVouchers(customerId);

    // Aggregate by merchant for proportional view
    const byMerchant: Record<string, { merchantId: string; totalVoucherPoints: number; count: number }> = {};
    for (const v of vouchers) {
      if (!byMerchant[v.merchantId]) {
        byMerchant[v.merchantId] = { merchantId: v.merchantId, totalVoucherPoints: 0, count: 0 };
      }
      byMerchant[v.merchantId].totalVoucherPoints += parseFloat(v.voucherValue);
      byMerchant[v.merchantId].count += 1;
    }

    const merchantList = Object.values(byMerchant).sort((a, b) => b.totalVoucherPoints - a.totalVoucherPoints);

    const totalVoucherPoints = vouchers.reduce((s, v) => s + parseFloat(v.voucherValue), 0);

    res.json({
      vouchers,
      statistics: {
        totalVoucherPoints,
        voucherCount: vouchers.length,
        merchants: merchantList
      }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Ripple rewards wallet - placeholder endpoint for UI wiring
router.get('/wallet/ripple-rewards', authenticateToken, async (req, res) => {
  try {
    // If ripple rewards are tracked in a dedicated store, fetch and return them here.
    // For now, return empty list to avoid 404 and enable UI rendering.
    res.json({ rewards: [], total: 0 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== POINT TRANSACTIONS ====================

// Get customer point transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const { merchantId } = req.query;
    
    console.log(`🔍 Fetching transactions for:`, {
      userId: req.user.userId,
      customerId: customerId,
      merchantId: merchantId
    });
    
    let transactions;
    if (merchantId) {
      transactions = await storage.getCustomerPointTransactionsByMerchant(customerId, merchantId as string);
    } else {
      transactions = await storage.getCustomerPointTransactions(customerId);
    }

    console.log(`📊 Found ${transactions.length} transactions:`, transactions.map(t => ({
      id: t.id,
      customerId: t.customerId,
      points: t.points,
      description: t.description
    })));

    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== POINT TRANSFERS ====================

// Get customer point transfers
router.get('/transfers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const transfers = await storage.getCustomerPointTransfers(customerId);
    
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Transfer points to another customer
router.post('/transfers', authenticateToken, async (req, res) => {
  try {
    const { toCustomerId, points, transferMethod, description } = req.body;
    
    if (!toCustomerId || !points || points <= 0) {
      return res.status(400).json({ error: 'Invalid transfer details' });
    }

    const fromCustomerId = await getCustomerId(req.user.userId);
    
    // Check if customer has enough points
    const wallet = await storage.getCustomerWallet(fromCustomerId);
    if (!wallet || wallet.rewardPointBalance < points) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    // Check if recipient exists
    const recipientProfile = await storage.getCustomerProfile(toCustomerId);
    if (!recipientProfile) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Get sender profile
    const senderProfile = await storage.getCustomerProfile(fromCustomerId);
    if (!senderProfile) {
      return res.status(404).json({ error: 'Sender profile not found' });
    }

    // Create transfer
    const transfer = await storage.createCustomerPointTransfer({
      fromCustomerId,
      toCustomerId,
      points,
      transferMethod: transferMethod || 'mobile_number',
      status: 'pending',
      description
    });

    // Update sender wallet
    await storage.updateCustomerWallet(fromCustomerId, {
      rewardPointBalance: wallet.rewardPointBalance - points,
      totalRewardPointsTransferred: wallet.totalRewardPointsTransferred + points,
      lastTransactionAt: new Date()
    });

    // Update recipient wallet
    const recipientWallet = await storage.getCustomerWallet(toCustomerId);
    if (recipientWallet) {
      await storage.updateCustomerWallet(toCustomerId, {
        rewardPointBalance: recipientWallet.rewardPointBalance + points,
        lastTransactionAt: new Date()
      });
    }

    // Create transaction records
    await storage.createCustomerPointTransaction({
      customerId: fromCustomerId,
      merchantId: 'system',
      transactionType: 'transferred_out',
      points: -points,
      balanceAfter: wallet.rewardPointBalance - points,
      description: `Transferred ${points} points to ${recipientProfile.fullName}`,
      referenceId: transfer.id
    });

    if (recipientWallet) {
      await storage.createCustomerPointTransaction({
        customerId: toCustomerId,
        merchantId: 'system',
        transactionType: 'transferred_in',
        points: points,
        balanceAfter: recipientWallet.rewardPointBalance + points,
        description: `Received ${points} points from ${senderProfile.fullName}`,
        referenceId: transfer.id
      });
    }

    // Update transfer status
    await storage.updateCustomerPointTransfer(transfer.id, {
      status: 'completed',
      completedAt: new Date()
    });

    res.json({ 
      success: true, 
      transfer,
      message: 'Points transferred successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== QR CODE TRANSFERS ====================

// Get customer by QR code
router.post('/qr-scan', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
    
    if (!qrCode) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    const customer = await storage.getCustomerByQRCode(qrCode);
    if (!customer) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    // Return customer info for transfer
    res.json({
      success: true,
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        accountNumber: customer.uniqueAccountNumber,
        mobileNumber: customer.mobileNumber
      }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== SERIAL NUMBERS ====================

// Get customer serial number
router.get('/serial-number', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const serialNumber = await storage.getCustomerSerialNumber(customerId);
    
    res.json(serialNumber);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== QR CODE ====================

// Debug endpoint to test authentication
router.get('/debug-auth', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Debug auth - User ID: ${req.user.userId}`);
    res.json({ 
      success: true, 
      userId: req.user.userId,
      email: req.user.email,
      message: 'Authentication working' 
    });
  } catch (error) {
    console.error(`❌ Debug auth failed:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer QR code
router.get('/qr-code', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Generating QR code for user: ${req.user.userId}`);
    
    // First check if customer profile exists
    let profile = await storage.getCustomerProfile(req.user.userId);
    console.log(`🔍 Profile found: ${profile ? 'Yes' : 'No'}`);
    
    // If profile doesn't exist, create it
    if (!profile) {
      console.log(`🔍 Creating new customer profile for user: ${req.user.userId}`);
      
      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.userId,
        uniqueAccountNumber,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        email: req.user.email,
        fullName: `${req.user.firstName || 'Customer'} ${req.user.lastName || 'User'}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: 'bronze',
        isActive: true
      });

      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: profile.id,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: "0.00",
        totalIncomeEarned: "0.00",
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });
      
      console.log(`✅ Customer profile created successfully`);
    }
    
    console.log(`🔍 Generating QR code for profile: ${profile.id}`);
    const qrCode = await storage.generateCustomerQRCode(req.user.userId);
    console.log(`✅ QR code generated: ${qrCode}`);
    
    res.json({ qrCode });
  } catch (error) {
    console.error(`❌ QR code generation failed:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer QR code as image
router.get('/qr-code-image', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Generating QR code image for user: ${req.user.userId}`);
    
    // First check if customer profile exists
    let profile = await storage.getCustomerProfile(req.user.userId);
    console.log(`🔍 Profile found: ${profile ? 'Yes' : 'No'}`);
    
    // If profile doesn't exist, create it
    if (!profile) {
      console.log(`🔍 Creating new customer profile for user: ${req.user.userId}`);
      
      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.userId,
        uniqueAccountNumber,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        email: req.user.email,
        fullName: `${req.user.firstName || 'Customer'} ${req.user.lastName || 'User'}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: 'bronze',
        isActive: true
      });

      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: profile.id,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: "0.00",
        totalIncomeEarned: "0.00",
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });
      
      console.log(`✅ Customer profile created successfully`);
    }
    
    console.log(`🔍 Generating QR code for profile: ${profile.id}`);
    const qrCode = await storage.generateCustomerQRCode(req.user.userId);
    console.log(`✅ QR code generated: ${qrCode}`);
    
    // Import QRCode library dynamically
    const QRCode = await import('qrcode');
    console.log(`🔍 QRCode library imported successfully`);
    
    // Generate QR code as PNG buffer with better visibility
    const qrBuffer = await QRCode.toBuffer(qrCode, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H', // High error correction for better scanning
      maskPattern: 0 // Use mask pattern 0 for better readability
    });
    
    console.log(`✅ QR code image generated, size: ${qrBuffer.length} bytes`);
    
    // Set response headers for image
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': qrBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(qrBuffer);
  } catch (error) {
    console.error(`❌ QR code image generation failed:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== PURCHASE HISTORY ====================

// Get customer purchases
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const { merchantId } = req.query;
    
    let purchases;
    if (merchantId) {
      purchases = await storage.getCustomerPurchasesByMerchant(customerId, merchantId as string);
    } else {
      purchases = await storage.getCustomerPurchases(customerId);
    }

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== POINT EARNING (from merchant purchases) ====================

// Record customer purchase and earn points
router.post('/earn-points', authenticateToken, async (req, res) => {
  try {
    const { merchantId, productId, quantity, unitPrice, pointsEarned, cashDiscount } = req.body;
    
    if (!merchantId || !productId || !quantity || !unitPrice || !pointsEarned) {
      return res.status(400).json({ error: 'All purchase details are required' });
    }

    const customerId = await getCustomerId(req.user.userId);
    const totalAmount = quantity * unitPrice;
    const finalAmount = totalAmount - (cashDiscount || 0);

    // Create purchase record
    const purchase = await storage.createCustomerPurchase({
      customerId,
      merchantId,
      productId,
      quantity,
      unitPrice: unitPrice.toString(),
      totalAmount: totalAmount.toString(),
      pointsEarned,
      cashDiscount: (cashDiscount || 0).toString(),
      finalAmount: finalAmount.toString()
    });

    // Initialize Global Number system if needed
    await storage.initializeStepUpConfig();

    // Process Global Number eligibility using GlobalNumberSystem (these are earned points, not reward points)
    const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
    const globalNumberResult = await globalNumberSystem.checkAndAssignGlobalNumber(
      req.user.userId,
      pointsEarned,
      false // These are earned points from merchant purchases
    );

    // Update customer wallet
    const wallet = await storage.getCustomerWallet(customerId);
    if (wallet) {
      await storage.updateCustomerWallet(customerId, {
        rewardPointBalance: wallet.rewardPointBalance + pointsEarned,
        totalRewardPointsEarned: wallet.totalRewardPointsEarned + pointsEarned,
        lastTransactionAt: new Date()
      });

      // Create transaction record (this will also trigger Global Number processing)
      await storage.createCustomerPointTransaction({
        customerId,
        merchantId,
        transactionType: 'earned',
        points: pointsEarned,
        balanceAfter: wallet.rewardPointBalance + pointsEarned,
        description: `Earned ${pointsEarned} points from purchase`,
        referenceId: purchase.id
      });

      // Calculate referral commission for the referrer (if this customer was referred)
      try {
        await storage.calculateReferralCommission(customerId, pointsEarned);
      } catch (error) {
        console.error('Error calculating referral commission:', error);
        // Don't fail the main transaction if referral commission fails
      }
    }

    // Prepare response with Global Number information
    const response: any = { 
      success: true, 
      purchase,
      message: 'Points earned successfully'
    };

    if (globalNumberResult.globalNumberAssigned) {
      response.globalNumber = {
        awarded: true,
        number: globalNumberResult.globalNumber,
        message: `🎉 Congratulations! You've been awarded Global Number ${globalNumberResult.globalNumber}!`
      };
    }

    if (globalNumberResult.stepUpRewards.length > 0) {
      response.stepUpRewards = globalNumberResult.stepUpRewards.map(reward => ({
        recipientGlobalNumber: reward.globalNumber,
        rewardPoints: reward.rewardPoints,
        message: `💰 Global Number ${reward.globalNumber} received ${reward.rewardPoints} StepUp reward points!`
      }));
    }

    res.json(response);
  } catch (error) {
    console.error('Error in earn-points:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ==================== GLOBAL NUMBER SYSTEM ====================

// Get customer's Global Numbers
router.get('/global-numbers', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const globalNumbers = await storage.getCustomerGlobalNumbers(customerId);
    
    res.json({
      globalNumbers,
      count: globalNumbers.length
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get StepUp configuration
router.get('/stepup-config', authenticateToken, async (req, res) => {
  try {
    const configs = await storage.getStepUpConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer's StepUp rewards
router.get('/stepup-rewards', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    
    // Get customer profile to check if they have Global Numbers
    const profile = await storage.getCustomerProfileById(customerId);
    if (profile && profile.globalSerialNumber && profile.globalSerialNumber > 0) {
      // Customer has Global Numbers, ensure StepUp rewards are processed
      console.log(`🔍 Customer ${profile.fullName} has Global #${profile.globalSerialNumber}, processing StepUp rewards...`);
      
      // Process all existing Global Numbers to catch up on missed rewards
      const allRewards = await unifiedStepUpRewardSystem.processAllExistingGlobalNumbers();
      console.log(`✅ Processed ${allRewards.length} total StepUp rewards`);
    }
    
    // Get customer's StepUp rewards
    const stepUpRewards = await unifiedStepUpRewardSystem.getCustomerStepUpRewards(customerId);
    
    res.json(stepUpRewards);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer's total StepUp rewards earned
router.get('/stepup-rewards/total', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    // Using static import
    const totalEarned = await unifiedStepUpRewardSystem.getTotalStepUpRewardsEarned(customerId);
    
    res.json({ totalEarned });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create test customers for StepUp rewards testing
router.post('/create-test-customers', async (req, res) => {
  try {
    console.log('👤 Creating test customers for StepUp rewards testing...');
    
    // Create 5 test customers with Global Numbers 1-5
    const customers = [];
    
    for (let i = 1; i <= 5; i++) {
      const hashedPassword = await bcrypt.hash('customer123', 10);
      
      // Create user
      const user = await storage.createUser({
        username: `testcustomer${i}`,
        email: `testcustomer${i}@test.com`,
        password: hashedPassword,
        firstName: `Test`,
        lastName: `Customer ${i}`,
        role: 'customer',
        country: 'BD',
        phone: `+880123456789${i}`
      });
      
      // Create customer profile with Global Number
      const customerProfile = await storage.createCustomerProfile({
        userId: user.id,
        uniqueAccountNumber: `TEST${i.toString().padStart(3, '0')}`,
        mobileNumber: `+880123456789${i}`,
        email: user.email,
        fullName: `Test Customer ${i}`,
        profileComplete: true,
        totalPointsEarned: 1500 * i,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: i,
        localSerialNumber: i,
        tier: 'bronze',
        isActive: true
      });
      
      // Create customer wallet
      await storage.createCustomerWallet({
        customerId: customerProfile.id,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 1500 * i,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: "0.00",
        totalIncomeEarned: "0.00",
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });
      
      // Create customer serial number record (required for StepUp system)
      await storage.createCustomerSerialNumber({
        customerId: customerProfile.id,
        globalSerialNumber: i,
        localSerialNumber: i,
        totalSerialCount: 1,
        pointsAtSerial: 1500,
        isActive: true
      });
      
      customers.push({
        id: customerProfile.id,
        fullName: customerProfile.fullName,
        globalSerialNumber: customerProfile.globalSerialNumber,
        email: user.email
      });
      
      console.log(`✅ Created Customer ${i} with Global #${i}`);
    }
    
    // Process StepUp rewards for Global Number 5
    console.log('🎯 Processing StepUp rewards for Global Number 5...');
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
    console.log(`✅ Processed ${rewards.length} StepUp rewards`);
    
    res.json({
      message: 'Test customers created successfully',
      customers: customers,
      stepUpRewardsProcessed: rewards.length
    });
    
  } catch (error) {
    console.error('❌ Error creating test customers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Test endpoint to check StepUp rewards (no authentication required for testing)
router.get('/test-stepup-rewards', async (req, res) => {
  try {
    // Get all customers with Global Numbers (including multiple Global Numbers per customer)
    const allProfiles = await storage.getAllCustomerProfiles();
    const customersWithGlobalNumbers = [];
    
    for (const profile of allProfiles) {
      // Get all Global Numbers for this customer
      const serialNumbers = await storage.getAllCustomerSerialNumbers();
      const customerSerials = serialNumbers.filter(s => s.customerId === profile.id && s.isActive);
      const globalNumbers = customerSerials.map(s => s.globalSerialNumber).sort((a, b) => a - b);
      
      if (globalNumbers.length > 0) {
        customersWithGlobalNumbers.push({
          id: profile.id,
          fullName: profile.fullName,
          globalNumbers: globalNumbers,
          globalSerialNumber: globalNumbers[globalNumbers.length - 1] // Latest Global Number for backward compatibility
        });
      }
    }
    
    console.log(`📊 Found ${customersWithGlobalNumbers.length} customers with Global Numbers`);
    
    // Check StepUp rewards for each customer
    const results = [];
    for (const customer of customersWithGlobalNumbers) {
      const rewards = await unifiedStepUpRewardSystem.getCustomerStepUpRewards(customer.id);
      const totalEarned = rewards.reduce((sum, r) => sum + r.rewardPoints, 0);
      
      results.push({
        customerName: customer.fullName,
        globalSerialNumber: customer.globalSerialNumber, // Latest Global Number
        globalNumbers: customer.globalNumbers, // All Global Numbers
        rewardsCount: rewards.length,
        totalEarned: totalEarned,
        rewards: rewards
      });
    }
    
    // Also fix Income Wallet for all customers with StepUp rewards
    console.log('🔧 Also fixing Income Wallet for customers with StepUp rewards...');
    let fixedCount = 0;
    
    for (const profile of allProfiles) {
      const stepUpRewards = await storage.getCustomerStepUpRewards(profile.id);
      const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
      
      if (awardedRewards.length > 0) {
        const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
        let wallet = await storage.getCustomerWallet(profile.id);
        
        if (wallet) {
          const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
          if (currentIncomeBalance < totalStepUpPoints) {
            const missingPoints = totalStepUpPoints - currentIncomeBalance;
            const newIncomeBalance = currentIncomeBalance + missingPoints;
            const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
            
            await storage.updateCustomerWallet(profile.id, {
              incomeBalance: newIncomeBalance.toFixed(2),
              totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
              lastTransactionAt: new Date()
            });
            
            console.log(`✅ Fixed ${profile.fullName}: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
            fixedCount++;
          }
        } else {
          await storage.createCustomerWallet({
            customerId: profile.id,
            rewardPointBalance: 0,
            totalRewardPointsEarned: 0,
            totalRewardPointsSpent: 0,
            totalRewardPointsTransferred: 0,
            incomeBalance: totalStepUpPoints.toFixed(2),
            totalIncomeEarned: totalStepUpPoints.toFixed(2),
            totalIncomeSpent: "0.00",
            totalIncomeTransferred: "0.00",
            commerceBalance: "0.00",
            totalCommerceAdded: "0.00",
            totalCommerceSpent: "0.00",
            totalCommerceWithdrawn: "0.00"
          });
          
          console.log(`✅ Created wallet for ${profile.fullName}: ${totalStepUpPoints} points`);
          fixedCount++;
        }
      }
    }
    
    res.json({
      message: 'StepUp rewards test results',
      customersWithGlobalNumbers: customersWithGlobalNumbers.length,
      results: results,
      incomeWalletFixed: fixedCount,
      fixedMessage: fixedCount > 0 ? `Fixed Income Wallet for ${fixedCount} customers` : 'No Income Wallet fixes needed'
    });
    
  } catch (error) {
    console.error('❌ Error testing StepUp rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Trigger StepUp reward processing (no auth required for testing)
router.post('/trigger-stepup-processing', async (req, res) => {
  try {
    console.log('🔄 Triggering StepUp reward processing for all existing Global Numbers...');
    
    // Process all existing global numbers
    const rewards = await unifiedStepUpRewardSystem.processAllExistingGlobalNumbers();
    
    console.log(`🎉 Processed ${rewards.length} StepUp rewards from existing global numbers`);
    
    // Also fix Income Wallet for all customers with StepUp rewards
    console.log('🔧 Also fixing Income Wallet for customers with StepUp rewards...');
    const allProfiles = await storage.getAllCustomerProfiles();
    let fixedCount = 0;
    
    for (const profile of allProfiles) {
      const stepUpRewards = await storage.getCustomerStepUpRewards(profile.id);
      const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
      
      if (awardedRewards.length > 0) {
        const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
        let wallet = await storage.getCustomerWallet(profile.id);
        
        if (wallet) {
          const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
          if (currentIncomeBalance < totalStepUpPoints) {
            const missingPoints = totalStepUpPoints - currentIncomeBalance;
            const newIncomeBalance = currentIncomeBalance + missingPoints;
            const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
            
            await storage.updateCustomerWallet(profile.id, {
              incomeBalance: newIncomeBalance.toFixed(2),
              totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
              lastTransactionAt: new Date()
            });
            
            console.log(`✅ Fixed ${profile.fullName}: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
            fixedCount++;
          }
        } else {
          await storage.createCustomerWallet({
            customerId: profile.id,
            rewardPointBalance: 0,
            totalRewardPointsEarned: 0,
            totalRewardPointsSpent: 0,
            totalRewardPointsTransferred: 0,
            incomeBalance: totalStepUpPoints.toFixed(2),
            totalIncomeEarned: totalStepUpPoints.toFixed(2),
            totalIncomeSpent: "0.00",
            totalIncomeTransferred: "0.00",
            commerceBalance: "0.00",
            totalCommerceAdded: "0.00",
            totalCommerceSpent: "0.00",
            totalCommerceWithdrawn: "0.00"
          });
          
          console.log(`✅ Created wallet for ${profile.fullName}: ${totalStepUpPoints} points`);
          fixedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      rewardsProcessed: rewards.length,
      rewards: rewards,
      incomeWalletFixed: fixedCount,
      message: `🎉 Processed ${rewards.length} StepUp rewards and fixed Income Wallet for ${fixedCount} customers!`
    });
  } catch (error) {
    console.error('Error in trigger-stepup-processing:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Quick fix to update Income Wallet for all customers with StepUp rewards
router.post('/quick-fix-income-wallet', async (req, res) => {
  try {
    console.log('🔧 Quick fix: Updating Income Wallet for all customers with StepUp rewards...');
    
    const allProfiles = await storage.getAllCustomerProfiles();
    let fixedCount = 0;
    
    for (const profile of allProfiles) {
      const stepUpRewards = await storage.getCustomerStepUpRewards(profile.id);
      const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
      
      if (awardedRewards.length > 0) {
        const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
        let wallet = await storage.getCustomerWallet(profile.id);
        
        if (wallet) {
          const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
          if (currentIncomeBalance < totalStepUpPoints) {
            const missingPoints = totalStepUpPoints - currentIncomeBalance;
            const newIncomeBalance = currentIncomeBalance + missingPoints;
            const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
            
            await storage.updateCustomerWallet(profile.id, {
              incomeBalance: newIncomeBalance.toFixed(2),
              totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
              lastTransactionAt: new Date()
            });
            
            console.log(`✅ Fixed ${profile.fullName}: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
            fixedCount++;
          }
        } else {
          await storage.createCustomerWallet({
            customerId: profile.id,
            rewardPointBalance: 0,
            totalRewardPointsEarned: 0,
            totalRewardPointsSpent: 0,
            totalRewardPointsTransferred: 0,
            incomeBalance: totalStepUpPoints.toFixed(2),
            totalIncomeEarned: totalStepUpPoints.toFixed(2),
            totalIncomeSpent: "0.00",
            totalIncomeTransferred: "0.00",
            commerceBalance: "0.00",
            totalCommerceAdded: "0.00",
            totalCommerceSpent: "0.00",
            totalCommerceWithdrawn: "0.00"
          });
          
          console.log(`✅ Created wallet for ${profile.fullName}: ${totalStepUpPoints} points`);
          fixedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Fixed Income Wallet for ${fixedCount} customers`,
      fixedCount: fixedCount
    });
    
  } catch (error) {
    console.error('❌ Error in quick-fix-income-wallet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Debug endpoint to check StepUp system status (no auth required)
router.get('/debug-stepup-status', async (req, res) => {
  try {
    console.log('🔍 Debugging StepUp system status...');
    
    // Get all customer profiles
    const allProfiles = await storage.getAllCustomerProfiles();
    console.log(`📊 Found ${allProfiles.length} customer profiles`);
    
    // Get all customer serial numbers
    const allSerials = await storage.getAllCustomerSerialNumbers();
    console.log(`📊 Found ${allSerials.length} customer serial numbers`);
    
    // Check each customer
    const debugInfo = [];
    for (const profile of allProfiles) {
      const customerSerials = allSerials.filter(s => s.customerId === profile.id && s.isActive);
      const globalNumbers = customerSerials.map(s => s.globalSerialNumber).sort((a, b) => a - b);
      
      debugInfo.push({
        customerId: profile.id,
        fullName: profile.fullName,
        globalSerialNumber: profile.globalSerialNumber,
        customerSerials: customerSerials.length,
        globalNumbers: globalNumbers,
        serialNumbers: customerSerials
      });
    }
    
    res.json({
      message: 'StepUp system debug info',
      totalProfiles: allProfiles.length,
      totalSerials: allSerials.length,
      debugInfo: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Error debugging StepUp system:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Fix Income Wallet for customers with StepUp rewards but missing Income Wallet updates
// NEW: Calculate StepUp Reward Balance for all customers
router.post('/calculate-stepup-balances', async (req, res) => {
  try {
    console.log('🧮 Calculating StepUp Reward balances for all customers...');
    
    const allProfiles = await storage.getAllCustomerProfiles();
    const results = [];
    
    for (const profile of allProfiles) {
      const allTransactions = await storage.getCustomerPointTransactions(profile.id);
      const stepUpTransactions = allTransactions.filter(t => 
        t.transactionType === 'reward' && 
        t.description && 
        t.description.includes('StepUp Reward')
      );
      
      const stepUpRewardBalance = stepUpTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
      
      results.push({
        customerId: profile.id,
        fullName: profile.fullName,
        stepUpRewardBalance: stepUpRewardBalance,
        totalStepUpRewards: stepUpTransactions.length,
        stepUpTransactions: stepUpTransactions
      });
    }
    
    res.json({
      success: true,
      results: results,
      totalCustomers: allProfiles.length,
      message: `🧮 Calculated StepUp balances for ${allProfiles.length} customers!`
    });
    
  } catch (error) {
    console.error('❌ Error calculating StepUp balances:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// NEW: Fix Income Wallet for authenticated customer with StepUp rewards
router.post('/fix-my-income-wallet', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    console.log('🔧 Fixing Income Wallet for current customer...');
    
    // Get StepUp rewards for this customer
    const stepUpRewards = await storage.getCustomerStepUpRewards(customerId);
    const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
    
    if (awardedRewards.length === 0) {
      return res.json({
        success: true,
        message: 'No StepUp rewards found for this customer'
      });
    }
    
    const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
    let wallet = await storage.getCustomerWallet(customerId);
    
    if (wallet) {
      const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
      if (currentIncomeBalance < totalStepUpPoints) {
        const missingPoints = totalStepUpPoints - currentIncomeBalance;
        const newIncomeBalance = currentIncomeBalance + missingPoints;
        const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
        
        await storage.updateCustomerWallet(customerId, {
          incomeBalance: newIncomeBalance.toFixed(2),
          totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
          lastTransactionAt: new Date()
        });
        
        console.log(`✅ Fixed customer: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
        
        res.json({
          success: true,
          message: `Fixed Income Wallet: Added ${missingPoints} points (Total: ${totalStepUpPoints})`,
          incomeBalance: newIncomeBalance,
          totalIncomeEarned: newTotalIncomeEarned
        });
      } else {
        res.json({
          success: true,
          message: 'Income Wallet is already up to date',
          incomeBalance: currentIncomeBalance,
          totalIncomeEarned: wallet.totalIncomeEarned
        });
      }
    } else {
      await storage.createCustomerWallet({
        customerId: customerId,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: totalStepUpPoints.toFixed(2),
        totalIncomeEarned: totalStepUpPoints.toFixed(2),
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });
      
      console.log(`✅ Created wallet for customer: ${totalStepUpPoints} points`);
      
      res.json({
        success: true,
        message: `Created Income Wallet with ${totalStepUpPoints} points`,
        incomeBalance: totalStepUpPoints,
        totalIncomeEarned: totalStepUpPoints
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing Income Wallet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Manual fix for specific customer - Mazaharul Shohan
router.post('/fix-mazharul-income-wallet', async (req, res) => {
  try {
    console.log('🔧 Manually fixing Income Wallet for Mazaharul Shohan...');
    
    // Find Mazaharul Shohan
    const allProfiles = await storage.getAllCustomerProfiles();
    const mazharul = allProfiles.find(p => p.fullName === 'Mazaharul Shohan');
    
    if (!mazharul) {
      return res.status(404).json({ error: 'Mazaharul Shohan not found' });
    }
    
    // Get StepUp rewards for Mazaharul
    const stepUpRewards = await storage.getCustomerStepUpRewards(mazharul.id);
    const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
    
    console.log(`📊 Found ${awardedRewards.length} awarded StepUp rewards for Mazaharul`);
    
    if (awardedRewards.length > 0) {
      // Calculate total StepUp reward points
      const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
      console.log(`💰 Total StepUp points for Mazaharul: ${totalStepUpPoints}`);
      
      // Get or create wallet
      let wallet = await storage.getCustomerWallet(mazharul.id);
      
      if (wallet) {
        const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
        console.log(`📊 Current Income Balance: ${currentIncomeBalance}`);
        
        if (currentIncomeBalance < totalStepUpPoints) {
          // Update Income Wallet with missing StepUp rewards
          const missingPoints = totalStepUpPoints - currentIncomeBalance;
          const newIncomeBalance = currentIncomeBalance + missingPoints;
          const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
          
          await storage.updateCustomerWallet(mazharul.id, {
            incomeBalance: newIncomeBalance.toFixed(2),
            totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
            lastTransactionAt: new Date()
          });
          
          console.log(`✅ Fixed Income Wallet for Mazaharul: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
          
          res.json({
            success: true,
            message: `Fixed Income Wallet for Mazaharul Shohan: Added ${missingPoints} points`,
            customerName: mazharul.fullName,
            totalStepUpPoints: totalStepUpPoints,
            missingPoints: missingPoints,
            newIncomeBalance: newIncomeBalance.toFixed(2)
          });
        } else {
          console.log(`✅ Mazaharul Income Wallet is already correct: ${currentIncomeBalance} points`);
          res.json({
            success: true,
            message: `Mazaharul Income Wallet is already correct: ${currentIncomeBalance} points`,
            customerName: mazharul.fullName,
            currentIncomeBalance: currentIncomeBalance
          });
        }
      } else {
        // Create wallet with StepUp rewards
        wallet = await storage.createCustomerWallet({
          customerId: mazharul.id,
          rewardPointBalance: 0,
          totalRewardPointsEarned: 0,
          totalRewardPointsSpent: 0,
          totalRewardPointsTransferred: 0,
          incomeBalance: totalStepUpPoints.toFixed(2),
          totalIncomeEarned: totalStepUpPoints.toFixed(2),
          totalIncomeSpent: "0.00",
          totalIncomeTransferred: "0.00",
          commerceBalance: "0.00",
          totalCommerceAdded: "0.00",
          totalCommerceSpent: "0.00",
          totalCommerceWithdrawn: "0.00"
        });
        
        console.log(`✅ Created Income Wallet for Mazaharul: ${totalStepUpPoints} points`);
        
        res.json({
          success: true,
          message: `Created Income Wallet for Mazaharul Shohan: ${totalStepUpPoints} points`,
          customerName: mazharul.fullName,
          totalStepUpPoints: totalStepUpPoints
        });
      }
    } else {
      res.json({
        success: false,
        message: 'No awarded StepUp rewards found for Mazaharul Shohan',
        customerName: mazharul.fullName
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing Mazaharul Income Wallet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Assign Global Number to current customer for testing
router.post('/assign-global-number', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const { globalNumber } = req.body;
    
    if (!globalNumber) {
      return res.status(400).json({ error: 'Global number is required' });
    }
    
    // Get customer profile
    const profile = await storage.getCustomerProfileById(customerId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    // Update customer profile with Global Number
    await storage.updateCustomerProfile(profile.userId, {
      globalSerialNumber: globalNumber
    });
    
    console.log(`✅ Assigned Global Number ${globalNumber} to customer ${profile.fullName}`);
    
    // Process StepUp rewards for Global Number 5 to trigger rewards
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
    console.log(`✅ Processed ${rewards.length} StepUp rewards`);
    
    res.json({
      message: `Global Number ${globalNumber} assigned successfully`,
      globalNumber: globalNumber,
      stepUpRewardsProcessed: rewards.length
    });
    
  } catch (error) {
    console.error('❌ Error assigning Global Number:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Quick fix: Assign Global Number 1 to current customer and trigger StepUp rewards
router.post('/quick-fix-stepup', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    
    // Get customer profile
    const profile = await storage.getCustomerProfileById(customerId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    console.log(`🔧 Quick fix: Assigning Global Number 1 to customer ${profile.fullName}`);
    
    // Update customer profile with Global Number 1
    await storage.updateCustomerProfile(profile.userId, {
      globalSerialNumber: 1
    });
    
    // Process StepUp rewards for Global Number 5 to trigger rewards for Global Number 1
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
    console.log(`✅ Processed ${rewards.length} StepUp rewards`);
    
    // Get the customer's StepUp rewards
    const customerRewards = await unifiedStepUpRewardSystem.getCustomerStepUpRewards(customerId);
    const totalEarned = customerRewards.reduce((sum, r) => sum + r.rewardPoints, 0);
    
    res.json({
      message: 'Quick fix applied successfully!',
      customerName: profile.fullName,
      globalNumber: 1,
      stepUpRewardsProcessed: rewards.length,
      customerStepUpRewards: customerRewards.length,
      totalStepUpPoints: totalEarned,
      rewards: customerRewards
    });
    
  } catch (error) {
    console.error('❌ Error in quick fix:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Assign multiple Global Numbers to Samin for testing
router.post('/assign-samin-global-numbers', async (req, res) => {
  try {
    console.log('🎯 Assigning multiple Global Numbers to Samin...');
    
    // Find Samin's profile or create if not exists
    let allProfiles = await storage.getAllCustomerProfiles();
    let saminProfile = allProfiles.find(p => p.fullName === 'samin sadat');
    
    if (!saminProfile) {
      console.log('👤 Creating Samin as a new customer...');
      
      // Create Samin as a user
      const hashedPassword = await bcrypt.hash('samin123', 10);
      const saminUser = await storage.createUser({
        username: 'samin',
        email: 'samin@test.com',
        password: hashedPassword,
        firstName: 'Samin',
        lastName: 'Sadat',
        role: 'customer',
        country: 'BD',
        phone: '+8801234567890'
      });
      
      // Create Samin's customer profile
      saminProfile = await storage.createCustomerProfile({
        userId: saminUser.id,
        uniqueAccountNumber: 'SAMIN001',
        mobileNumber: '+8801234567890',
        email: saminUser.email,
        fullName: 'samin sadat',
        profileComplete: true,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
        accumulatedPoints: 0,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: 'bronze',
        isActive: true
      });
      
      // Create Samin's wallet
      await storage.createCustomerWallet({
        customerId: saminProfile.id,
        rewardPointBalance: 0,
        totalRewardPointsEarned: 0,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: "0.00",
        totalIncomeEarned: "0.00",
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });
      
      console.log(`✅ Created Samin: ${saminProfile.fullName} (ID: ${saminProfile.id})`);
    }
    
    console.log(`✅ Found Samin: ${saminProfile.fullName} (ID: ${saminProfile.id})`);
    
    // Assign Global Numbers 1, 2, 3 to Samin
    const globalNumbers = [1, 2, 3];
    const assignedNumbers = [];
    
    for (const globalNumber of globalNumbers) {
      // Create customer serial number record
      await storage.createCustomerSerialNumber({
        customerId: saminProfile.id,
        globalSerialNumber: globalNumber,
        localSerialNumber: globalNumber,
        totalSerialCount: 1,
        pointsAtSerial: 1500,
        isActive: true
      });
      
      assignedNumbers.push(globalNumber);
      console.log(`✅ Assigned Global Number ${globalNumber} to Samin`);
    }
    
    // Process StepUp rewards for Global Number 5 to trigger rewards for Global Numbers 1, 2, 3
    console.log('🎯 Processing StepUp rewards for Global Number 5...');
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(5);
    console.log(`✅ Processed ${rewards.length} StepUp rewards`);
    
    // Get Samin's StepUp rewards
    const saminRewards = await unifiedStepUpRewardSystem.getCustomerStepUpRewards(saminProfile.id);
    const totalEarned = saminRewards.reduce((sum, r) => sum + r.rewardPoints, 0);
    
    res.json({
      message: 'Samin Global Numbers assigned successfully!',
      customerName: saminProfile.fullName,
      assignedGlobalNumbers: assignedNumbers,
      stepUpRewardsProcessed: rewards.length,
      saminStepUpRewards: saminRewards.length,
      totalStepUpPoints: totalEarned,
      rewards: saminRewards
    });
    
  } catch (error) {
    console.error('❌ Error assigning Samin Global Numbers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create referral relationship manually (for testing)
router.post('/create-referral-relationship', async (req, res) => {
  try {
    const { referrerId, referredId, referralCode } = req.body;
    
    if (!referrerId || !referredId || !referralCode) {
      return res.status(400).json({ error: 'Referrer ID, referred ID, and referral code are required' });
    }
    
    await storage.createCustomerReferral({
      referrerId,
      referredId,
      referralCode,
      commissionRate: "5.00",
      totalPointsEarned: 0,
      totalCommissionEarned: "0.00"
    });
    
    res.json({
      success: true,
      message: 'Referral relationship created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create a working referral relationship between demo customers
router.post('/create-demo-referral', async (req, res) => {
  try {
    // Get all customer profiles
    const allProfiles = await storage.getAllCustomerProfiles();
    console.log('🔍 All customer profiles:', allProfiles.map(p => ({ email: p.email, id: p.id, name: p.fullName })));
    
    if (allProfiles.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 customers to create referral relationship' });
    }
    
    // Use first customer as referrer, second as referred
    const referrerProfile = allProfiles[0];
    const referredProfile = allProfiles[1];
    
    console.log('🔍 Referrer:', referrerProfile.fullName, referrerProfile.id);
    console.log('🔍 Referred:', referredProfile.fullName, referredProfile.id);
    
    // Get referrer's referral code
    const referralCode = await storage.ensureCustomerHasReferralCode(referrerProfile.id);
    console.log('🔗 Referral Code:', referralCode);
    
    // Create referral relationship
    await storage.createCustomerReferral({
      referrerId: referrerProfile.id,
      referredId: referredProfile.id,
      referralCode: referralCode,
      commissionRate: "5.00",
      totalPointsEarned: 500, // Simulate referred customer earning 500 points
      totalCommissionEarned: "25.00" // 5% of 500 = 25 points
    });
    
    // Manually trigger commission calculation
    await storage.calculateReferralCommission(referredProfile.id, 500);
    
    res.json({
      success: true,
      message: 'Demo referral relationship created successfully',
      referrer: referrerProfile.fullName,
      referred: referredProfile.fullName,
      referrerId: referrerProfile.id,
      referredId: referredProfile.id,
      referralCode: referralCode,
      commissionEarned: 25
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Debug endpoint to check referral relationships
router.get('/debug-referrals', async (req, res) => {
  try {
    const allProfiles = await storage.getAllCustomerProfiles();
    const allReferrals = await storage.getAllCustomerReferrals();
    const allWalletTransactions = await storage.getAllCustomerWalletTransactions();

    res.json({
      referrals: allReferrals.map(r => ({
        id: r.id,
        referrerId: r.referrerId,
        referredId: r.referredId,
        referralCode: r.referralCode,
        commissionRate: r.commissionRate,
        totalPointsEarned: r.totalPointsEarned,
        totalCommissionEarned: r.totalCommissionEarned
      })),
      profiles: allProfiles.map(p => ({
        id: p.id,
        email: p.email,
        fullName: p.fullName,
        referralCode: p.referralCode || "N/A"
      })),
      walletTransactions: allWalletTransactions.filter(tx => tx.metadata?.commissionType === 'affiliate_referral').map(tx => ({
        id: tx.id,
        customerId: tx.customerId,
        amount: tx.amount,
        description: tx.description,
        metadata: tx.metadata
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Debug endpoint to check customer wallet by ID
router.get('/debug-wallet/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const wallet = await storage.getCustomerWallet(customerId);
    const profile = await storage.getCustomerProfile(customerId);
    
    res.json({
      customerId,
      profile: profile ? {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email
      } : null,
      wallet: wallet ? {
        rewardPointBalance: wallet.rewardPointBalance,
        incomeBalance: wallet.incomeBalance,
        totalIncomeEarned: wallet.totalIncomeEarned,
        totalRewardPointsEarned: wallet.totalRewardPointsEarned
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Clear all customer data (for testing purposes)
router.post('/clear-all-customers', async (req, res) => {
  try {
    console.log('🗑️ Clearing all customer data...');
    
    // Get all customer profiles
    const allProfiles = await storage.getAllCustomerProfiles();
    console.log(`📊 Found ${allProfiles.length} customer profiles to clear`);
    
    // Clear all customer-related data
    let clearedCount = 0;
    
    for (const profile of allProfiles) {
      try {
        // Clear customer profile
        await storage.deleteCustomerProfile(profile.id);
        
        // Clear user account
        await storage.deleteUser(profile.userId);
        
        // Clear customer wallet
        await storage.deleteCustomerWallet(profile.id);
        
        // Clear customer transactions
        await storage.deleteCustomerTransactions(profile.id);
        
        // Clear customer transfers
        await storage.deleteCustomerTransfers(profile.id);
        
        // Clear customer purchases
        await storage.deleteCustomerPurchases(profile.id);
        
        // Clear customer referrals
        await storage.deleteCustomerReferrals(profile.id);
        
        // Clear customer serial numbers
        await storage.deleteCustomerSerialNumbers(profile.id);
        
        // Clear customer rewards
        await storage.deleteCustomerRewards(profile.id);
        
        // Clear customer affiliate links
        await storage.deleteCustomerAffiliateLinks(profile.id);
        
        // Clear customer daily logins
        await storage.deleteCustomerDailyLogins(profile.id);
        
        // Clear customer birthday points
        await storage.deleteCustomerBirthdayPoints(profile.id);
        
        // Clear shopping vouchers
        await storage.deleteShoppingVouchers(profile.id);
        
        // Clear wallet transactions
        await storage.deleteCustomerWalletTransactions(profile.id);
        
        // Clear wallet transfers
        await storage.deleteCustomerWalletTransfers(profile.id);
        
        // Clear referral commissions
        await storage.deleteCustomerReferralCommissions(profile.id);
        
        // Clear waste management rewards
        await storage.deleteWasteManagementRewards(profile.id);
        
        // Clear medical facility benefits
        await storage.deleteMedicalFacilityBenefits(profile.id);
        
        clearedCount++;
        console.log(`✅ Cleared customer: ${profile.fullName}`);
        
      } catch (error) {
        console.error(`❌ Error clearing customer ${profile.fullName}:`, error);
      }
    }
    
    // Reset global number counter
    await storage.resetGlobalNumberCounter();
    
    // Clear all merchant-customer relationships
    await storage.clearAllMerchantCustomers();
    
    // Clear all blocked customer records
    await storage.clearAllBlockedCustomers();
    
    console.log(`🎉 Successfully cleared ${clearedCount} customers`);
    console.log('🗑️ Cleared all merchant-customer relationships');
    console.log('🗑️ Cleared all blocked customer records');
    
    res.json({
      message: 'All customer data cleared successfully',
      clearedCustomers: clearedCount,
      clearedMerchantCustomers: true,
      clearedBlockedCustomers: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error clearing customer data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create a new customer manually
router.post('/create-customer', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    console.log(`👤 Creating new customer: ${firstName} ${lastName}`);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await storage.createUser({
      username: email.split('@')[0],
      email: email,
      password: hashedPassword,
      firstName: firstName,
      lastName: lastName,
      role: 'customer',
      country: 'BD',
      phone: phone
    });
    
    // Create customer profile
    const customerProfile = await storage.createCustomerProfile({
      userId: user.id,
      uniqueAccountNumber: await storage.generateUniqueAccountNumber(),
      mobileNumber: phone,
      email: user.email,
      fullName: `${firstName} ${lastName}`,
      profileComplete: true,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      accumulatedPoints: 0,
      globalSerialNumber: 0,
      localSerialNumber: 0,
      tier: 'bronze',
      isActive: true
    });
    
    // Create customer wallet
    await storage.createCustomerWallet({
      customerId: customerProfile.id,
      rewardPointBalance: 0,
      totalRewardPointsEarned: 0,
      totalRewardPointsSpent: 0,
      totalRewardPointsTransferred: 0,
      incomeBalance: "0.00",
      totalIncomeEarned: "0.00",
      totalIncomeSpent: "0.00",
      totalIncomeTransferred: "0.00",
      commerceBalance: "0.00",
      totalCommerceAdded: "0.00",
      totalCommerceSpent: "0.00",
      totalCommerceWithdrawn: "0.00"
    });
    
    console.log(`✅ Created customer: ${customerProfile.fullName} (ID: ${customerProfile.id})`);
    
    res.json({
      message: 'Customer created successfully',
      customer: {
        id: customerProfile.id,
        fullName: customerProfile.fullName,
        email: user.email,
        phone: phone,
        accountNumber: customerProfile.uniqueAccountNumber
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Assign Global Number to a customer
router.post('/assign-global-number-to-customer', async (req, res) => {
  try {
    const { customerId, globalNumber } = req.body;
    
    if (!customerId || !globalNumber) {
      return res.status(400).json({ error: 'Customer ID and Global Number are required' });
    }
    
    console.log(`🎯 Assigning Global Number ${globalNumber} to customer ${customerId}`);
    
    // Get customer profile
    const profile = await storage.getCustomerProfileById(customerId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Create customer serial number record
    await storage.createCustomerSerialNumber({
      customerId: customerId,
      globalSerialNumber: globalNumber,
      localSerialNumber: globalNumber,
      totalSerialCount: 1,
      pointsAtSerial: 1500,
      isActive: true
    });
    
    // Update customer profile with latest Global Number
    await storage.updateCustomerProfile(profile.userId, {
      globalSerialNumber: globalNumber
    });
    
    console.log(`✅ Assigned Global Number ${globalNumber} to ${profile.fullName}`);
    
    // Process StepUp rewards for this Global Number
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(globalNumber);
    console.log(`✅ Processed ${rewards.length} StepUp rewards`);
    
    res.json({
      message: 'Global Number assigned successfully',
      customerName: profile.fullName,
      globalNumber: globalNumber,
      stepUpRewardsProcessed: rewards.length
    });
    
  } catch (error) {
    console.error('❌ Error assigning Global Number:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get all customers
router.get('/all-customers', async (req, res) => {
  try {
    const allProfiles = await storage.getAllCustomerProfiles();
    
    const customers = allProfiles.map(profile => ({
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.mobileNumber,
      accountNumber: profile.uniqueAccountNumber,
      globalSerialNumber: profile.globalSerialNumber,
      totalPointsEarned: profile.totalPointsEarned,
      currentPointsBalance: profile.currentPointsBalance
    }));
    
    res.json({
      message: 'All customers retrieved successfully',
      customers: customers,
      totalCount: customers.length
    });
    
  } catch (error) {
    console.error('❌ Error getting customers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get Global Number system configuration
router.get('/global-number-config', authenticateToken, async (req, res) => {
  try {
    const config = await storage.getGlobalNumberConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Initialize StepUp Rewards for all existing Global Numbers
router.post('/initialize-stepup-rewards', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Initializing StepUp Rewards for all existing Global Numbers...');
    
    // Using static import
    const rewards = await unifiedStepUpRewardSystem.processAllExistingGlobalNumbers();
    
    console.log(`✅ StepUp Rewards initialization completed: ${rewards.length} rewards processed`);
    
    res.json({
      success: true,
      message: `StepUp Rewards initialized successfully`,
      rewardsProcessed: rewards.length,
      rewards: rewards.map(r => ({
        recipientGlobalNumber: r.recipientGlobalNumber,
        rewardPoints: r.rewardPoints,
        formula: `${r.recipientGlobalNumber}×${r.multiplier}=${r.triggerGlobalNumber}`
      }))
    });
  } catch (error) {
    console.error('❌ Error initializing StepUp Rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// EMERGENCY FIX: Manual StepUp Reward Trigger
router.post('/trigger-stepup-rewards', authenticateToken, async (req, res) => {
  try {
    const { globalNumber } = req.body;
    
    if (!globalNumber || globalNumber < 1) {
      return res.status(400).json({ error: 'Valid global number required' });
    }
    
    console.log(`🚨 EMERGENCY: Manually triggering StepUp rewards for Global Number ${globalNumber}`);
    
    // Using static import
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(globalNumber);
    
    console.log(`✅ Manual trigger completed: ${rewards.length} rewards awarded for Global Number ${globalNumber}`);
    
    res.json({
      success: true,
      globalNumber: globalNumber,
      rewardsAwarded: rewards.length,
      rewards: rewards.map(r => ({
        recipientGlobalNumber: r.recipientGlobalNumber,
        rewardPoints: r.rewardPoints,
        formula: `${r.recipientGlobalNumber}×${r.multiplier}=${r.triggerGlobalNumber}`
      }))
    });
  } catch (error) {
    console.error('❌ Error manually triggering StepUp Rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// EMERGENCY FIX: Force award StepUp reward to current customer
router.post('/force-award-stepup-reward', authenticateToken, async (req, res) => {
  try {
    const { globalNumber, rewardPoints } = req.body;
    
    if (!globalNumber || !rewardPoints) {
      return res.status(400).json({ error: 'Global number and reward points required' });
    }
    
    console.log(`🚨 FORCE AWARDING: ${rewardPoints} StepUp reward points to customer`);
    
    const customerId = await getCustomerId(req.user.userId);
    const profile = await storage.getCustomerProfileById(customerId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    // Force award the StepUp reward (only to totalRewardPointsEarned, not loyalty points)
    await storage.updateCustomerProfile(profile.userId, {
      totalPointsEarned: profile.totalPointsEarned + rewardPoints
    });
    
    // Create transaction record
    await storage.createCustomerPointTransaction({
      customerId: customerId,
      merchantId: 'system',
      points: rewardPoints,
      transactionType: 'reward', // StepUp rewards are rewards, not earned points
      description: `EMERGENCY FIX: StepUp Reward for Global #${globalNumber}`,
      balanceBefore: profile.currentPointsBalance,
      balanceAfter: profile.currentPointsBalance // Loyalty points remain unchanged
    });
    
    // Create StepUp reward record
    await storage.createStepUpReward({
      recipientCustomerId: customerId,
      recipientGlobalNumber: globalNumber,
      triggerGlobalNumber: globalNumber * 5, // Assuming 5x multiplier
      multiplier: 5,
      rewardPoints: rewardPoints,
      isAwarded: true,
      awardedAt: new Date()
    });
    
    console.log(`✅ FORCE AWARDED: ${rewardPoints} points to customer ${profile.fullName}`);
    
    res.json({
      success: true,
      message: `Force awarded ${rewardPoints} StepUp reward points`,
      customerName: profile.fullName,
      globalNumber: globalNumber,
      rewardPoints: rewardPoints,
      newBalance: profile.currentPointsBalance + rewardPoints
    });
    
  } catch (error) {
    console.error('❌ Error force awarding StepUp Reward:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Manual Global Number eligibility check (for testing)
router.post('/check-global-number-eligibility', authenticateToken, async (req, res) => {
  try {
    const { points, isRewardPoints = false } = req.body;
    const customerId = await getCustomerId(req.user.userId);
    
    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Valid points amount required' });
    }

    await storage.initializeStepUpConfig();
    
    // Use the GlobalNumberSystem for consistent StepUp reward processing
    const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
    const result = await globalNumberSystem.checkAndAssignGlobalNumber(
      req.user.userId,
      points,
      isRewardPoints
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Test endpoint to simulate earning points (for testing Global Number system)
router.post('/test-earn-points', authenticateToken, async (req, res) => {
  try {
    const { points = 1500 } = req.body;
    const customerId = await getCustomerId(req.user.userId);
    
    console.log(`🧪 Testing: Adding ${points} points to customer ${customerId}`);
    
    // Get current customer profile
    const profile = await storage.getCustomerProfile(req.user.userId);
    console.log(`📊 Current profile:`, {
      accumulatedPoints: profile?.accumulatedPoints || 0,
      globalSerialNumber: profile?.globalSerialNumber || 0,
      totalPointsEarned: profile?.totalPointsEarned || 0
    });
    
    await storage.initializeStepUpConfig();
    
    // Use the GlobalNumberSystem for consistent StepUp reward processing
    const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
    const result = await globalNumberSystem.checkAndAssignGlobalNumber(
      req.user.userId,
      points,
      false // These are earned points
    );

    // Note: Wallet is updated inside checkAndAssignGlobalNumber, no need to update here

    // Get updated profile
    const updatedProfile = await storage.getCustomerProfile(req.user.userId);
    console.log(`📊 Updated profile:`, {
      accumulatedPoints: updatedProfile?.accumulatedPoints || 0,
      globalSerialNumber: updatedProfile?.globalSerialNumber || 0,
      totalPointsEarned: updatedProfile?.totalPointsEarned || 0
    });

    res.json({
      success: true,
      pointsAdded: points,
      globalNumberResult: result,
      updatedProfile: {
        accumulatedPoints: updatedProfile?.accumulatedPoints || 0,
        globalSerialNumber: updatedProfile?.globalSerialNumber || 0,
        totalPointsEarned: updatedProfile?.totalPointsEarned || 0
      },
      message: result.globalNumberAssigned 
        ? `🎉 Global Number ${result.globalNumber} awarded!` 
        : `Points added. Need ${1500 - (updatedProfile?.accumulatedPoints || 0)} more points for Global Number.`
    });
  } catch (error) {
    console.error('Error in test-earn-points:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Test endpoint to simulate multiple global numbers for StepUp testing
router.post('/test-create-global-numbers', authenticateToken, async (req, res) => {
  try {
    const { count = 5 } = req.body;
    const customerId = await getCustomerId(req.user.userId);
    
    console.log(`🧪 Testing: Creating ${count} global numbers to trigger StepUp rewards`);
    
    // Get current customer profile
    const profile = await storage.getCustomerProfile(req.user.userId);
    console.log(`📊 Current profile:`, {
      globalSerialNumber: profile?.globalSerialNumber || 0,
      currentPointsBalance: profile?.currentPointsBalance || 0
    });
    
    await storage.initializeStepUpConfig();
    
    // Use the GlobalNumberSystem to create multiple global numbers
    const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
    
    const results = [];
    let totalStepUpRewards = [];
    
    // Add points in batches of 1500 to create multiple global numbers
    for (let i = 0; i < count; i++) {
      console.log(`🎯 Creating global number ${i + 1}/${count}`);
      
      const result = await globalNumberSystem.checkAndAssignGlobalNumber(
        req.user.userId,
        1500, // 1500 points per global number
        false // These are earned points
      );
      
      results.push(result);
      totalStepUpRewards.push(...result.stepUpRewards);
      
      console.log(`📊 Global Number ${i + 1} result:`, {
        globalNumberAssigned: result.globalNumberAssigned,
        globalNumber: result.globalNumber,
        stepUpRewards: result.stepUpRewards.length
      });
    }

    // Get updated profile
    const updatedProfile = await storage.getCustomerProfile(req.user.userId);
    console.log(`📊 Final profile:`, {
      globalSerialNumber: updatedProfile?.globalSerialNumber || 0,
      currentPointsBalance: updatedProfile?.currentPointsBalance || 0,
      globalRewardNumbers: updatedProfile?.globalRewardNumbers || 0
    });

    res.json({
      success: true,
      globalNumbersCreated: count,
      results: results,
      totalStepUpRewards: totalStepUpRewards,
      updatedProfile: {
        globalSerialNumber: updatedProfile?.globalSerialNumber || 0,
        currentPointsBalance: updatedProfile?.currentPointsBalance || 0,
        globalRewardNumbers: updatedProfile?.globalRewardNumbers || 0
      },
      message: `🎉 Created ${count} global numbers! StepUp rewards: ${totalStepUpRewards.length}`
    });
  } catch (error) {
    console.error('Error in test-create-global-numbers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Test endpoint to manually trigger StepUp rewards for testing
router.post('/test-trigger-stepup-rewards', authenticateToken, async (req, res) => {
  try {
    const { globalNumber = 5 } = req.body;
    
    console.log(`🧪 Testing: Manually triggering StepUp rewards for Global Number ${globalNumber}`);
    
    // Using static import
    const rewards = await unifiedStepUpRewardSystem.processNewGlobalNumber(globalNumber);
    
    console.log(`🎁 StepUp rewards triggered: ${rewards.length} rewards awarded`);
    
    res.json({
      success: true,
      globalNumber: globalNumber,
      rewardsAwarded: rewards.length,
      rewards: rewards,
      message: `🎉 Triggered StepUp rewards for Global Number ${globalNumber}! ${rewards.length} rewards awarded.`
    });
  } catch (error) {
    console.error('Error in test-trigger-stepup-rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Debug endpoint to check current system state
router.get('/debug-stepup-system', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const profile = await storage.getCustomerProfile(req.user.userId);
    
    // Get all customers with global numbers
    // Using static import
    const allCustomers = await stepUpRewardSystem.getAllCustomersWithGlobalNumbers();
    
    // Get current StepUp rewards
    const stepUpRewards = await stepUpRewardSystem.getCustomerStepUpRewards(customerId);
    
    res.json({
      currentCustomer: {
        id: customerId,
        globalSerialNumber: profile?.globalSerialNumber || 0,
        currentPointsBalance: profile?.currentPointsBalance || 0
      },
      allCustomersWithGlobalNumbers: allCustomers,
      currentStepUpRewards: stepUpRewards,
      totalStepUpRewards: stepUpRewards.length
    });
  } catch (error) {
    console.error('Error in debug-stepup-system:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Process existing global numbers to trigger missed StepUp rewards
router.post('/process-existing-stepup-rewards', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Processing existing global numbers for missed StepUp rewards...');
    
    // Using unified system
    const rewards = await unifiedStepUpRewardSystem.processAllExistingGlobalNumbers();
    
    console.log(`🎉 Processed ${rewards.length} StepUp rewards from existing global numbers`);
    
    // Also fix Income Wallet for all customers with StepUp rewards
    console.log('🔧 Also fixing Income Wallet for customers with StepUp rewards...');
    const allProfiles = await storage.getAllCustomerProfiles();
    let fixedCount = 0;
    
    for (const profile of allProfiles) {
      const stepUpRewards = await storage.getCustomerStepUpRewards(profile.id);
      const awardedRewards = stepUpRewards.filter(r => r.isAwarded);
      
      if (awardedRewards.length > 0) {
        const totalStepUpPoints = awardedRewards.reduce((sum, reward) => sum + reward.rewardPoints, 0);
        let wallet = await storage.getCustomerWallet(profile.id);
        
        if (wallet) {
          const currentIncomeBalance = parseFloat(wallet.incomeBalance || '0');
          if (currentIncomeBalance < totalStepUpPoints) {
            const missingPoints = totalStepUpPoints - currentIncomeBalance;
            const newIncomeBalance = currentIncomeBalance + missingPoints;
            const newTotalIncomeEarned = parseFloat(wallet.totalIncomeEarned || '0') + missingPoints;
            
            await storage.updateCustomerWallet(profile.id, {
              incomeBalance: newIncomeBalance.toFixed(2),
              totalIncomeEarned: newTotalIncomeEarned.toFixed(2),
              lastTransactionAt: new Date()
            });
            
            console.log(`✅ Fixed ${profile.fullName}: Added ${missingPoints} points (Total: ${totalStepUpPoints})`);
            fixedCount++;
          }
        } else {
          await storage.createCustomerWallet({
            customerId: profile.id,
            rewardPointBalance: 0,
            totalRewardPointsEarned: 0,
            totalRewardPointsSpent: 0,
            totalRewardPointsTransferred: 0,
            incomeBalance: totalStepUpPoints.toFixed(2),
            totalIncomeEarned: totalStepUpPoints.toFixed(2),
            totalIncomeSpent: "0.00",
            totalIncomeTransferred: "0.00",
            commerceBalance: "0.00",
            totalCommerceAdded: "0.00",
            totalCommerceSpent: "0.00",
            totalCommerceWithdrawn: "0.00"
          });
          
          console.log(`✅ Created wallet for ${profile.fullName}: ${totalStepUpPoints} points`);
          fixedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      rewardsProcessed: rewards.length,
      rewards: rewards,
      incomeWalletFixed: fixedCount,
      message: `🎉 Processed ${rewards.length} StepUp rewards and fixed Income Wallet for ${fixedCount} customers!`
    });
  } catch (error) {
    console.error('Error in process-existing-stepup-rewards:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Dev-only: Trigger Infinity Reward cycle for the authenticated customer
if (process.env.NODE_ENV === 'development') {
  router.post('/infinity/test-process', authenticateToken, async (req, res) => {
    try {
      const { infinityRewardSystem } = await import('./services/InfinityRewardSystem');
      const eligibility = await infinityRewardSystem.checkInfinityEligibility(req.user.userId);
      if (!eligibility.isEligible) {
        return res.status(400).json({ success: false, reason: eligibility.reason, currentPoints: eligibility.currentPoints });
      }
      const result = await infinityRewardSystem.processInfinityCycle(req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
    }
  });

  // Dev-only: Seed a test customer bypassing QR and optionally pre-load points
  router.post('/seed/test-customer', async (req, res) => {
    try {
      const { email, password = 'customer123', fullName = 'Test Customer', mobileNumber = '+8801000000000', initialPoints = 0 } = req.body || {};
      if (!email) return res.status(400).json({ error: 'email is required' });

      // Create or fetch user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        const hashed = await bcrypt.hash(password, 10);
        user = await storage.createUser({
          email,
          password: hashed,
          role: 'customer',
          username: email.split('@')[0] + '_' + Date.now(),
          firstName: fullName.split(' ')[0] || fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || '',
          country: 'BD',
          phone: mobileNumber
        });
      }

      // Ensure profile and wallet
      let profile = await storage.getCustomerProfile(user.id);
      if (!profile) {
        const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
        profile = await storage.createCustomerProfile({
          userId: user.id,
          uniqueAccountNumber,
          mobileNumber,
          email,
          fullName,
          profileComplete: false,
          totalPointsEarned: 0,
          currentPointsBalance: 0,
          accumulatedPoints: 0,
          globalSerialNumber: 0,
          localSerialNumber: 0,
          tier: 'bronze',
          isActive: true
        });
        await storage.createCustomerWallet({
          customerId: profile.id,
          rewardPointBalance: 0,
          totalRewardPointsEarned: 0,
          totalRewardPointsSpent: 0,
          totalRewardPointsTransferred: 0,
          incomeBalance: "0.00",
          totalIncomeEarned: "0.00",
          totalIncomeSpent: "0.00",
          totalIncomeTransferred: "0.00",
          commerceBalance: "0.00",
          totalCommerceAdded: "0.00",
          totalCommerceSpent: "0.00",
          totalCommerceWithdrawn: "0.00"
        });
      }

      // Optionally add points in 1500 steps to exercise StepUp/global numbers
      let added = 0;
      await storage.initializeStepUpConfig();
      const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
      while (added + 1500 <= initialPoints) {
        await globalNumberSystem.checkAndAssignGlobalNumber(user.id, 1500, false);
        added += 1500;
      }
      const remainder = initialPoints - added;
      if (remainder > 0) {
        await globalNumberSystem.checkAndAssignGlobalNumber(user.id, remainder, false);
      }

      // Reload profile summary
      const updatedProfile = await storage.getCustomerProfile(user.id);

      // Issue a token for immediate testing
      const token = jwt.sign(
        { userId: user.id, role: 'customer' },
        process.env.JWT_SECRET || 'komarce-secret-key',
        { expiresIn: '24h' }
      );

      res.json({ success: true, user: { id: user.id, email: user.email }, profile: updatedProfile, token });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
    }
  });
}

// ==================== CUSTOMER DASHBOARD ====================

// Get customer dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    
    // Get all customer data
    const [profile, wallet, transactions, transfers, purchases, serialNumber] = await Promise.all([
      storage.getCustomerProfile(req.user.userId),
      storage.getCustomerWallet(customerId),
      storage.getCustomerPointTransactions(customerId),
      storage.getCustomerPointTransfers(customerId),
      storage.getCustomerPurchases(customerId),
      storage.getCustomerSerialNumber(customerId)
    ]);

    // Check if customer qualifies for global number (1500 points) using new system
    const accumulatedPoints = profile?.accumulatedPoints || 0;
    const currentGlobalNumber = profile?.globalSerialNumber || 0;
    
    if (accumulatedPoints >= 1500 && currentGlobalNumber === 0) {
      try {
        console.log(`🎯 Customer ${req.user.userId} has ${accumulatedPoints} accumulated points, checking Global Number eligibility...`);
        
        // Initialize Global Number system
        await storage.initializeStepUpConfig();
        
        // Process Global Number eligibility using GlobalNumberSystem
        const { globalNumberSystem } = await import('./services/GlobalNumberSystem');
        const result = await globalNumberSystem.checkAndAssignGlobalNumber(
          req.user.userId,
          0, // Don't add points, just check eligibility
          false
        );
        
        if (result.globalNumberAssigned) {
          console.log(`🎉 Global Number #${result.globalNumber} awarded to customer ${req.user.userId}`);
        }
        
        // Get updated profile
        const updatedProfile = await storage.getCustomerProfile(req.user.userId);
        
        // Use updated data
        const dashboardData = {
          profile: updatedProfile,
          wallet,
          serialNumber: { 
            globalSerialNumber: updatedProfile?.globalSerialNumber || 0,
            localSerialNumber: updatedProfile?.localSerialNumber || 0
          },
          statistics: {
            totalEarned: transactions.filter(t => t.transactionType === 'earned' || t.transactionType === 'reward').reduce((sum, t) => sum + t.points, 0),
            totalSpent: transactions.filter(t => t.transactionType === 'spent').reduce((sum, t) => sum + Math.abs(t.points), 0),
            totalTransferred: transactions.filter(t => t.transactionType === 'transferred_out').reduce((sum, t) => sum + Math.abs(t.points), 0),
            currentBalance: wallet?.rewardPointBalance || 0,
            totalPurchases: purchases.length,
            totalTransfers: transfers.length
          },
          recentTransactions: transactions.slice(0, 10),
          recentPurchases: purchases.slice(0, 5),
          globalSerialAssigned: result.globalNumberAssigned,
          globalSerialNumber: updatedProfile?.globalSerialNumber || 0
        };

        return res.json(dashboardData);
      } catch (error) {
        console.error('Error processing Global Number eligibility:', error);
      }
    }

    // Calculate statistics
    const totalEarned = transactions
      .filter(t => t.transactionType === 'earned' || t.transactionType === 'reward')
      .reduce((sum, t) => sum + t.points, 0);
    
    const totalSpent = transactions
      .filter(t => t.transactionType === 'spent')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    const totalTransferred = transactions
      .filter(t => t.transactionType === 'transferred_out')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    const dashboardData = {
      profile,
      wallet,
      serialNumber: {
        globalSerialNumber: profile?.globalSerialNumber || 0,
        localSerialNumber: profile?.localSerialNumber || 0
      },
      statistics: {
        totalEarned,
        totalSpent,
        totalTransferred,
        currentBalance: wallet?.rewardPointBalance || 0,
        totalPurchases: purchases.length,
        totalTransfers: transfers.length
      },
      recentTransactions: transactions.slice(0, 10),
      recentPurchases: purchases.slice(0, 5)
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ========== 4-Tier Reward System Endpoints ==========

// Get customer's reward numbers
router.get('/reward-numbers', authenticateToken, async (req, res) => {
  try {
    const rewardNumbers = await storage.getRewardNumbersByUser(req.user.userId);
    res.json(rewardNumbers);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer's active reward numbers
router.get('/active-reward-numbers', authenticateToken, async (req, res) => {
  try {
    const activeRewardNumbers = await storage.getActiveRewardNumbers(req.user.userId);
    res.json(activeRewardNumbers);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});




// Get reward number details
router.get('/reward-number/:id', authenticateToken, async (req, res) => {
  try {
    const rewardNumber = await storage.getStepUpRewardNumber(req.params.id);
    if (!rewardNumber || rewardNumber.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Reward number not found' });
    }
    res.json(rewardNumber);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create local reward number (for local admins)
router.post('/create-local-reward-number', authenticateToken, async (req, res) => {
  try {
    const { country } = req.body;
    
    const localRewardNumber = await storage.getNextLocalRewardNumber();
    const serialNumber = await storage.generateSerialNumber();
    
    const rewardNumber = await storage.createStepUpRewardNumber({
      userId: req.user.userId,
      rewardNumber: localRewardNumber,
      serialNumber: serialNumber,
      type: "local",
      tier1Status: "active",
      tier1Amount: 800,
      tier2Status: "locked",
      tier2Amount: 1500,
      tier3Status: "locked",
      tier3Amount: 3500,
      tier4Status: "locked",
      tier4Amount: 32200,
      tier4VoucherReserve: 6000,
      tier4RedeemableAmount: 20200,
      currentPoints: 0,
      totalPointsRequired: 37000,
      isCompleted: false,
      country: country || 'BD'
    });
    
    res.json(rewardNumber);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get tier progression status
router.get('/tier-progression-status', authenticateToken, async (req, res) => {
  try {
    const rewardNumbers = await storage.getActiveRewardNumbers(req.user.userId);
    const customer = await storage.getCustomerProfile(req.user.userId);
    
    const status = {
      totalPoints: customer?.currentPointsBalance || 0,
      activeRewardNumbers: rewardNumbers.length,
      completedRewardNumbers: (await storage.getRewardNumbersByUser(req.user.userId))
        .filter(rn => rn.isCompleted).length,
      currentTiers: rewardNumbers.map(rn => ({
        id: rn.id,
        rewardNumber: rn.rewardNumber,
        serialNumber: rn.serialNumber,
        type: rn.type,
        currentTier: rn.tier1Status === 'completed' ? 
          (rn.tier2Status === 'completed' ? 
            (rn.tier3Status === 'completed' ? 
              (rn.tier4Status === 'completed' ? 4 : 3) : 2) : 1) : 0,
        tier1Status: rn.tier1Status,
        tier2Status: rn.tier2Status,
        tier3Status: rn.tier3Status,
        tier4Status: rn.tier4Status,
        currentPoints: rn.currentPoints,
        totalPointsRequired: rn.totalPointsRequired
      }))
    };
    
    res.json(status);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// ========== Customer Withdrawal System ==========

// Request withdrawal from customer wallet
router.post('/withdraw/request', authenticateToken, async (req, res) => {
  try {
    const { amount, withdrawalMethod, accountDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    const customer = await storage.getCustomerProfile(req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const availableBalance = customer.currentPointsBalance || 0;
    if (availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
    }
    
    // Calculate VAT and service charge (12.5%)
    const vatAndServiceCharge = amount * 0.125;
    const finalAmount = amount - vatAndServiceCharge;
    
    // Create withdrawal request
    const withdrawalRequest = await storage.createCustomerWithdrawalRequest({
      customerId: customer.id,
      amount: amount,
      vatAmount: vatAndServiceCharge,
      serviceCharge: 0, // Service charge included in VAT
      finalAmount: finalAmount,
      withdrawalMethod,
      accountDetails,
      status: 'pending',
      requestedAt: new Date()
    });
    
    res.json({
      success: true,
      withdrawalRequest,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer withdrawal requests
router.get('/withdraw/requests', authenticateToken, async (req, res) => {
  try {
    const customer = await storage.getCustomerProfile(req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const { status = 'all' } = req.query;
    
    let requests = await storage.getCustomerWithdrawalRequests(customer.id);
    
    if (status !== 'all') {
      requests = requests.filter(req => req.status === status);
    }
    
    res.json(requests);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Cancel customer withdrawal request
router.post('/withdraw/cancel/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await storage.getCustomerProfile(req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const requestId = req.params.id;
    
    const request = await storage.getCustomerWithdrawalRequest(requestId);
    if (!request || request.customerId !== customer.id) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel non-pending withdrawal request' });
    }
    
    await storage.updateCustomerWithdrawalRequest(requestId, {
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal request cancelled successfully'
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Get customer withdrawal history
router.get('/withdraw/history', authenticateToken, async (req, res) => {
  try {
    const customer = await storage.getCustomerProfile(req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const { period = 'all' } = req.query;
    
    const now = new Date();
    let periodDate = new Date(0);
    
    if (period !== 'all') {
      periodDate = getPeriodDate(now, period as string);
    }
    
    const history = await storage.getCustomerWithdrawalHistory(customer.id, periodDate);
    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Helper function to get period date
function getPeriodDate(now: Date, period: string): Date {
  const date = new Date(now);
  switch (period) {
    case 'daily':
      date.setDate(date.getDate() - 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() - 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      return new Date(0);
  }
  return date;
}

// ========== Accumulated Points System ==========

// Get accumulated points data
router.get('/accumulated-points', authenticateToken, async (req, res) => {
  try {
    // Get customer profile using user ID
    const profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }

    // Use accumulatedPoints directly from profile (this tracks progress towards next 1500)
    const currentPoints = profile.accumulatedPoints || 0;
    const maxPoints = 1500;
    const pointsToNextReward = Math.max(0, maxPoints - currentPoints);

    // Check if customer has any reward numbers
    const rewardNumbers = await storage.getRewardNumbersByUser(req.user.userId);
    const hasRewardNumber = (rewardNumbers.length > 0);

    // Get global serial number if exists
    const globalNumber = profile.globalSerialNumber;

    const accumulatedData = {
      currentPoints,
      maxPoints,
      pointsToNextReward,
      hasRewardNumber,
      globalNumber,
      rewardNumbers: rewardNumbers.map((rn: any) => ({
        id: rn.id,
        number: rn.serialNumber || rn.rewardNumber,
        type: rn.type || 'global',
        createdAt: rn.createdAt
      }))
    };

    res.json(accumulatedData);
  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch accumulated points' });
  }
});

// Convert points to reward number
router.post('/convert-points-to-reward', authenticateToken, async (req, res) => {
  try {
    // Get customer profile using user ID
    const profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }

    const customerId = await getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ message: 'Customer ID not found' });
    }

    // Check if customer has enough points
    const totalRewardPointsEarned = profile.totalPointsEarned || 0;
    if (totalRewardPointsEarned < 1500) {
      return res.status(400).json({ message: 'Insufficient points. Need 1,500 points to convert.' });
    }

    // Check if customer already has a global serial number
    const existingSerial = await storage.getCustomerSerialNumber(customerId);
    if (existingSerial?.globalSerialNumber) {
      return res.status(400).json({ message: 'Customer already has a global serial number' });
    }

    // Assign global serial number
    const serialData = await storage.assignSerialNumberToCustomer(customerId);
    
    // Note: We don't reset totalPointsEarned as it represents lifetime earnings
    // The accumulated points system will handle the conversion logic

    // Create global reward number entry
    const globalRewardNumber = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      customerId,
      rewardNumber: serialData.globalSerialNumber,
      serialNumber: serialData.globalSerialNumber,
      tier1Completed: false,
      tier1Amount: 800,
      tier1Reward: 800,
      tier2Completed: false,
      tier2Amount: 1500,
      tier2Reward: 1500,
      tier3Completed: false,
      tier3Amount: 3500,
      tier3Reward: 3500,
      tier4Completed: false,
      tier4Amount: 32200,
      tier4Reward: 32200,
      tier4VoucherReserve: 6000,
      tier4RedeemableAmount: 26200,
      currentPoints: 0,
      totalPointsRequired: 38000,
      isCompleted: false,
      type: 'global',
      country: 'BD', // Default country since customer profile doesn't have country field
      createdAt: new Date()
    };

    await storage.createGlobalRewardNumber(globalRewardNumber);

    console.log(`🎯 Customer ${req.user.userId} converted 1,500 points to Global Reward Number #${serialData.globalSerialNumber}`);

    res.json({
      success: true,
      globalNumber: serialData.globalSerialNumber,
      message: `Points converted to Global Reward Number #${serialData.globalSerialNumber}`
    });
  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to convert points to reward number' });
  }
});

// Simple test endpoint without authentication (for debugging)
router.get('/test-simple', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Customer routes are working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

// Create specific referral relationship between Mazharul and Fahim
router.post('/create-mazharul-fahim-referral', async (req, res) => {
  try {
    const { referrerId, referredId } = req.body;
    
    if (!referrerId || !referredId) {
      return res.status(400).json({ error: 'Referrer ID and Referred ID are required' });
    }

    console.log('🔗 Creating specific referral relationship...');
    console.log('👤 Referrer ID:', referrerId);
    console.log('👤 Referred ID:', referredId);
    
    // Check if customers exist
    const referrerProfile = await storage.getCustomerProfileById(referrerId);
    const referredProfile = await storage.getCustomerProfileById(referredId);
    
    if (!referrerProfile) {
      return res.status(404).json({ error: 'Referrer customer not found' });
    }
    
    if (!referredProfile) {
      return res.status(404).json({ error: 'Referred customer not found' });
    }
    
    console.log('✅ Found referrer:', referrerProfile.fullName);
    console.log('✅ Found referred:', referredProfile.fullName);
    
    // Get referral code for the referrer
    const referralCode = await storage.ensureCustomerHasReferralCode(referrerId);
    console.log('🔑 Referral Code:', referralCode);
    
    // Create referral relationship
    await storage.createCustomerReferral({
      referrerId: referrerId,
      referredId: referredId,
      referralCode: referralCode,
      commissionRate: "5.00",
      totalPointsEarned: 0,
      totalCommissionEarned: "0.00"
    });

    console.log('✅ Referral relationship created successfully');
    
    res.json({
      success: true,
      message: 'Mazharul-Fahim referral relationship created successfully',
      referrerId: referrerId,
      referredId: referredId,
      referralCode: referralCode
    });
  } catch (error) {
    console.error('❌ Error creating specific referral relationship:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'An error occurred' });
  }
});

export default router;
