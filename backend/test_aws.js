const axios = require('axios');

async function testLambda() {
  const url = 'https://ilymibyahd.execute-api.ap-southeast-1.amazonaws.com/default/LogMapSearchHistory';
  const testData = {
    userId: "test_user_123",
    query: "Test Search from Assistant",
    name: "Bitexco Tower",
    lat: 10.776,
    lng: 106.700
  };

  console.log('🚀 Đang thử gọi API của bạn...');
  try {
    const response = await axios.post(url, testData);
    console.log('✅ Thành công! Phản hồi từ Lambda:', response.data);
  } catch (error) {
    console.error('❌ Thất bại!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testLambda();
