import { Router } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken } from './auth';
import { 
  insertCustomerProfileSchema,
  insertCustomerPointTransactionSchema,
  insertCustomerOTPSchema,
  insertCustomerPointTransferSchema,
  insertCustomerPurchaseSchema
} from '@shared/schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

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
      pointsBalance: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      totalPointsTransferred: 0
    });
  }

  return profile.id;
};

// ==================== CUSTOMER REGISTRATION ====================

// Customer registration
router.post('/register', async (req, res) => {
  try {
    const { email, mobileNumber, fullName, password } = req.body;
    
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
      globalSerialNumber: 0, // Start with 0 (not assigned yet)
      localSerialNumber: 0,  // Start with 0 (not assigned yet)
      tier: 'bronze',
      isActive: true
    });

    // Create customer wallet
    await storage.createCustomerWallet({
      customerId: profile.id,
      pointsBalance: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      totalPointsTransferred: 0
    });

    // Generate QR code
    const qrCode = await storage.generateCustomerQRCode(user.id);

    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, role: user.role },
      profile: { ...profile, qrCode },
      message: 'Customer registered successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
          const rewardTier = getRewardTierBySerial(result.globalNumber);
          console.log(`🏆 Customer ${req.user.userId} assigned to ${rewardTier.name} tier (Reward: ${rewardTier.reward} points)`);
        }
      } catch (error) {
        console.error('Error assigning global serial number:', error);
      }
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// ==================== POINT TRANSACTIONS ====================

