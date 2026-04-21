/**
 * controllers/historyController.js — Lưu và lấy lịch sử tìm kiếm
 * 
 * Firestore path: users/{uid}/history/{historyId}
 */

const { db } = require('../config/firebase');

const MAX_HISTORY = 50; // Giữ tối đa 50 lịch sử / user

/**
 * getHistory — Lấy lịch sử tìm kiếm của user
 * GET /history?limit=20
 */
async function getHistory(req, res, next) {
  try {
    const uid   = req.user.uid;
    const limit = Math.min(Number(req.query.limit) || 20, MAX_HISTORY);

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('history')
      .orderBy('searchedAt', 'desc')
      .limit(limit)
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      searchedAt: doc.data().searchedAt?.toDate().toISOString(),
    }));

    res.json({ history, total: history.length });
  } catch (err) {
    next(err);
  }
}

/**
 * saveHistory — Lưu một lịch sử tìm kiếm
 * POST /history
 * Body: { query, placeId?, name, lat?, lng? }
 */
async function saveHistory(req, res, next) {
  try {
    const uid = req.user.uid;
    const { query, placeId, name, lat, lng } = req.body;

    if (!query && !name) {
      return res.status(400).json({ error: '"query" hoặc "name" là bắt buộc' });
    }

    const userRef     = db.collection('users').doc(uid);
    const historyRef  = userRef.collection('history');

    // Lưu record mới
    const docRef = await historyRef.add({
      query:      query || name,
      placeId:    placeId || null,
      name:       name    || query,
      lat:        lat     || null,
      lng:        lng     || null,
      searchedAt: new Date(),
    });

    // Tự động dọn record cũ nếu vượt giới hạn
    const countSnap = await historyRef.count().get();
    if (countSnap.data().count > MAX_HISTORY) {
      const oldestSnap = await historyRef
        .orderBy('searchedAt', 'asc')
        .limit(1)
        .get();
      if (!oldestSnap.empty) {
        await oldestSnap.docs[0].ref.delete();
      }
    }

    res.status(201).json({
      message:   'Đã lưu lịch sử',
      historyId: docRef.id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * clearHistory — Xóa toàn bộ lịch sử của user
 * DELETE /history
 */
async function clearHistory(req, res, next) {
  try {
    const uid      = req.user.uid;
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('history')
      .get();

    // Batch delete
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ message: 'Đã xóa toàn bộ lịch sử', deleted: snapshot.size });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHistory, saveHistory, clearHistory };
