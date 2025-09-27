// Test simple endpoint
const testSimpleEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:5006/api/customer/test-simple');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testSimpleEndpoint();