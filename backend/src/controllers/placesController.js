/**
 * controllers/placesController.js — Proxy cho Google Maps APIs
 * 
 * Tại sao proxy qua backend?
 * → Ẩn API key khỏi client, thêm rate-limit, cache về sau
 * 
 * Endpoints:
 *   GET /places?query=cafe&lat=10.776&lng=106.700   → Places Nearby/Text Search
 *   GET /directions?origin=A&destination=B           → Directions API
 */

const axios = require('axios');

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE  = 'https://maps.googleapis.com/maps/api/place';
const DIRS_BASE    = 'https://maps.googleapis.com/maps/api/directions';

/**
 * searchPlaces — Tìm địa điểm theo từ khóa + vị trí hiện tại
 * GET /places?query=<string>&lat=<number>&lng=<number>&radius=<number>
 */
async function searchPlaces(req, res, next) {
  try {
    const { query = '', lat, lng, radius = 5000 } = req.query;

    if (!query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Nếu có lat/lng → dùng Nearby Search, không thì Text Search
    let url, params;

    if (lat && lng) {
      // Tìm địa điểm gần vị trí hiện tại
      url = `${PLACES_BASE}/nearbysearch/json`;
      params = {
        keyword:  query,
        location: `${lat},${lng}`,
        radius:   Number(radius),
        key:      MAPS_API_KEY,
        language: 'vi',
      };
    } else {
      // Text search không cần vị trí
      url = `${PLACES_BASE}/textsearch/json`;
      params = {
        query,
        key:      MAPS_API_KEY,
        language: 'vi',
      };
    }

    const { data } = await axios.get(url, { params });

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({
        error:  'Google Places API error',
        detail: data.status,
      });
    }

    // Chuẩn hóa kết quả trả về
    const places = (data.results || []).map(p => ({
      placeId:  p.place_id,
      name:     p.name,
      address:  p.vicinity || p.formatted_address,
      rating:   p.rating,
      lat:      p.geometry?.location?.lat,
      lng:      p.geometry?.location?.lng,
      icon:     p.icon,
      types:    p.types,
      isOpen:   p.opening_hours?.open_now,
    }));

    res.json({ places, total: places.length });
  } catch (err) {
    next(err); // Chuyển lên global error handler
  }
}

/**
 * getDirections — Lấy đường đi giữa 2 điểm
 * GET /directions?origin=<string|lat,lng>&destination=<string|lat,lng>&mode=driving
 */
async function getDirections(req, res, next) {
  try {
    const {
      origin,
      destination,
      mode = 'driving',   // driving | walking | bicycling | transit
    } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        error: '"origin" and "destination" query params are required',
      });
    }

    const { data } = await axios.get(`${DIRS_BASE}/json`, {
      params: {
        origin,
        destination,
        mode,
        key:      MAPS_API_KEY,
        language: 'vi',
        units:    'metric',
      },
    });

    if (data.status !== 'OK') {
      return res.status(502).json({
        error:  'Google Directions API error',
        detail: data.status,
      });
    }

    const route = data.routes[0];
    const leg   = route.legs[0];

    res.json({
      distance:       leg.distance,        // { text: "5.3 km", value: 5300 }
      duration:       leg.duration,        // { text: "12 phút", value: 720 }
      startAddress:   leg.start_address,
      endAddress:     leg.end_address,
      steps:          leg.steps.map(s => ({
        instruction: s.html_instructions,
        distance:    s.distance,
        duration:    s.duration,
        mode:        s.travel_mode,
      })),
      // polyline để vẽ route trên bản đồ
      overviewPolyline: route.overview_polyline.points,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * getPlaceDetails — Lấy chi tiết 1 địa điểm theo placeId
 * GET /places/:placeId
 */
async function getPlaceDetails(req, res, next) {
  try {
    const { placeId } = req.params;

    const { data } = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields:   'name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website',
        key:      MAPS_API_KEY,
        language: 'vi',
      },
    });

    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Place not found', detail: data.status });
    }

    const p = data.result;
    res.json({
      placeId,
      name:     p.name,
      address:  p.formatted_address,
      lat:      p.geometry?.location?.lat,
      lng:      p.geometry?.location?.lng,
      rating:   p.rating,
      phone:    p.formatted_phone_number,
      website:  p.website,
      isOpen:   p.opening_hours?.open_now,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchPlaces, getDirections, getPlaceDetails };
