import https from 'https';

console.log('Testing HTTPS connection to Hugging Face...');

const options = {
  hostname: 'api-inference.huggingface.co',
  port: 443,
  path: '/',
  method: 'HEAD',
  timeout: 10000,
};

const req = https.request(options, (res) => {
  console.log('✅ Connection successful! Status:', res.statusCode);
});

req.on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
  console.error('Error code:', err.code);
});

req.on('timeout', () => {
  console.error('❌ Connection timeout');
  req.destroy();
});

req.end();
