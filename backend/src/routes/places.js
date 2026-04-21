/**
 * routes/places.js — Routes cho tìm kiếm địa điểm và direction
 * 
 * GET  /places              → searchPlaces (public, không cần auth)
 * GET  /places/:placeId     → getPlaceDetails (public)
 * GET  /directions          → getDirections (public)
 */

const router = require('express').Router();
const { searchPlaces, getDirections, getPlaceDetails } = require('../controllers/placesController');

// Tìm địa điểm theo query + vị trí
router.get('/', searchPlaces);

// Lấy chi tiết 1 địa điểm
router.get('/:placeId', getPlaceDetails);

// Lấy chỉ đường (mount ở /directions thay vì /places/directions)
// Nhưng để gom vào file này cho gọn
router.get('/route/directions', getDirections);

module.exports = router;
