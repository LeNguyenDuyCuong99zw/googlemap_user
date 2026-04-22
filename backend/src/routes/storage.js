/**
 * routes/storage.js — Routes cho Google Cloud Storage
 *
 * Tất cả route (trừ /info) yêu cầu xác thực Firebase Auth.
 *
 * POST   /storage/upload              → Upload ảnh lên GCS
 * GET    /storage/photos              → Lấy danh sách ảnh (tùy chọn ?placeId=)
 * DELETE /storage/photos/:encodedFile → Xóa ảnh
 * GET    /storage/info                → Thông tin bucket (dùng cho báo cáo)
 */

const express = require('express');
const router  = express.Router();

const { verifyToken } = require('../middleware/auth');
const {
  upload,
  uploadPhoto,
  getUserPhotos,
  deletePhoto,
  getStorageInfo,
} = require('../controllers/storageController');

// Thông tin bucket (không cần auth — dùng cho demo/báo cáo)
router.get('/info', getStorageInfo);

// Tất cả route bên dưới yêu cầu đăng nhập
router.use(verifyToken);

// POST /storage/upload — multer xử lý multipart/form-data trước khi vào controller
router.post('/upload', upload.single('file'), uploadPhoto);

// GET /storage/photos?placeId=<id>
router.get('/photos', getUserPhotos);

// DELETE /storage/photos/:encodedFileName
router.delete('/photos/:encodedFileName', deletePhoto);

module.exports = router;
