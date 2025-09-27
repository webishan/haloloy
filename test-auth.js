// Test authentication flow
const testAuth = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    // Test 1: Try to register a new customer
    console.log('🔐 Testing customer registration...');
    const registerResponse = await fetch(`${baseUrl}/api/customer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: `test${Date.now()}@komarce.com`,
        mobileNumber: `+880${Math.floor(Math.random() * 1000000000)}`,
        fullName: 'Test Customer',
        password: 'customer123'
      })
    });
    
    console.log('Register Status:', registerResponse.status);
    console.log('Register Headers:', Object.fromEntries(registerResponse.headers.entries()));
    
    const registerText = await registerResponse.text();
    console.log('Register Response:', registerText.substring(0, 500));
    
    if (registerResponse.ok) {
      const registerData = JSON.parse(registerText);
      console.log('✅ Registration successful');
      
      // Test 2: Login with the new customer
      console.log('🔐 Testing customer login...');
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
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful, token:', loginData.token.substring(0, 20) + '...');
        
        // Test 3: Test authenticated endpoint
        console.log('🧪 Testing authenticated endpoint...');
        const testResponse = await fetch(`${baseUrl}/api/customer/test-earn-points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({ points: 1500 })
        });
        
        console.log('Test Status:', testResponse.status);
        const testText = await testResponse.text();
        console.log('Test Response:', testText);
        
      } else {
        console.log('❌ Login failed');
      }
    } else {
      console.log('❌ Registration failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAuth();