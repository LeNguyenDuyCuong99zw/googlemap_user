/**
 * config/firebase.js — Khởi tạo Firebase Admin SDK
 * 
 * Firebase Admin dùng ở backend để:
 * 1. Verify Firebase ID Token (xác thực user)
 * 2. Đọc/ghi Firestore
 */

const admin = require('firebase-admin');

// Kiểm tra xem Firebase đã init chưa (tránh init nhiều lần khi hot-reload)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      // Biến môi trường lưu \n dạng string, cần replace
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId:    process.env.FIREBASE_CLIENT_ID,
    }),
  });
  console.log('🔥 Firebase Admin SDK initialized');
}

const db   = admin.firestore();  // Firestore instance
const auth = admin.auth();       // Auth instance

module.exports = { admin, db, auth };
