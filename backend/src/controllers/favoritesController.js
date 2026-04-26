/**
 * controllers/favoritesController.js — CRUD địa điểm yêu thích
 * 
 * Tất cả route cần xác thực (verifyToken middleware).
 * Dữ liệu được lưu theo cấu trúc:
 *   Firestore: users/{uid}/favorites/{favoriteId}
 */

const { db } = require('../config/firebase');
const axios = require('axios');

/**
 * cloudLogger — Gửi log sang AWS Lambda (Dành cho báo cáo đề tài)
 */
async function cloudLogger(data) {
  const AWS_LAMBDA_URL = process.env.AWS_CLOUD_LOG_URL;
  
  if (!AWS_LAMBDA_URL) {
    console.log('☁️ [AWS Cloud] Chưa cấu hình URL. Bỏ qua gửi log cloud.');
    return;
  }

  try {
    console.log(`☁️ [AWS Cloud] Đang gửi log ${data.actionType} sang Lambda...`);
    await axios.post(AWS_LAMBDA_URL, data, { timeout: 3000 });
    console.log('☁️ [AWS Cloud] Đã lưu log thành công vào DynamoDB.');
  } catch (err) {
    console.error('☁️ [AWS Cloud] Lỗi gửi log:', err.message);
  }
}

/**
 * getFavorites — Lấy danh sách địa điểm yêu thích của user đang login
 * GET /favorites
 */
async function getFavorites(req, res, next) {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('favorites')
      .orderBy('savedAt', 'desc')
      .get();

    const favorites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Chuyển Firestore Timestamp → ISO string để client dễ dùng
      savedAt: doc.data().savedAt?.toDate().toISOString(),
    }));

    res.json({ favorites, total: favorites.length });
  } catch (err) {
    next(err);
  }
}

/**
 * addFavorite — Thêm địa điểm vào danh sách yêu thích
 * POST /favorites
 * Body: { placeId, name, address, lat, lng }
 */
async function addFavorite(req, res, next) {
  try {
    const uid = req.user.uid;
    const { placeId, name, address, lat, lng } = req.body;

    // Validate input
    if (!placeId || !name) {
      return res.status(400).json({
        error: '"placeId" và "name" là bắt buộc',
      });
    }

    // 1. Lưu vào Firebase (Hệ thống cũ)
    let firebaseFavoriteId = null;
    try {
        // Kiểm tra đã lưu chưa (tránh duplicate)
        const existing = await db
        .collection('users')
        .doc(uid)
        .collection('favorites')
        .where('placeId', '==', placeId)
        .limit(1)
        .get();

        if (existing.empty) {
            const docRef = await db
            .collection('users')
            .doc(uid)
            .collection('favorites')
            .add({
                placeId,
                name,
                address: address || '',
                lat:     lat    || null,
                lng:     lng    || null,
                savedAt: new Date(),
            });
            firebaseFavoriteId = docRef.id;
        } else {
            firebaseFavoriteId = existing.docs[0].id;
        }
    } catch (fbErr) {
        console.error('⚠️ [Firebase] Lỗi lưu favorites:', fbErr.message);
    }

    // 2. Gửi sang AWS Cloud (Hệ thống mới)
    cloudLogger({
        userId: uid,
        actionType: 'FAVORITE',
        query: `Favorite: ${name}`,
        name: name,
        lat,
        lng
    });

    res.status(201).json({
      message:    firebaseFavoriteId ? 'Đã thêm vào yêu thích (Firebase + Cloud Log)' : 'Đã lưu Cloud Log (Firebase lỗi)',
      favoriteId: firebaseFavoriteId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * removeFavorite — Xóa địa điểm khỏi danh sách yêu thích
 * DELETE /favorites/:id
 */
async function removeFavorite(req, res, next) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const docRef = db
      .collection('users')
      .doc(uid)
      .collection('favorites')
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy' });
    }

    await docRef.delete();

    res.json({ message: 'Đã xóa khỏi yêu thích', id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
