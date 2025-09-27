// Simple test script to verify Global Number system
const testGlobalNumberSystem = async () => {
  const baseUrl = 'http://localhost:5006';
  
  try {
    // Test 1: Check if StepUp config endpoint works
    console.log('🧪 Testing StepUp Config endpoint...');
    const configResponse = await fetch(`${baseUrl}/api/customer/stepup-config`, {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail but we can see the endpoint structure
      }
    });
    
    console.log('StepUp Config Response Status:', configResponse.status);
    
    // Test 2: Check if Global Number config endpoint works
    console.log('🧪 Testing Global Number Config endpoint...');
    const globalConfigResponse = await fetch(`${baseUrl}/api/customer/global-number-config`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Global Number Config Response Status:', globalConfigResponse.status);
    
    console.log('✅ Basic endpoint tests completed');
    console.log('📝 Note: 401 status is expected without proper authentication');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testGlobalNumberSystem();