import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBAEpmJvMhe4H4uGLZe-Qgszzu_xw9Qt3w",
  authDomain: "roots-astro.firebaseapp.com",
  projectId: "roots-astro",
  storageBucket: "roots-astro.firebasestorage.app",
  messagingSenderId: "710048792907",
  appId: "1:710048792907:web:ac90c42cd1877ae73fa8ce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging (Notifications) - Requires service worker for background
let messaging;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.error("Firebase Messaging not supported in this browser:", error);
}
export { messaging };

export default app;
