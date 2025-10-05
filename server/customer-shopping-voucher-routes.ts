import { Router } from 'express';
import { authenticateToken } from './auth';
import { storage } from './storage';
import { shoppingVoucherManager } from './services/ShoppingVoucherManager';

const router = Router();

// Get customer's shopping vouchers
router.get('/shopping-vouchers', authenticateToken, async (req, res) => {
  try {
    const customerId = await storage.getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get shopping vouchers for this customer
    const vouchers = await storage.getCustomerShoppingVouchers(customerId);
    
    // Calculate totals
    const totalBalance = vouchers.reduce((sum, voucher) => sum + voucher.voucherPoints, 0);
    const totalEarned = vouchers.reduce((sum, voucher) => sum + voucher.originalPoints, 0);
    const totalUsed = vouchers.filter(v => v.status === 'used').reduce((sum, voucher) => sum + voucher.voucherPoints, 0);
    
    // Get notifications count
    const notifications = await storage.getCustomerShoppingVoucherNotifications(customerId);

    res.json({
      vouchers,
      totalBalance,
      totalEarned,
      totalUsed,
      notifications: notifications.length
    });
  } catch (error: any) {
    console.error('Error fetching shopping vouchers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cash out shopping vouchers
router.post('/shopping-voucher-cashout', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const customerId = await storage.getCustomerId(req.user.userId);
    
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const result = await shoppingVoucherManager.requestCustomerCashOut(customerId, amount);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Cash-out request submitted successfully',
        requestId: result.requestId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Error processing cash-out request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shopping voucher notifications
router.get('/shopping-voucher-notifications', authenticateToken, async (req, res) => {
  try {
    const customerId = await storage.getCustomerId(req.user.userId);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const notifications = await storage.getCustomerShoppingVoucherNotifications(customerId);
    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching shopping voucher notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
