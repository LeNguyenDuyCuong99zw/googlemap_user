import { useState, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, GeolocateControl, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '../context/AuthContext';
import { searchPlaces, getDirections, addFavorite, saveHistory } from '../services/api';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const AWS_MAP_API_KEY = import.meta.env.VITE_AWS_MAP_API_KEY;
const AWS_MAP_NAME = import.meta.env.VITE_AWS_MAP_NAME || 'Map';
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-southeast-1';

const MAP_STYLE = `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${AWS_MAP_NAME}/style-descriptor?key=${AWS_MAP_API_KEY}`;
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

function CustomMarker({ place, isSelected, onClick }) {
  return (
    <Marker
      longitude={place.lng}
      latitude={place.lat}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(place);
      }}
    >
      <div className={`custom-marker ${isSelected ? 'marker-selected' : ''}`}>
        <div className="marker-pulse"></div>
        <div className="marker-core">
          <DotLottieReact
            src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
            loop
            autoplay
          />
        </div>
      </div>
    </Marker>
  );
}

export default function MapPage() {
  const { user, logout } = useAuth();

  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [places, setPlaces] = useState([]);
  const [directions, setDirections] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [clickedPos, setClickedPos] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [suggestions, setSuggestions] = useState({ origin: [], destination: [] });
  const [activeInput, setActiveInput] = useState(null); // 'origin' or 'destination'

  const [viewState, setViewState] = useState({
    longitude: DEFAULT_CENTER.lng,
    latitude: DEFAULT_CENTER.lat,
    zoom: 13
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchPlaces(query);
      setPlaces(data.places || []);
      
      if (data.places && data.places.length > 0) {
        setViewState(prev => ({
          ...prev,
          longitude: data.places[0].lng,
          latitude: data.places[0].lat,
          zoom: 14,
          transitionDuration: 1200
        }));
      }

      await saveHistory({ query, name: query });
      if (data.places.length === 0) showToast('Không tìm thấy địa điểm');
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (type, val) => {
    if (type === 'origin') setOrigin(val);
    else setDestination(val);

    if (val.length > 2) {
      try {
        const data = await searchPlaces(val);
        setSuggestions(prev => ({ ...prev, [type]: data.places || [] }));
        setActiveInput(type);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions(prev => ({ ...prev, [type]: [] }));
    }
  };

  const selectSuggestion = (type, place) => {
    const coords = `${place.lat},${place.lng}`;
    if (type === 'origin') setOrigin(coords);
    else setDestination(coords);
    setSuggestions(prev => ({ ...prev, [type]: [] }));
    setActiveInput(null);
  };

  const handleDirections = async (e) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const data = await getDirections(origin, destination);
      setDirections(data);
      setPlaces([]); 
      
      // Gửi log Cloud khi tìm đường thành công
      await saveHistory({ 
        query: `Route: ${origin} to ${destination}`, 
        name: `Directions to ${destination}` 
      });

      if (data.geometry && data.geometry.length > 0) {
        setViewState(prev => ({
          ...prev,
          longitude: data.geometry[0][0],
          latitude: data.geometry[0][1],
          zoom: 13,
          transitionDuration: 1200
        }));
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFavorite = async (place) => {
    try {
      await addFavorite({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      });
      showToast(`🤍 Đã lưu "${place.name}"`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const routeGeojson = useMemo(() => {
    if (!directions?.geometry) return null;
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: directions.geometry }
    };
  }, [directions]);

  return (
    <div className="map-app-container">
      {/* ── MAP LAYER ───────────────────────────────── */}
      <div className="map-layer">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLE}
          onClick={(e) => {
            if (e.lngLat) {
              setClickedPos({ lat: e.lngLat.lat, lng: e.lngLat.lng });
              setSelectedPlace(null);
              setPlaces([]); // Xóa danh sách tìm kiếm khi chọn điểm mới trên bản đồ
            }
          }}
        >
          <GeolocateControl 
            position="bottom-right" 
            trackUserLocation={true} 
            onGeolocate={(e) => {
              // Khi định vị được vị trí người dùng, cập nhật viewState để bản đồ di chuyển tới đó
              setViewState(prev => ({
                ...prev,
                longitude: e.coords.longitude,
                latitude: e.coords.latitude,
                zoom: 15,
                transitionDuration: 1000
              }));
            }}
          />
          <NavigationControl position="bottom-right" showCompass={false} />

          {selectedPlace && (
            <Popup
              longitude={selectedPlace.lng}
              latitude={selectedPlace.lat}
              anchor="top"
              onClose={() => setSelectedPlace(null)}
              closeButton={false}
              maxWidth="300px"
            >
              <div className="modern-popup">
                <div className="popup-name">{selectedPlace.name}</div>
                <div className="popup-address">{selectedPlace.address}</div>
                <div className="popup-actions">
                  <button className="popup-btn" onClick={() => {
                    setOrigin('Vị trí của bạn');
                    setDestination(`${selectedPlace.lat},${selectedPlace.lng}`);
                    setActiveTab('directions');
                  }}>
                    Chỉ đường
                  </button>
                </div>
              </div>
            </Popup>
          )}

          {places.map(place => (
            <CustomMarker
              key={place.placeId}
              place={place}
              isSelected={selectedPlace?.placeId === place.placeId}
              onClick={(p) => {
                setSelectedPlace(p);
                setClickedPos(null); // Xóa điểm click thủ công khi chọn một kết quả tìm kiếm
                setViewState(prev => ({
                  ...prev,
                  longitude: p.lng,
                  latitude: p.lat,
                  zoom: 15,
                  transitionDuration: 1000
                }));
              }}
            />
          ))}

          {clickedPos && (
            <Marker longitude={clickedPos.lng} latitude={clickedPos.lat}>
              <div style={{ fontSize: '24px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>📍</div>
            </Marker>
          )}

          {routeGeojson && (
            <Source id="route-source" type="geojson" data={routeGeojson}>
              <Layer
                id="route-layer"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#EAFF00',
                  'line-width': 6,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* ── UI LAYER ────────────────────────────────── */}
      <div className="ui-layer">
          <div className="floating-widget-container">
            <div className="floating-widget-panel">
              <div style={{ width: 120, height: 120 }}>
                <DotLottieReact
                  src="https://lottie.host/59ef4efc-bad7-4d4b-bf67-88638a7d6d3b/9MJF1B7EEV.lottie"
                  loop
                  autoplay
                />
              </div>
              <div className="widget-info">
                <div className="widget-title">THÔNG TIN THỜI TIẾT</div>
                <div className="widget-status">Đang hoạt động ✦</div>
              </div>
            </div>
          </div>

          <div className="floating-panel">
          
          <div className="panel-header">
            <div className="brand-header-row">
              <div className="brand-logo" style={{ gap: '4px' }}>
                <div style={{ width: 40, height: 40 }}>
                  <DotLottieReact
                    src="https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"
                    loop
                    autoplay
                  />
                </div>
                <span>MAPVIT</span>
              </div>
              <button className="btn-icon-sm" onClick={logout} title="Đăng xuất">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
            
            <div className="pill-tabs">
              <button 
                className={`pill-tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                Tìm kiếm
              </button>
              <button 
                className={`pill-tab ${activeTab === 'directions' ? 'active' : ''}`}
                onClick={() => setActiveTab('directions')}
              >
                Chỉ đường
              </button>
            </div>
          </div>

          <div className="panel-content">
            {activeTab === 'search' && (
              <form onSubmit={handleSearch} className="modern-search-row">
                <div className="modern-input-wrapper">
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Tìm địa điểm, cà phê..."
                    style={{ paddingLeft: '16px' }}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-lottie-search" disabled={loading || !query.trim()}>
                  <div style={{ width: 44, height: 44 }}>
                    <DotLottieReact
                      src="https://lottie.host/30d42053-e9dc-425e-a36e-383873fc86ac/ZDCzXZTXU2.lottie"
                      loop
                      autoplay
                    />
                  </div>
                </button>
              </form>
            )}

            {activeTab === 'directions' && (
              <form onSubmit={handleDirections} className="modern-input-group">
                <div style={{ position: 'relative' }}>
                  <div className="modern-input-wrapper">
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="Điểm xuất phát..."
                      style={{ paddingLeft: '16px' }}
                      value={origin}
                      onChange={e => handleInputChange('origin', e.target.value)}
                    />
                  </div>
                  {activeInput === 'origin' && suggestions.origin.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.origin.map(p => (
                        <div key={p.placeId} className="suggestion-item" onClick={() => selectSuggestion('origin', p)}>
                          <div className="suggestion-lottie">
                            <DotLottieReact
                              src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
                              loop
                              autoplay
                            />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-name">{p.name}</div>
                            {p.address && <div className="suggestion-address">{p.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <div className="modern-input-wrapper">
                    <input
                      type="text"
                      className="modern-input"
                      placeholder="Điểm đến..."
                      style={{ paddingLeft: '16px' }}
                      value={destination}
                      onChange={e => handleInputChange('destination', e.target.value)}
                    />
                  </div>
                  {activeInput === 'destination' && suggestions.destination.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.destination.map(p => (
                        <div key={p.placeId} className="suggestion-item" onClick={() => selectSuggestion('destination', p)}>
                          <div className="suggestion-lottie">
                            <DotLottieReact
                              src="https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"
                              loop
                              autoplay
                            />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-name">{p.name}</div>
                            {p.address && <div className="suggestion-address">{p.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button type="submit" className="btn-art" disabled={loading || !origin || !destination}>
                  {loading ? 'Đang tính toán...' : 'Chỉ đường đi'}
                </button>
              </form>
            )}

            {directions && (
              <div className="route-summary">
                <div className="route-stat">
                  <div className="route-val">{directions.distance?.text}</div>
                  <div className="route-lbl">Khoảng cách</div>
                </div>
                <div className="route-stat">
                  <div className="route-val">{directions.duration?.text}</div>
                  <div className="route-lbl">Thời gian</div>
                </div>
              </div>
            )}

            {/* Empty State / Welcome Animation for Search Tab */}
            {activeTab === 'search' && places.length === 0 && !clickedPos && !loading && (
              <div className="search-empty-state">
                <div style={{ width: 300, height: 300 }}>
                  <DotLottieReact
                    src="https://lottie.host/4b1ad8af-d769-4676-a2d6-686a7cc49d82/yF3dvgO9XZ.lottie"
                    loop
                    autoplay
                  />
                </div>
                <div className="empty-state-text">
                  Bắt đầu khám phá thế giới cùng MAPVIT
                </div>
              </div>
            )}

            {places.length > 0 && (
              <div className="results-container">
                <div className="results-header">
                  <span>{places.length} KẾT QUẢ</span>
                  <span style={{cursor: 'pointer', color: '#3A82F7'}} onClick={() => setPlaces([])}>Xóa</span>
                </div>
                {places.map(place => (
                  <div 
                    key={place.placeId} 
                    className="art-place-item"
                    onClick={() => {
                      setSelectedPlace(place);
                      setViewState(prev => ({
                        ...prev, longitude: place.lng, latitude: place.lat, zoom: 15, transitionDuration: 1000
                      }));
                    }}
                  >
                    <div className="place-icon-wrap">✧</div>
                    <div className="place-info">
                      <div className="place-name">{place.name}</div>
                      <div className="place-addr">{place.address}</div>
                    </div>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); handleSaveFavorite(place); }}
                      title="Lưu yêu thích"
                    >
                      ♡
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="art-toast">{toast}</div>}
    </div>
  );
}
