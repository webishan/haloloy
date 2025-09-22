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
      role: 'customer'
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
    const qrCode = await storage.generateCustomerQRCode(req.user.id);

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

// Customer login with mobile number and password
router.post('/login', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;
    
    if (!mobileNumber || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required' });
    }

    // Get customer profile by mobile number
    const profile = await storage.getCustomerProfileByMobile(mobileNumber);
    if (!profile) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Get user
    const user = await storage.getUser(profile.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
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
    const profile = await storage.getCustomerProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
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

    const profile = await storage.getCustomerProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    // Check if all required fields are provided
    const requiredFields = [fathersName, mothersName, nidNumber || passportNumber, bloodGroup, nomineeDetails];
    const profileComplete = requiredFields.every(field => field !== undefined && field !== null && field !== '');

    const updatedProfile = await storage.updateCustomerProfile(req.user.id, {
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
    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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
    const customerId = await getCustomerId(req.user.id);
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

    const fromCustomerId = await getCustomerId(req.user.id);
    
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
    const customerId = await getCustomerId(req.user.id);
    const serialNumber = await storage.getCustomerSerialNumber(customerId);
    
    res.json(serialNumber);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== QR CODE ====================

// Get customer QR code
router.get('/qr-code', authenticateToken, async (req, res) => {
  try {
    // First check if customer profile exists
    let profile = await storage.getCustomerProfile(req.user.id);
    
    // If profile doesn't exist, create it
    if (!profile) {
      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.id,
        uniqueAccountNumber,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        email: req.user.email,
        fullName: `${req.user.firstName || 'Customer'} ${req.user.lastName || 'User'}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
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
    
    const qrCode = await storage.generateCustomerQRCode(req.user.id);
    
    res.json({ qrCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer QR code as image
router.get('/qr-code-image', authenticateToken, async (req, res) => {
  try {
    // First check if customer profile exists
    let profile = await storage.getCustomerProfile(req.user.id);
    
    // If profile doesn't exist, create it
    if (!profile) {
      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
      
      // Create customer profile
      profile = await storage.createCustomerProfile({
        userId: req.user.id,
        uniqueAccountNumber,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        email: req.user.email,
        fullName: `${req.user.firstName || 'Customer'} ${req.user.lastName || 'User'}`,
        profileComplete: false,
        totalPointsEarned: 0,
        currentPointsBalance: 0,
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
    
    const qrCode = await storage.generateCustomerQRCode(req.user.id);
    
    // Import QRCode library dynamically
    const QRCode = await import('qrcode');
    
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrCode, {
      type: 'png',
      width: 400,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Set response headers for image
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': qrBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PURCHASE HISTORY ====================

// Get customer purchases
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
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

    const customerId = await getCustomerId(req.user.id);
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

    // Update customer wallet
    const wallet = await storage.getCustomerWallet(customerId);
    if (wallet) {
      await storage.updateCustomerWallet(customerId, {
        pointsBalance: wallet.pointsBalance + pointsEarned,
        totalPointsEarned: wallet.totalPointsEarned + pointsEarned,
        lastTransactionAt: new Date()
      });

      // Create transaction record
      await storage.createCustomerPointTransaction({
        customerId,
        merchantId,
        transactionType: 'earned',
        points: pointsEarned,
        balanceAfter: wallet.pointsBalance + pointsEarned,
        description: `Earned ${pointsEarned} points from purchase`,
        referenceId: purchase.id
      });

      // Check if customer qualifies for serial number (1500 points)
      if (wallet.totalPointsEarned + pointsEarned >= 1500) {
        const existingSerial = await storage.getCustomerSerialNumber(customerId);
        if (!existingSerial) {
          await storage.assignSerialNumberToCustomer(customerId);
        }
      }
    }

    res.json({ 
      success: true, 
      purchase,
      message: 'Points earned successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER DASHBOARD ====================

// Get customer dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const customerId = await getCustomerId(req.user.id);
    
    // Get all customer data
    const [profile, wallet, transactions, transfers, purchases, serialNumber] = await Promise.all([
      storage.getCustomerProfile(req.user.id),
      storage.getCustomerWallet(customerId),
      storage.getCustomerPointTransactions(customerId),
      storage.getCustomerPointTransfers(customerId),
      storage.getCustomerPurchases(customerId),
      storage.getCustomerSerialNumber(customerId)
    ]);

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
      serialNumber,
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

export default router;
