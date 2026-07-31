const https = require('https');

const options = {
  hostname: 'woqotssnklsarpvkalrw.supabase.co',
  path: '/rest/v1/users?select=*',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_RIIwAnyfoXiAL_kFUVDGoQ_RUftl-1W',
    'Authorization': 'Bearer sb_publishable_RIIwAnyfoXiAL_kFUVDGoQ_RUftl-1W'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS CODE: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(`RESPONSE BODY:\n${data}`));
});

req.on('error', (e) => console.error(`REQ ERROR: ${e.message}`));
req.end();
