/**
 * controllers/historyController.js — Lưu và lấy lịch sử tìm kiếm
 * 
 * Firestore path: users/{uid}/history/{historyId}
 */

const { db } = require('../config/firebase');
const axios = require('axios'); // Đã có trong package.json

const MAX_HISTORY = 50; 

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
    console.log('☁️ [AWS Cloud] Đang gửi log sang Lambda...');
    await axios.post(AWS_LAMBDA_URL, data, { timeout: 3000 });
    console.log('☁️ [AWS Cloud] Đã lưu log thành công vào DynamoDB.');
  } catch (err) {
    console.error('☁️ [AWS Cloud] Lỗi gửi log:', err.message);
  }
}

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
 * saveHistory — Lưu một lịch sử tìm kiếm (Firebase + AWS Cloud)
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

    // 1. Lưu vào Firebase (Hệ thống cũ)
    let firebaseHistoryId = null;
    try {
      const docRef = await historyRef.add({
        query:      query || name,
        placeId:    placeId || null,
        name:       name    || query,
        lat:        lat     || null,
        lng:        lng     || null,
        searchedAt: new Date(),
      });
      firebaseHistoryId = docRef.id;
    } catch (fbErr) {
      console.error('⚠️ [Firebase] Lỗi lưu lịch sử:', fbErr.message);
      // Không ném lỗi (next) ở đây để AWS vẫn có thể chạy tiếp
    }

    // 2. Gửi sang AWS Cloud (Hệ thống mới - Ưu tiên hàng đầu cho báo cáo)
    cloudLogger({
      userId: uid,
      query: query || name,
      name: name || query,
      lat,
      lng
    });

    // Tự động dọn record cũ trong Firebase (chỉ chạy nếu historyRef vẫn ổn)
    try {
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
    } catch (e) { /* ignore */ }

    res.status(201).json({
      message:   firebaseHistoryId ? 'Đã lưu lịch sử (Firebase + Cloud Log)' : 'Đã lưu Cloud Log (Firebase tạm lỗi)',
      historyId: firebaseHistoryId,
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
