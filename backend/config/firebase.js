const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// On Render/non-GCP environments, we use a service account key from env variables.
// Without it, phone-auth token verification will fail in production — set FIREBASE_SERVICE_ACCOUNT on Render.
let app;

if (admin.apps.length > 0) {
  // Already initialized (e.g., hot-reload in dev)
  app = admin.apps[0];
  console.log('🔥 Firebase Admin SDK: reusing existing app instance.');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin SDK: initialized with Service Account (full auth support).');
  } catch (error) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT JSON is invalid. Falling back to Project ID mode (phone auth verification WILL FAIL in production):', error.message);
    app = admin.initializeApp({ projectId: 'roots-astro' });
  }
} else {
  // Project-ID-only fallback — works locally with Application Default Credentials,
  // but CANNOT verify phone tokens on Render without FIREBASE_SERVICE_ACCOUNT set.
  app = admin.initializeApp({ projectId: 'roots-astro' });
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Firebase Admin SDK: running in production WITHOUT a service account key.');
    console.warn('    Set FIREBASE_SERVICE_ACCOUNT on Render to enable phone OTP verification.');
  } else {
    console.log('🔥 Firebase Admin SDK: initialized with Project ID fallback (dev/ADC mode).');
  }
}

module.exports = admin;
