// Comprehensive debug test for Global Number system
const debugGlobalNumber = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    console.log('🔍 COMPREHENSIVE GLOBAL NUMBER DEBUG TEST\n');
    
    // Step 1: Login as customer
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
    console.log(`   User ID: ${loginData.user.id}`);
    console.log(`   Role: ${loginData.user.role}`);
    
    // Step 2: Check initial dashboard state
    console.log('\n📊 Step 2: Check initial dashboard state...');
    const dashboardResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (dashboardResponse.ok) {
      const dashboard = await dashboardResponse.json();
      console.log('✅ Dashboard data retrieved');
      console.log('   Profile data:', {
        globalSerialNumber: dashboard.profile?.globalSerialNumber,
        accumulatedPoints: dashboard.profile?.accumulatedPoints,
        currentPointsBalance: dashboard.profile?.currentPointsBalance,
        totalPointsEarned: dashboard.profile?.totalPointsEarned
      });
      console.log('   Serial Number data:', dashboard.serialNumber);
      console.log('   Wallet data:', {
        pointsBalance: dashboard.wallet?.pointsBalance,
        totalPointsEarned: dashboard.wallet?.totalPointsEarned
      });
    } else {
      console.log('❌ Failed to get dashboard data');
      return;
    }
    
    // Step 3: Check Global Number configuration
    console.log('\n⚙️ Step 3: Check Global Number configuration...');
    const configResponse = await fetch(`${baseUrl}/api/customer/global-number-config`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Global Number config:', config);
    } else {
      console.log('❌ Failed to get Global Number config');
    }
    
    // Step 4: Check StepUp configuration
    console.log('\n🎯 Step 4: Check StepUp configuration...');
    const stepUpResponse = await fetch(`${baseUrl}/api/customer/stepup-config`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (stepUpResponse.ok) {
      const stepUpConfig = await stepUpResponse.json();
      console.log('✅ StepUp config:', stepUpConfig);
    } else {
      console.log('❌ Failed to get StepUp config');
    }
    
    // Step 5: Check existing Global Numbers
    console.log('\n🏆 Step 5: Check existing Global Numbers...');
    const globalNumbersResponse = await fetch(`${baseUrl}/api/customer/global-numbers`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (globalNumbersResponse.ok) {
      const globalNumbers = await globalNumbersResponse.json();
      console.log('✅ Existing Global Numbers:', globalNumbers);
    } else {
      console.log('❌ Failed to get Global Numbers');
    }
    
    // Step 6: Test adding 1500 points
    console.log('\n🎯 Step 6: Test adding 1500 points...');
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
      console.log('✅ Test earn points result:');
      console.log('   Success:', testResult.success);
      console.log('   Points added:', testResult.pointsAdded);
      console.log('   Global Number result:', testResult.globalNumberResult);
      console.log('   Updated profile:', testResult.updatedProfile);
      console.log('   Message:', testResult.message);
    } else {
      console.log('❌ Failed to add points');
      const errorText = await testResponse.text();
      console.log('   Error:', errorText);
      return;
    }
    
    // Step 7: Check dashboard after adding points
    console.log('\n📊 Step 7: Check dashboard AFTER adding points...');
    const dashboardAfterResponse = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (dashboardAfterResponse.ok) {
      const dashboardAfter = await dashboardAfterResponse.json();
      console.log('✅ Dashboard data after adding points:');
      console.log('   Profile data:', {
        globalSerialNumber: dashboardAfter.profile?.globalSerialNumber,
        accumulatedPoints: dashboardAfter.profile?.accumulatedPoints,
        currentPointsBalance: dashboardAfter.profile?.currentPointsBalance,
        totalPointsEarned: dashboardAfter.profile?.totalPointsEarned
      });
      console.log('   Serial Number data:', dashboardAfter.serialNumber);
      console.log('   Wallet data:', {
        pointsBalance: dashboardAfter.wallet?.pointsBalance,
        totalPointsEarned: dashboardAfter.wallet?.totalPointsEarned
      });
    } else {
      console.log('❌ Failed to get dashboard data after adding points');
    }
    
    // Step 8: Check Global Numbers after adding points
    console.log('\n🏆 Step 8: Check Global Numbers AFTER adding points...');
    const globalNumbersAfterResponse = await fetch(`${baseUrl}/api/customer/global-numbers`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (globalNumbersAfterResponse.ok) {
      const globalNumbersAfter = await globalNumbersAfterResponse.json();
      console.log('✅ Global Numbers after adding points:', globalNumbersAfter);
    } else {
      console.log('❌ Failed to get Global Numbers after adding points');
    }
    
    console.log('\n🎉 DEBUG TEST COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log('   - If Global Number system is working: profile.globalSerialNumber should be > 0');
    console.log('   - If dashboard is working: serialNumber.globalSerialNumber should match profile.globalSerialNumber');
    console.log('   - If frontend is working: The UI should show the Global Number from serialNumber');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
};

debugGlobalNumber();