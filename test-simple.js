// Simple test to check server status
const testServer = async () => {
  try {
    const response = await fetch('http://localhost:5006/api/customer/stepup-config');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response:', text.substring(0, 200));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testServer();