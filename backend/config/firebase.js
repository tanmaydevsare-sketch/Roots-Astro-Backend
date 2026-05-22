const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// On Render/non-GCP environments, we use a service account key from env variables
let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin SDK initialized successfully with Service Account Key.");
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Falling back to default initialization:", error);
    app = admin.initializeApp({
      projectId: "roots-astro"
    });
  }
} else {
  app = admin.initializeApp({
    projectId: "roots-astro"
  });
  console.log("🔥 Firebase Admin SDK initialized with Project ID fallback.");
}

module.exports = admin;

