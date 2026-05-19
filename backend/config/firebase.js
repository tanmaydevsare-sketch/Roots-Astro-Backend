const admin = require('firebase-admin');

// Initialize Firebase Admin for ID Token verification
// We only need the projectId to verify tokens (it fetches public keys from Google automatically)
admin.initializeApp({
  projectId: "roots-astro"
});

module.exports = admin;
