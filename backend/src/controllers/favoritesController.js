/**
 * controllers/favoritesController.js — CRUD địa điểm yêu thích
 * 
 * Tất cả route cần xác thực (verifyToken middleware).
 * Dữ liệu được lưu theo cấu trúc:
 *   Firestore: users/{uid}/favorites/{favoriteId}
 */

const { db } = require('../config/firebase');

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

    // Kiểm tra đã lưu chưa (tránh duplicate)
    const existing = await db
      .collection('users')
      .doc(uid)
      .collection('favorites')
      .where('placeId', '==', placeId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'Địa điểm đã trong danh sách yêu thích' });
    }

    // Lưu vào Firestore
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
        savedAt: new Date(),        // Firestore sẽ lưu dạng Timestamp
      });

    res.status(201).json({
      message:    'Đã thêm vào yêu thích',
      favoriteId: docRef.id,
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
      return res.status(404).json({ error: 'Tidak ditemukan' });
    }

    await docRef.delete();

    res.json({ message: 'Đã xóa khỏi yêu thích', id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
