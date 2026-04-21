/**
 * routes/favorites.js — Routes cho địa điểm yêu thích
 * 
 * Tất cả routes đều yêu cầu xác thực (verifyToken)
 * 
 * GET    /favorites      → getFavorites
 * POST   /favorites      → addFavorite
 * DELETE /favorites/:id  → removeFavorite
 */

const router     = require('express').Router();
const { verifyToken }      = require('../middleware/auth');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoritesController');

// Áp dụng auth middleware cho tất cả routes trong file này
router.use(verifyToken);

router.get('/',     getFavorites);
router.post('/',    addFavorite);
router.delete('/:id', removeFavorite);

module.exports = router;
