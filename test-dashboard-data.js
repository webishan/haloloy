// Test dashboard data after Global Number award
const testDashboardData = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    console.log('🧪 Testing dashboard data after Global Number award...\n');
    
    // Step 1: Login as customer
    console.log('👤 Logging in as customer...');
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
    
    // Step 2: Check dashboard data BEFORE adding points
    console.log('\n📊 Dashboard data BEFORE adding points:');
    const dashboardBeforeResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (dashboardBeforeResponse.ok) {
      const dashboardBefore = await dashboardBeforeResponse.json();
      console.log('   Profile:', {
        globalSerialNumber: dashboardBefore.profile?.globalSerialNumber || 0,
        accumulatedPoints: dashboardBefore.profile?.accumulatedPoints || 0,
        currentPointsBalance: dashboardBefore.profile?.currentPointsBalance || 0,
        totalPointsEarned: dashboardBefore.profile?.totalPointsEarned || 0
      });
    }
    
    // Step 3: Add 1500 points
    console.log('\n🎯 Adding 1500 points...');
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
      console.log('✅ Points added successfully');
      console.log('   Global Number awarded:', testResult.globalNumberResult.globalNumberAwarded);
      if (testResult.globalNumberResult.globalNumberAwarded) {
        console.log('   🎉 Global Number:', testResult.globalNumberResult.globalNumber);
      }
      console.log('   Updated profile from test:', testResult.updatedProfile);
    } else {
      console.log('❌ Failed to add points');
      return;
    }
    
    // Step 4: Check dashboard data AFTER adding points
    console.log('\n📊 Dashboard data AFTER adding points:');
    const dashboardAfterResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (dashboardAfterResponse.ok) {
      const dashboardAfter = await dashboardAfterResponse.json();
      console.log('   Profile:', {
        globalSerialNumber: dashboardAfter.profile?.globalSerialNumber || 0,
        accumulatedPoints: dashboardAfter.profile?.accumulatedPoints || 0,
        currentPointsBalance: dashboardAfter.profile?.currentPointsBalance || 0,
        totalPointsEarned: dashboardAfter.profile?.totalPointsEarned || 0
      });
      console.log('   Serial Number:', {
        globalSerialNumber: dashboardAfter.serialNumber?.globalSerialNumber || 0,
        localSerialNumber: dashboardAfter.serialNumber?.localSerialNumber || 0
      });
    }
    
    // Step 5: Check Global Numbers endpoint
    console.log('\n🎯 Global Numbers data:');
    const globalNumbersResponse = await fetch(`${baseUrl}/api/customer/global-numbers`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (globalNumbersResponse.ok) {
      const globalNumbersData = await globalNumbersResponse.json();
      console.log('   Global Numbers:', globalNumbersData);
    }
    
    console.log('\n🎉 Dashboard data test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testDashboardData();