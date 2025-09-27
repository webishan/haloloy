// Test script to verify Global Number system with authentication
const testGlobalNumberWithAuth = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    // Step 1: Login as a customer
    console.log('🔐 Logging in as customer...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'customer@komarce.com',
        password: 'customer123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed, trying to register customer...');
      
      // Try to register a customer
      const registerResponse = await fetch(`${baseUrl}/api/customer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'testcustomer@komarce.com',
          mobileNumber: '+8801234567890',
          fullName: 'Test Customer',
          password: 'customer123'
        })
      });
      
      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        console.log('❌ Registration failed:', errorText);
        return;
      }
      
      console.log('✅ Customer registered successfully');
      
      // Now login with the new customer
      const newLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'testcustomer@komarce.com',
          password: 'customer123'
        })
      });
      
      if (!newLoginResponse.ok) {
        console.log('❌ Login after registration failed');
        return;
      }
      
      const loginData = await newLoginResponse.json();
      console.log('✅ Logged in successfully');
      
      // Step 2: Test adding points
      console.log('🧪 Testing Global Number system...');
      const testResponse = await fetch(`${baseUrl}/api/customer/test-earn-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ points: 1500 })
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log('❌ Test failed:', errorText);
        return;
      }
      
      const testResult = await testResponse.json();
      console.log('✅ Test result:', JSON.stringify(testResult, null, 2));
      
      // Step 3: Check dashboard
      console.log('📊 Checking dashboard...');
      const dashboardResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('📊 Dashboard data:', {
          globalSerialNumber: dashboardData.profile?.globalSerialNumber || 0,
          accumulatedPoints: dashboardData.profile?.accumulatedPoints || 0,
          totalPointsEarned: dashboardData.profile?.totalPointsEarned || 0
        });
      }
      
    } else {
      console.log('✅ Login successful with existing customer');
      const loginData = await loginResponse.json();
      
      // Test with existing customer
      const testResponse = await fetch(`${baseUrl}/api/customer/test-earn-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ points: 1500 })
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log('✅ Test result:', JSON.stringify(testResult, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testGlobalNumberWithAuth();