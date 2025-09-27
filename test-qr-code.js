// Test QR code generation and copying
const testQRCode = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    // Step 1: Register a customer
    console.log('🔐 Registering customer...');
    const registerResponse = await fetch(`${baseUrl}/api/customer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `qrtest${Date.now()}@komarce.com`,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        fullName: 'QR Test Customer',
        password: 'customer123'
      })
    });
    
    if (!registerResponse.ok) {
      console.log('❌ Registration failed');
      return;
    }
    
    const registerData = await registerResponse.json();
    console.log('✅ Customer registered:', registerData.user.email);
    
    // Step 2: Login
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: registerData.user.email,
        password: 'customer123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Step 3: Get QR code
    console.log('📱 Fetching QR code...');
    const qrResponse = await fetch(`${baseUrl}/api/customer/qr-code`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      console.log('✅ QR Code:', qrData.qrCode);
      
      // Step 4: Test if merchant can scan this QR code
      console.log('🔍 Testing QR code format...');
      if (qrData.qrCode && qrData.qrCode.startsWith('KOMARCE:CUSTOMER:')) {
        console.log('✅ QR code format is correct');
        console.log('📋 QR code ready for copying:', qrData.qrCode);
      } else {
        console.log('❌ QR code format is incorrect:', qrData.qrCode);
      }
    } else {
      console.log('❌ Failed to fetch QR code');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testQRCode();