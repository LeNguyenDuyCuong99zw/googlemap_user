/**
 * services/api.js — Axios instance để gọi backend API
 * 
 * Tự động:
 * - Gắn Authorization header với Firebase token
 * - Refresh token nếu nhận được 401
 * - Xử lý lỗi mạng
 */

import axios from 'axios';
import { auth } from '../config/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: gắn token ─────────────────────
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));

// ── Response interceptor: xử lý lỗi ───────────────────
api.interceptors.response.use(
  (response) => response.data,  // Unwrap .data tự động
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token hết hạn → force refresh rồi retry 1 lần
      const user = auth.currentUser;
      if (user) {
        const newToken = await user.getIdToken(true); // force refresh
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config).then(r => r.data);
      }
    }

    // Lấy error message từ backend
    const message = error.response?.data?.error
      || error.message
      || 'Lỗi kết nối đến server';

    return Promise.reject(new Error(message));
  }
);

// ── API Functions ───────────────────────────────────────

/** Tìm địa điểm */
export const searchPlaces = (query, lat, lng) =>
  api.get('/places', { params: { query, lat, lng } });

/** Lấy chi tiết địa điểm */
export const getPlaceDetails = (placeId) =>
  api.get(`/places/${placeId}`);

/** Lấy chỉ đường */
export const getDirections = (origin, destination, mode = 'driving') =>
  api.get('/places/route/directions', { params: { origin, destination, mode } });

/** Lấy danh sách yêu thích */
export const getFavorites = () =>
  api.get('/favorites');

/** Thêm yêu thích */
export const addFavorite = (place) =>
  api.post('/favorites', place);

/** Xóa yêu thích */
export const removeFavorite = (id) =>
  api.delete(`/favorites/${id}`);

/** Lưu lịch sử */
export const saveHistory = (entry) =>
  api.post('/history', entry);

/** Lấy lịch sử */
export const getHistory = (limit = 20) =>
  api.get('/history', { params: { limit } });

/** Xóa toàn bộ lịch sử */
export const clearHistory = () =>
  api.delete('/history');

// ── ☁️ Google Cloud Storage APIs ────────────────────────

/**
 * Upload ảnh địa điểm lên Google Cloud Storage
 * @param {File} file - File ảnh từ input
 * @param {string} placeId - ID địa điểm
 * @param {string} placeName - Tên địa điểm
 */
export const uploadPhoto = async (file, placeId, placeName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('placeId', placeId);
  formData.append('placeName', placeName);

  // Lấy token riêng vì Content-Type phải là multipart/form-data
  const { auth } = await import('../config/firebase');
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || '/api'}/storage/upload`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Upload thất bại');
  }
  return response.json();
};

/** Lấy danh sách ảnh đã upload (tùy chọn lọc theo placeId) */
export const getUserPhotos = (placeId) =>
  api.get('/storage/photos', { params: placeId ? { placeId } : {} });

/** Xóa ảnh khỏi Cloud Storage */
export const deletePhoto = (fileName) =>
  api.delete(`/storage/photos/${encodeURIComponent(fileName)}`);

/** Thông tin GCS bucket (dùng cho báo cáo / dashboard) */
export const getStorageInfo = () =>
  api.get('/storage/info');

export default api;
