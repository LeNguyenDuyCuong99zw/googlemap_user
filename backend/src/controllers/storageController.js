/**
 * controllers/storageController.js — Google Cloud Storage (GCS)
 *
 * Dịch vụ lưu trữ đối tượng đám mây (Object Storage).
 * Cho phép user upload ảnh địa điểm lên GCS bucket.
 *
 * Luồng hoạt động:
 *   Client gửi file → Backend nhận (multer) → Upload lên GCS → Trả về public URL
 *
 * Endpoints:
 *   POST   /storage/upload        → Upload ảnh lên GCS
 *   GET    /storage/photos        → Lấy danh sách ảnh của user
 *   DELETE /storage/photos/:name  → Xóa ảnh khỏi GCS
 */

const { Storage } = require('@google-cloud/storage');
const multer      = require('multer');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');

// ── Khởi tạo GCS client ────────────────────────────────────────────────────
// Khi chạy trên Cloud Run → dùng Workload Identity (không cần key file)
// Khi chạy local → dùng GOOGLE_APPLICATION_CREDENTIALS hoặc gcloud auth
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ggmap-place-photos';
const bucket      = storage.bucket(BUCKET_NAME);

// ── Multer — lưu file vào RAM (memoryStorage) để stream lên GCS ───────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload ảnh (jpeg, png, webp, gif)'));
    }
  },
});

/**
 * uploadPhoto — Upload ảnh địa điểm lên Google Cloud Storage
 * POST /storage/upload
 * Form-data: file=<image>, placeId=<string>, placeName=<string>
 */
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được gửi lên' });
    }

    const uid       = req.user.uid;
    const placeId   = req.body.placeId   || 'unknown';
    const placeName = req.body.placeName || 'unknown';

    // Tên file duy nhất: users/<uid>/places/<placeId>/<uuid>.<ext>
    const ext      = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const fileName = `users/${uid}/places/${placeId}/${uuidv4()}${ext}`;

    const blob    = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,  // Dùng single-request upload cho file nhỏ
      contentType: req.file.mimetype,
      metadata: {
        // Custom metadata — có thể query sau
        metadata: {
          uploadedBy: uid,
          placeId,
          placeName,
          originalName: req.file.originalname,
        },
      },
    });

    blobStream.on('error', next);

    blobStream.on('finish', async () => {
      // Tạo public URL (bucket phải bật uniform bucket-level access + allUsers read)
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

      console.log(`☁️  [GCS] Uploaded: ${fileName} (${req.file.size} bytes)`);

      res.status(201).json({
        message:   'Upload thành công lên Google Cloud Storage',
        fileName,
        publicUrl,
        size:      req.file.size,
        placeId,
        placeName,
      });
    });

    blobStream.end(req.file.buffer);

  } catch (err) {
    next(err);
  }
}

/**
 * getUserPhotos — Liệt kê ảnh của user từ GCS
 * GET /storage/photos?placeId=<string>
 */
async function getUserPhotos(req, res, next) {
  try {
    const uid     = req.user.uid;
    const placeId = req.query.placeId;

    // Prefix để chỉ lấy ảnh của user này
    const prefix = placeId
      ? `users/${uid}/places/${placeId}/`
      : `users/${uid}/`;

    const [files] = await bucket.getFiles({ prefix });

    const photos = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          fileName:   file.name,
          publicUrl:  `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          size:       metadata.size,
          contentType: metadata.contentType,
          createdAt:  metadata.timeCreated,
          placeId:    metadata.metadata?.placeId,
          placeName:  metadata.metadata?.placeName,
        };
      })
    );

    res.json({ photos, total: photos.length });

  } catch (err) {
    next(err);
  }
}

/**
 * deletePhoto — Xóa ảnh khỏi GCS
 * DELETE /storage/photos/:encodedFileName
 * Param: encodedFileName = encodeURIComponent(fileName)
 */
async function deletePhoto(req, res, next) {
  try {
    const uid      = req.user.uid;
    const fileName = decodeURIComponent(req.params.encodedFileName);

    // Bảo mật: chỉ xóa được file trong thư mục của chính user
    if (!fileName.startsWith(`users/${uid}/`)) {
      return res.status(403).json({ error: 'Không có quyền xóa file này' });
    }

    await bucket.file(fileName).delete();

    console.log(`🗑️  [GCS] Deleted: ${fileName}`);

    res.json({ message: 'Đã xóa ảnh khỏi Cloud Storage', fileName });

  } catch (err) {
    if (err.code === 404) {
      return res.status(404).json({ error: 'File không tồn tại trong Cloud Storage' });
    }
    next(err);
  }
}

/**
 * getStorageInfo — Thông tin về bucket (dùng cho dashboard/báo cáo)
 * GET /storage/info
 */
async function getStorageInfo(req, res, next) {
  try {
    const [metadata] = await bucket.getMetadata();

    res.json({
      bucketName:  BUCKET_NAME,
      location:    metadata.location,
      storageClass: metadata.storageClass,
      projectId:   metadata.projectNumber,
      created:     metadata.timeCreated,
      service:     'Google Cloud Storage',
      description: 'Object Storage Service — lưu trữ ảnh địa điểm đám mây',
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,            // multer middleware — dùng trong route
  uploadPhoto,
  getUserPhotos,
  deletePhoto,
  getStorageInfo,
};
