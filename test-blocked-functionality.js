// Simple test to demonstrate the blocked customer functionality
// This bypasses TypeScript compilation issues

const express = require('express');
const app = express();
app.use(express.json());

// Simple in-memory storage for demonstration
const blockedCustomers = new Map();
const merchantCustomers = new Map();

// Mock authentication middleware
const authenticateToken = (req, res, next) => {
  req.user = { userId: 'test-merchant-id' };
  next();
};

// Blocked customer endpoints
app.get('/api/merchant/blocked-customers', authenticateToken, (req, res) => {
  const merchantId = req.user.userId;
  const blocked = Array.from(blockedCustomers.values())
    .filter(bc => bc.merchantId === merchantId);
  
  res.json({
    success: true,
    blockedCustomers: blocked
  });
});

app.post('/api/merchant/delete-customer/:customerId', authenticateToken, (req, res) => {
  const { customerId } = req.params;
  const merchantId = req.user.userId;
  
  console.log(`🗑️ Deleting customer ${customerId} for merchant ${merchantId}`);
  
  // Find the customer in merchant's list
  const customerKey = `${merchantId}-${customerId}`;
  const customer = merchantCustomers.get(customerKey);
  
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found in your list' });
  }
  
  // Add to blocked list
  const blockedId = `blocked-${Date.now()}`;
  blockedCustomers.set(blockedId, {
    id: blockedId,
    merchantId,
    customerId,
    customerName: customer.customerName,
    customerEmail: customer.customerEmail,
    customerMobile: customer.customerMobile,
    accountNumber: customer.accountNumber,
    reason: 'Deleted by merchant',
    blockedAt: new Date(),
    createdAt: new Date()
  });
  
  // Remove from merchant's customer list
  merchantCustomers.delete(customerKey);
  
  console.log(`✅ Customer ${customer.customerName} deleted and blocked`);
  
  res.json({
    success: true,
    message: `Customer ${customer.customerName} has been removed from your customer list`
  });
});

app.post('/api/merchant/scan-customer', authenticateToken, (req, res) => {
  const { qrCode } = req.body;
  const merchantId = req.user.userId;
  
  console.log(`🔍 Scanning QR code: ${qrCode}`);
  
  // Parse QR code (simplified)
  let customerId;
  if (qrCode.startsWith('KOMARCE:CUSTOMER:')) {
    const parts = qrCode.split(':');
    customerId = parts[2];
  } else {
    return res.status(400).json({ error: 'Invalid QR code format' });
  }
  
  // Check if customer is blocked
  const blocked = Array.from(blockedCustomers.values())
    .find(bc => bc.merchantId === merchantId && bc.customerId === customerId);
  
  if (blocked) {
    console.log(`❌ Customer ${customerId} is blocked`);
    return res.status(403).json({
      error: 'Customer access denied',
      message: `This customer was previously removed from your customer list on ${blocked.blockedAt.toLocaleDateString()}. You cannot re-add them using QR code.`,
      details: {
        customerName: blocked.customerName,
        accountNumber: blocked.accountNumber,
        blockedAt: blocked.blockedAt,
        reason: blocked.reason
      }
    });
  }
  
  // Mock customer data
  const customer = {
    id: customerId,
    fullName: 'Test Customer',
    accountNumber: 'KOM12345678',
    mobileNumber: '+8801712345678',
    currentPointsBalance: 100,
    tier: 'bronze'
  };
  
  // Add to merchant's customer list
  const customerKey = `${merchantId}-${customerId}`;
  merchantCustomers.set(customerKey, {
    merchantId,
    customerId,
    customerName: customer.fullName,
    customerEmail: null,
    customerMobile: customer.mobileNumber,
    accountNumber: customer.accountNumber,
    totalPointsEarned: 0,
    currentPointsBalance: customer.currentPointsBalance,
    tier: customer.tier,
    isActive: true
  });
  
  console.log(`✅ Customer ${customer.fullName} added to merchant list`);
  
  res.json({
    success: true,
    customer,
    message: 'Customer profile created/updated successfully'
  });
});

// Add some test data
const testCustomerKey = 'test-merchant-id-test-customer-id';
merchantCustomers.set(testCustomerKey, {
  merchantId: 'test-merchant-id',
  customerId: 'test-customer-id',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerMobile: '+8801712345678',
  accountNumber: 'KOM12345678',
  totalPointsEarned: 500,
  currentPointsBalance: 250,
  tier: 'silver',
  isActive: true
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /api/merchant/blocked-customers');
  console.log('  POST /api/merchant/delete-customer/:customerId');
  console.log('  POST /api/merchant/scan-customer');
  console.log('');
  console.log('🧪 Test the blocked customer functionality:');
  console.log('1. Delete customer: POST /api/merchant/delete-customer/test-customer-id');
  console.log('2. Try to scan QR: POST /api/merchant/scan-customer with body: {"qrCode": "KOMARCE:CUSTOMER:test-customer-id:KOM12345678"}');
  console.log('3. Check blocked list: GET /api/merchant/blocked-customers');
});