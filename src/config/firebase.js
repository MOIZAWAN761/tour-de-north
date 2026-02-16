// config/firebase.js
// src/config/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Path to your service account JSON
const serviceAccountPath = path.resolve(
  "src/config/mansehra-police-tourist-88e9e-firebase-adminsdk-fbsvc-ec2da30244.json"
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
