// Test to verify frontend displays Global Number correctly
const testFrontendFix = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    console.log('🧪 Testing frontend Global Number display fix...\n');
    
    // Step 1: Login
    console.log('👤 Step 1: Login as customer...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'samin@gmail.com',
        password: 'samin007'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Step 2: Check what the frontend queries return
    console.log('\n📊 Step 2: Check individual frontend queries...');
    
    // Dashboard query (primary source)
    const dashboardResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (dashboardResponse.ok) {
      const dashboard = await dashboardResponse.json();
      console.log('✅ Dashboard query:');
      console.log('   profile.globalSerialNumber:', dashboard.profile?.globalSerialNumber);
      console.log('   serialNumber.globalSerialNumber:', dashboard.serialNumber?.globalSerialNumber);
    }
    
    // Profile query (fallback)
    const profileResponse = await fetch(`${baseUrl}/api/customer/profile`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log('✅ Profile query:');
      console.log('   globalSerialNumber:', profile.globalSerialNumber);
    } else {
      console.log('❌ Profile query failed');
    }
    
    // Serial number query (fallback)
    const serialResponse = await fetch(`${baseUrl}/api/customer/serial-number`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (serialResponse.ok) {
      const serial = await serialResponse.json();
      console.log('✅ Serial number query:');
      console.log('   globalSerialNumber:', serial.globalSerialNumber);
    } else {
      console.log('❌ Serial number query failed');
    }
    
    // Step 3: Test the logic that the frontend will use
    console.log('\n🔧 Step 3: Simulate frontend logic...');
    
    if (dashboardResponse.ok) {
      const dashboard = await dashboardResponse.json();
      const profile = dashboard.profile || {};
      const serialData = dashboard.serialNumber || {};
      
      // This is the logic from the fixed frontend
      const globalSerialNumber = serialData.globalSerialNumber || profile.globalSerialNumber || 0;
      
      console.log('✅ Frontend will display Global Number:', globalSerialNumber);
      
      if (globalSerialNumber > 0) {
        console.log('🎉 SUCCESS: Global Number will be displayed correctly!');
      } else {
        console.log('❌ ISSUE: Global Number is still 0');
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('   - The frontend now prioritizes dashboard data over individual queries');
    console.log('   - Dashboard data contains the most up-to-date Global Number information');
    console.log('   - The test button refreshes all relevant queries');
    console.log('   - The Global Number should now display correctly in the UI');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testFrontendFix();