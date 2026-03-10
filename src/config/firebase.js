// src/config/firebase.js
import admin from "firebase-admin";
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_STORAGE_BUCKET,
} from "./env.js";

// Convert the private key string: replace '\n' with actual line breaks
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

const serviceAccount = {
  projectId: FIREBASE_PROJECT_ID,
  clientEmail: FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: FIREBASE_STORAGE_BUCKET, // optional
});

export default admin;
