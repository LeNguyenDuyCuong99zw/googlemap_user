/**
 * middleware/auth.js — Xác thực Firebase JWT
 * 
 * Middleware này được mount trước các route cần đăng nhập.
 * Client phải gửi: Authorization: Bearer <Firebase ID Token>
 * 
 * Nếu token hợp lệ → gán req.user = { uid, email, ... } và gọi next()
 * Nếu không → trả 401 Unauthorized
 */

const { auth } = require('../config/firebase');

/**
 * verifyToken — Verify Firebase ID Token từ Authorization header
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Kiểm tra header có định dạng "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Authorization header',
      });
    }

    const idToken = authHeader.split(' ')[1];

    // Verify token với Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(idToken);

    // Lưu thông tin user vào request để controller dùng
    req.user = {
      uid:   decodedToken.uid,
      email: decodedToken.email,
      name:  decodedToken.name,
    };

    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.code, err.message);

    // Phân biệt các loại lỗi Firebase Auth
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { verifyToken };
