const fetch = require('node-fetch');

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbz4PPsNoq5IbAG_0m1qGBTRwrZnd_VLKOKCMlfJKgp3RZMsGexTd-N7yt0SQatmuNq5/exec';

async function test() {
  try {
    const response = await fetch(`${GAS_API_URL}?sheet=Usuarios`);
    const data = await response.json();
    console.log('Raw data keys:', Object.keys(data));
    const users = data.Usuarios || data.usuarios || [];
    console.log('Total users:', users.length);
    if (users.length > 0) {
      console.log('First user:', JSON.stringify(users[0], null, 2));
      const roles = [...new Set(users.map(u => u.UserType || u.usertype || u.role || 'no-role'))];
      console.log('Unique roles:', roles);
    }
  } catch (e) {
    console.error(e);
  }
}

test();
