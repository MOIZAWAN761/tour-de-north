import dotenv from 'dotenv';
dotenv.config();
console.log("🔍 All env keys:", Object.keys(process.env));
console.log(
  "🔍 FIREBASE_PRIVATE_KEY exists?",
  process.env.FIREBASE_PRIVATE_KEY ? "YES" : "NO",
);
if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log(
    "🔍 FIREBASE_PRIVATE_KEY length:",
    process.env.FIREBASE_PRIVATE_KEY.length,
  );
}


export const {
  PORT,
  NODE_ENV,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_PRIVATE_KEY,
  REDIS_URL,
  SUPABASE_DATABASE_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
} = process.env;