// Get customer point transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.userId);
    const { merchantId } = req.query;
    
    let transactions;
    if (merchantId) {
      transactions = await storage.getCustomerPointTransactionsByMerchant(customerId, merchantId as string);
    } else {
      transactions = await storage.getCustomerPointTransactions(customerId);
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    if (!wallet || wallet.pointsBalance < points) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    // Check if recipient exists
    const recipientProfile = await storage.getCustomerProfile(toCustomerId);
    if (!recipientProfile) {
      return res.status(404).json({ error: 'Recipient not found' });
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
      pointsBalance: wallet.pointsBalance - points,
      totalPointsTransferred: wallet.totalPointsTransferred + points,
      lastTransactionAt: new Date()
    });

    // Update recipient wallet
    const recipientWallet = await storage.getCustomerWallet(toCustomerId);
    if (recipientWallet) {
      await storage.updateCustomerWallet(toCustomerId, {
        pointsBalance: recipientWallet.pointsBalance + points,
        lastTransactionAt: new Date()
      });
    }

    // Create transaction records
    await storage.createCustomerPointTransaction({
      customerId: fromCustomerId,
      merchantId: 'system',
      transactionType: 'transferred_out',
      points: -points,
      balanceAfter: wallet.pointsBalance - points,
      description: `Transferred ${points} points to ${recipientProfile.fullName}`,
      referenceId: transfer.id
    });

    if (recipientWallet) {
      await storage.createCustomerPointTransaction({
        customerId: toCustomerId,
        merchantId: 'system',
        transactionType: 'transferred_in',
        points: points,
        balanceAfter: recipientWallet.pointsBalance + points,
        description: `Received ${points} points from ${profile.fullName}`,
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
        pointsBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPointsTransferred: 0
      });
      
      console.log(`✅ Customer profile created successfully`);
    }
    
    console.log(`🔍 Generating QR code for profile: ${profile.id}`);
    const qrCode = await storage.generateCustomerQRCode(req.user.userId);
    console.log(`✅ QR code generated: ${qrCode}`);
    
    res.json({ qrCode });
  } catch (error) {
    console.error(`❌ QR code generation failed:`, error);
    res.status(500).json({ error: error.message });
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
        pointsBalance: 0,
        totalPointsEarned: 0,
        totalPointsSpent: 0,
        totalPointsTransferred: 0
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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

    // Process Global Number eligibility (these are earned points, not reward points)
    const globalNumberResult = await storage.processGlobalNumberEligibility(
      customerId,
      pointsEarned,
      false // These are earned points from merchant purchases
    );

    // Update customer wallet
    const wallet = await storage.getCustomerWallet(customerId);
    if (wallet) {
      await storage.updateCustomerWallet(customerId, {
        pointsBalance: wallet.pointsBalance + pointsEarned,
        totalPointsEarned: wallet.totalPointsEarned + pointsEarned,
        lastTransactionAt: new Date()
      });

      // Create transaction record (this will also trigger Global Number processing)
      await storage.createCustomerPointTransaction({
        customerId,
        merchantId,
        transactionType: 'earned',
        points: pointsEarned,
        balanceAfter: wallet.pointsBalance + pointsEarned,
        description: `Earned ${pointsEarned} points from purchase`,
        referenceId: purchase.id
      });
    }

    // Prepare response with Global Number information
    const response: any = { 
      success: true, 
      purchase,
      message: 'Points earned successfully'
    };

    if (globalNumberResult.globalNumberAwarded) {
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Get StepUp configuration
router.get('/stepup-config', authenticateToken, async (req, res) => {
  try {
    const configs = await storage.getStepUpConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Global Number system configuration
router.get('/global-number-config', authenticateToken, async (req, res) => {
  try {
    const config = await storage.getGlobalNumberConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    
    const result = await storage.processGlobalNumberEligibility(
      customerId,
      points,
      isRewardPoints
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    
    const result = await storage.processGlobalNumberEligibility(
      customerId,
      points,
      false // These are earned points
    );

    // Note: Wallet is updated inside processGlobalNumberEligibility, no need to update here

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
      message: result.globalNumberAwarded 
        ? `🎉 Global Number ${result.globalNumber} awarded!` 
        : `Points added. Need ${1500 - (updatedProfile?.accumulatedPoints || 0)} more points for Global Number.`
    });
  } catch (error) {
    console.error('Error in test-earn-points:', error);
    res.status(500).json({ error: error.message });
  }
});

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
        
        // Process Global Number eligibility using new system
        const result = await storage.processGlobalNumberEligibility(
          customerId,
          0, // Don't add points, just check eligibility
          false
        );
        
        if (result.globalNumberAwarded) {
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
            totalEarned: transactions.filter(t => t.transactionType === 'earned').reduce((sum, t) => sum + t.points, 0),
            totalSpent: transactions.filter(t => t.transactionType === 'spent').reduce((sum, t) => sum + Math.abs(t.points), 0),
            totalTransferred: transactions.filter(t => t.transactionType === 'transferred_out').reduce((sum, t) => sum + Math.abs(t.points), 0),
            currentBalance: wallet?.pointsBalance || 0,
            totalPurchases: purchases.length,
            totalTransfers: transfers.length
          },
          recentTransactions: transactions.slice(0, 10),
          recentPurchases: purchases.slice(0, 5),
          globalSerialAssigned: result.globalNumberAwarded,
          globalSerialNumber: updatedProfile?.globalSerialNumber || 0
        };

        return res.json(dashboardData);
      } catch (error) {
        console.error('Error processing Global Number eligibility:', error);
      }
    }

    // Calculate statistics
    const totalEarned = transactions
      .filter(t => t.transactionType === 'earned')
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
        currentBalance: wallet?.pointsBalance || 0,
        totalPurchases: purchases.length,
        totalTransfers: transfers.length
      },
      recentTransactions: transactions.slice(0, 10),
      recentPurchases: purchases.slice(0, 5)
    };

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 4-Tier Reward System Endpoints ==========

