/**
 * pages/MapPage.jsx — Trang chính với Google Map
 * 
 * Features:
 * - Hiển thị Google Map full-screen
 * - Tìm kiếm địa điểm (Places API)
 * - Lấy chỉ đường (Directions API)
 * - Lưu yêu thích
 * - Lưu lịch sử tìm kiếm tự động
 * - Click vào bản đồ để đặt marker
 */

import { useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { useAuth } from '../context/AuthContext';
import {
  searchPlaces,
  getDirections,
  addFavorite,
  saveHistory,
} from '../services/api';
import PhotoUpload from '../components/PhotoUpload'; // ☁️ GCS Upload

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Vị trí mặc định: TP. Hồ Chí Minh
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

// ── Sub-component: Map với Markers ────────────────────
function MapView({ center, places, selectedPlace, clickedPos, onMapClick, onMarkerClick }) {
  return (
    <Map
      defaultCenter={center}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI={false}
      onClick={(e) => onMapClick(e.detail.latLng)}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Markers cho kết quả tìm kiếm */}
      {places.map(place => (
        <Marker
          key={place.placeId}
          position={{ lat: place.lat, lng: place.lng }}
          title={place.name}
          onClick={() => onMarkerClick(place)}
        />
      ))}

      {/* Marker vị trí click */}
      {clickedPos && (
        <Marker
          position={clickedPos}
          label="📍"
        />
      )}

      {/* InfoWindow cho place được chọn */}
      {selectedPlace && (
        <InfoWindow
          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
          onCloseClick={() => onMarkerClick(null)}
        >
          <div style={{ color: '#111', padding: 4, minWidth: 200 }}>
            <strong style={{ fontSize: 15 }}>{selectedPlace.name}</strong>
            <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>{selectedPlace.address}</p>
            {selectedPlace.rating && (
              <p style={{ fontSize: 12 }}>⭐ {selectedPlace.rating}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

// ── Main MapPage ──────────────────────────────────────
export default function MapPage() {
  const { user, logout } = useAuth();

  // State
  const [query,        setQuery]        = useState('');
  const [origin,       setOrigin]       = useState('');
  const [destination,  setDestination]  = useState('');
  const [places,       setPlaces]       = useState([]);
  const [directions,   setDirections]   = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [clickedPos,   setClickedPos]   = useState(null);
  const [activeTab,    setActiveTab]    = useState('search'); // 'search' | 'directions'
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState('');
  const [photoPlace,   setPhotoPlace]   = useState(null); // ☁️ GCS: địa điểm đang xem ảnh

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Tìm kiếm địa điểm ────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchPlaces(query);
      setPlaces(data.places || []);

      // Tự động lưu lịch sử
      await saveHistory({ query, name: query });

      if (data.places.length === 0) showToast('Không tìm thấy kết quả nào');
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Lấy chỉ đường ────────────────────────────────
  const handleDirections = async (e) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const data = await getDirections(origin, destination);
      setDirections(data);
      setPlaces([]); // Xóa markers tìm kiếm
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Lưu yêu thích ────────────────────────────────
  const handleSaveFavorite = async (place) => {
    try {
      await addFavorite({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      });
      showToast(`✅ Đã lưu "${place.name}" vào yêu thích`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleMapClick = useCallback((latLng) => {
    setClickedPos(latLng);
    setSelectedPlace(null);
  }, []);

  const handleMarkerClick = useCallback((place) => {
    setSelectedPlace(place);
  }, []);

  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      libraries={['places', 'geometry']}
      onLoad={() => console.log('✅ Google Maps loaded')}
      onError={(e) => console.error('❌ Maps error:', e)}
    >
      <div className="app-layout">
        {/* ── Sidebar ──────────────────────────────── */}
        <aside className="sidebar">
          {/* Header */}
          <div className="sidebar__header">
            <span style={{ fontSize: 24 }}>🗺️</span>
            <div style={{ flex: 1 }}>
              <div className="sidebar__logo">GGMap</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {user?.displayName || user?.email}
              </div>
            </div>
            <button
              id="btn-logout"
              className="btn btn-ghost"
              onClick={logout}
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              Thoát
            </button>
          </div>

          <div className="sidebar__content">
            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                🔍 Tìm kiếm
              </button>
              <button
                className={`tab-btn ${activeTab === 'directions' ? 'active' : ''}`}
                onClick={() => setActiveTab('directions')}
              >
                🧭 Chỉ đường
              </button>
            </div>

            {/* ── Tab: Tìm kiếm ──────────────────── */}
            {activeTab === 'search' && (
              <div className="card">
                <div className="card__title">Tìm địa điểm</div>
                <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    id="input-search-query"
                    className="input"
                    type="text"
                    placeholder="Café, bệnh viện, ATM..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                  <button
                    id="btn-search"
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !query.trim()}
                  >
                    {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Tìm'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Tab: Chỉ đường ─────────────────── */}
            {activeTab === 'directions' && (
              <div className="card">
                <div className="card__title">Tìm đường đi</div>
                <form onSubmit={handleDirections} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    id="input-origin"
                    className="input"
                    type="text"
                    placeholder="Điểm xuất phát"
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                  />
                  <input
                    id="input-destination"
                    className="input"
                    type="text"
                    placeholder="Điểm đến"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                  />
                  <button
                    id="btn-get-directions"
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !origin || !destination}
                  >
                    {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Tìm đường'}
                  </button>
                </form>

                {/* Kết quả chỉ đường */}
                {directions && (
                  <div style={{ marginTop: 16 }}>
                    <div className="directions-info">
                      <div className="directions-stat">
                        <span className="directions-stat__value">{directions.distance?.text}</span>
                        <span className="directions-stat__label">Khoảng cách</span>
                      </div>
                      <div className="directions-stat">
                        <span className="directions-stat__value">{directions.duration?.text}</span>
                        <span className="directions-stat__label">Thời gian</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <p>📍 {directions.startAddress}</p>
                      <p style={{ marginTop: 4 }}>🏁 {directions.endAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Kết quả tìm kiếm ───────────────── */}
            {places.length > 0 && (
              <div className="card">
                <div className="card__title">
                  {places.length} kết quả
                  <button
                    className="btn btn-ghost"
                    onClick={() => setPlaces([])}
                    style={{ float: 'right', padding: '2px 8px', fontSize: 12 }}
                  >
                    Xóa
                  </button>
                </div>
                <div className="place-list">
                  {places.map((place, idx) => (
                    <div
                      key={place.placeId || idx}
                      className="place-item"
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="place-item__icon">📍</div>
                      <div className="place-item__info">
                        <div className="place-item__name">{place.name}</div>
                        <div className="place-item__addr">{place.address}</div>
                        {place.rating && (
                          <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>
                            ⭐ {place.rating}
                          </div>
                        )}
                      </div>
                      <button
                        id={`btn-save-fav-${idx}`}
                        className="btn btn-ghost place-item__action"
                        style={{ fontSize: 18, padding: 4 }}
                        title="Lưu yêu thích"
                        onClick={(e) => { e.stopPropagation(); handleSaveFavorite(place); }}
                      >
                        🤍
                      </button>
                      <button
                        id={`btn-photo-${idx}`}
                        className="btn btn-ghost place-item__action"
                        style={{ fontSize: 18, padding: 4 }}
                        title="☁️ Upload ảnh lên Cloud Storage"
                        onClick={(e) => { e.stopPropagation(); setPhotoPlace(place); }}
                      >
                        📷
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clicked position info */}
            {clickedPos && (
              <div className="card" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <div className="card__title">Vị trí đã chọn</div>
                <p>Lat: {clickedPos.lat.toFixed(6)}</p>
                <p>Lng: {clickedPos.lng.toFixed(6)}</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Map ──────────────────────────────────── */}
        <main className="map-container">
          <MapView
            center={DEFAULT_CENTER}
            places={places}
            selectedPlace={selectedPlace}
            clickedPos={clickedPos}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
          />
        </main>
      </div>

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}

      {/* ☁️ Google Cloud Storage — Photo Upload Modal */}
      {photoPlace && (
        <PhotoUpload
          place={photoPlace}
          onClose={() => setPhotoPlace(null)}
        />
      )}
    </APIProvider>
  );
}
