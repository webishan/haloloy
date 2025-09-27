// Test persistent credentials
const testCredentials = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    console.log('🧪 Testing persistent credentials...\n');
    
    // Test 1: Merchant Login
    console.log('🏪 Testing Merchant Login...');
    const merchantLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'tkhanishan@gmail.com',
        password: 'ishan007'
      })
    });
    
    if (merchantLoginResponse.ok) {
      const merchantData = await merchantLoginResponse.json();
      console.log('✅ Merchant login successful!');
      console.log(`   Email: tkhanishan@gmail.com`);
      console.log(`   Role: ${merchantData.user.role}`);
      console.log(`   Token: ${merchantData.token.substring(0, 20)}...`);
    } else {
      console.log('❌ Merchant login failed');
      const error = await merchantLoginResponse.text();
      console.log('   Error:', error);
    }
    
    console.log('');
    
    // Test 2: Customer Login
    console.log('👤 Testing Customer Login...');
    const customerLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'samin@gmail.com',
        password: 'samin007'
      })
    });
    
    if (customerLoginResponse.ok) {
      const customerData = await customerLoginResponse.json();
      console.log('✅ Customer login successful!');
      console.log(`   Email: samin@gmail.com`);
      console.log(`   Role: ${customerData.user.role}`);
      console.log(`   Token: ${customerData.token.substring(0, 20)}...`);
      
      // Test 3: Test Global Number System
      console.log('\n🎯 Testing Global Number System...');
      const testGlobalNumberResponse = await fetch(`${baseUrl}/api/customer/test-earn-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerData.token}`
        },
        body: JSON.stringify({ points: 1500 })
      });
      
      if (testGlobalNumberResponse.ok) {
        const testResult = await testGlobalNumberResponse.json();
        console.log('✅ Global Number test successful!');
        console.log(`   Points added: ${testResult.pointsAdded}`);
        console.log(`   Global Number awarded: ${testResult.globalNumberResult.globalNumberAwarded}`);
        if (testResult.globalNumberResult.globalNumberAwarded) {
          console.log(`   🎉 Global Number: ${testResult.globalNumberResult.globalNumber}`);
        }
        console.log(`   Updated profile:`, testResult.updatedProfile);
      } else {
        console.log('❌ Global Number test failed');
        const error = await testGlobalNumberResponse.text();
        console.log('   Error:', error.substring(0, 200));
      }
      
    } else {
      console.log('❌ Customer login failed');
      const error = await customerLoginResponse.text();
      console.log('   Error:', error);
    }
    
    console.log('\n🎉 Credential test completed!');
    console.log('\n📋 Persistent Credentials Summary:');
    console.log('   Merchant: tkhanishan@gmail.com / ishan007');
    console.log('   Customer: samin@gmail.com / samin007');
    console.log('   These will persist across server restarts!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testCredentials();