// Get customer's reward numbers
router.get('/reward-numbers', authenticateToken, async (req, res) => {
  try {
    const rewardNumbers = await storage.getRewardNumbersByUser(req.user.userId);
    res.json(rewardNumbers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer's active reward numbers
router.get('/active-reward-numbers', authenticateToken, async (req, res) => {
  try {
    const activeRewardNumbers = await storage.getActiveRewardNumbers(req.user.userId);
    res.json(activeRewardNumbers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check tier progression for customer
router.post('/check-tier-progression', authenticateToken, async (req, res) => {
  try {
    const loyaltyService = new (await import('./services/LoyaltyPointsService')).LoyaltyPointsService(storage);
    await loyaltyService.checkTierProgression(req.user.userId);
    
    const updatedRewardNumbers = await storage.getActiveRewardNumbers(req.user.userId);
    res.json({ 
      message: 'Tier progression checked successfully',
      rewardNumbers: updatedRewardNumbers 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Force check for global serial number eligibility
router.post('/check-global-serial-eligibility', authenticateToken, async (req, res) => {
  try {
    const loyaltyService = new (await import('./services/LoyaltyPointsService')).LoyaltyPointsService(storage);
    
    // Get customer profile to check total points
    const profile = await storage.getCustomerProfile(req.user.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const totalPoints = profile.totalPointsEarned || 0;
    
    if (totalPoints >= 1500) {
      // Check and create global serial if eligible
      await loyaltyService.checkAndCreateGlobalSerial(req.user.userId);
      
      // Get updated profile and serial number info
      const updatedProfile = await storage.getCustomerProfile(req.user.userId);
      const customerId = await getCustomerId(req.user.userId);
      const serialNumber = customerId ? await storage.getCustomerSerialNumber(customerId) : null;
      const updatedRewardNumbers = await storage.getRewardNumbersByUser(req.user.userId);
      
      const hasGlobalSerial = serialNumber?.globalSerialNumber !== null && serialNumber?.globalSerialNumber !== undefined;
      const hasGlobalReward = updatedRewardNumbers.some((rn: any) => rn.type === 'global');
      
      res.json({ 
        message: hasGlobalSerial ? 'Global serial number assigned successfully!' : 'Checking global serial eligibility...',
        totalPoints,
        eligible: true,
        hasGlobalSerial,
        hasGlobalReward,
        globalSerialNumber: serialNumber?.globalSerialNumber,
        rewardNumbers: updatedRewardNumbers,
        profile: updatedProfile
      });
    } else {
      res.json({ 
        message: `You need ${1500 - totalPoints} more points to be eligible for a global serial number`,
        totalPoints,
        eligible: false,
        pointsNeeded: 1500 - totalPoints
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-check and assign global serial numbers for all eligible customers (Admin only)
router.post('/auto-assign-global-serials', async (req, res) => {
  try {
    const loyaltyService = new (await import('./services/LoyaltyPointsService')).LoyaltyPointsService(storage);
    
    // Get all customer profiles with 1500+ points
    const allCustomers = await storage.getAllCustomerProfiles();
    const eligibleCustomers = allCustomers.filter(customer => 
      (customer.totalPointsEarned || 0) >= 1500
    );
    
    let assignedCount = 0;
    const results = [];
    
    for (const customer of eligibleCustomers) {
      try {
        const customerId = customer.id;
        const existingSerial = await storage.getCustomerSerialNumber(customerId);
        
        if (!existingSerial) {
          await loyaltyService.checkAndCreateGlobalSerial(customer.userId);
          assignedCount++;
          results.push({
            userId: customer.userId,
            totalPoints: customer.totalPointsEarned,
            status: 'assigned'
          });
        } else {
          results.push({
            userId: customer.userId,
            totalPoints: customer.totalPointsEarned,
            globalSerialNumber: existingSerial.globalSerialNumber,
            status: 'already_exists'
          });
        }
      } catch (error) {
        results.push({
          userId: customer.userId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Processed ${eligibleCustomers.length} eligible customers, assigned ${assignedCount} new global serial numbers`,
      eligibleCustomers: eligibleCustomers.length,
      assignedCount,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

    // Calculate accumulated points (use totalPointsEarned for accumulation logic)
    const totalPointsEarned = profile.totalPointsEarned || 0;
    
    // If customer already has a global serial number, accumulated points should be 0
    const customerId = await getCustomerId(req.user.userId);
    const serialNumber = customerId ? await storage.getCustomerSerialNumber(customerId) : null;
    const hasGlobalSerial = !!serialNumber?.globalSerialNumber;
    
    const currentPoints = hasGlobalSerial ? 0 : Math.min(totalPointsEarned, 1499);
    const maxPoints = 1500;
    const pointsToNextReward = hasGlobalSerial ? 0 : Math.max(0, maxPoints - currentPoints);

    // Check if customer has any reward numbers or already has a global serial
    const rewardNumbers = await storage.getRewardNumbersByUser(req.user.userId);
    const hasRewardNumber = hasGlobalSerial || (rewardNumbers.length > 0);

    // Get global serial number if exists
    const globalNumber = serialNumber?.globalSerialNumber;

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
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch accumulated points' });
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
    const totalPointsEarned = profile.totalPointsEarned || 0;
    if (totalPointsEarned < 1500) {
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
      country: profile.country || 'BD',
      createdAt: new Date()
    };

    await storage.createGlobalRewardNumber(globalRewardNumber);

    console.log(`🎯 Customer ${req.user.userId} converted 1,500 points to Global Reward Number #${serialData.globalSerialNumber}`);

    res.json({
      success: true,
      globalNumber: serialData.globalSerialNumber,
      message: `Points converted to Global Reward Number #${serialData.globalSerialNumber}`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to convert points to reward number' });
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
