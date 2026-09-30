const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'jwk' },
  privateKeyEncoding: { type: 'pkcs8', format: 'jwk' },
});
const pubX = Buffer.from(publicKey.x, 'base64');
const pubY = Buffer.from(publicKey.y, 'base64');
const rawPub = Buffer.concat([Buffer.from([0x04]), pubX, pubY]);
const vapidPublic = rawPub.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const vapidPrivate = Buffer.from(privateKey.d, 'base64').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log('VAPID Public Key:', vapidPublic);
console.log('VAPID Private Key:', vapidPrivate);
