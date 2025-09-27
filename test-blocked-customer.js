// Simple test to verify blocked customer functionality
const fetch = require('node-fetch');

async function testBlockedCustomer() {
  const baseUrl = 'http://localhost:5006';
  
  // Test data
  const merchantToken = 'test-merchant-token'; // You'll need to get a real token
  const customerId = 'test-customer-id';
  
  try {
    // Test 1: Try to scan a QR code for a blocked customer
    console.log('Testing QR scan for blocked customer...');
    const qrResponse = await fetch(`${baseUrl}/api/merchant/scan-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${merchantToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qrCode: 'KOMARCE:CUSTOMER:test-customer-id:KOM12345678'
      })
    });
    
    const qrResult = await qrResponse.json();
    console.log('QR Scan Result:', qrResult);
    
    // Test 2: Try to create a customer that was previously blocked
    console.log('\nTesting create customer for blocked customer...');
    const createResponse = await fetch(`${baseUrl}/api/merchant/create-customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${merchantToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullName: 'Test Customer',
        mobileNumber: '+8801712345678',
        email: 'test@example.com'
      })
    });
    
    const createResult = await createResponse.json();
    console.log('Create Customer Result:', createResult);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testBlockedCustomer();