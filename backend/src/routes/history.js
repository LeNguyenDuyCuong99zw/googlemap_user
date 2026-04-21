/**
 * routes/history.js — Routes cho lịch sử tìm kiếm
 * 
 * GET    /history   → getHistory
 * POST   /history   → saveHistory
 * DELETE /history   → clearHistory
 */

const router = require('express').Router();
const { verifyToken }                          = require('../middleware/auth');
const { getHistory, saveHistory, clearHistory } = require('../controllers/historyController');

// Auth bắt buộc
router.use(verifyToken);

router.get('/',    getHistory);
router.post('/',   saveHistory);
router.delete('/', clearHistory);

module.exports = router;
