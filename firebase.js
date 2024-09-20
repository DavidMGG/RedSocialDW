const admin = require('firebase-admin');
const serviceAccount = require('./google-services.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'krolcakes-3b319.appspot.com'
});

const bucket = admin.storage().bucket();
module.exports = bucket;


