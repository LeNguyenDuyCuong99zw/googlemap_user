/**
 * pages/FavoritesPage.jsx — Quản lý địa điểm yêu thích
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../services/api';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState('');
  const navigate = useNavigate();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    getFavorites()
      .then(data => setFavorites(data.favorites || []))
      .catch(err => showToast(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id, name) => {
    try {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
      showToast(`Đã xóa "${name}"`);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            id="btn-back-map"
            className="btn btn-ghost"
            onClick={() => navigate('/map')}
          >
            ← Bản đồ
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>❤️ Yêu thích</h1>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : favorites.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <p>Chưa có địa điểm yêu thích nào</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/map')}
            >
              Khám phá bản đồ
            </button>
          </div>
        ) : (
          <div className="place-list">
            {favorites.map((fav) => (
              <div key={fav.id} className="place-item">
                <div className="place-item__icon">❤️</div>
                <div className="place-item__info">
                  <div className="place-item__name">{fav.name}</div>
                  <div className="place-item__addr">{fav.address}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {fav.savedAt ? new Date(fav.savedAt).toLocaleDateString('vi-VN') : ''}
                  </div>
                </div>
                <button
                  id={`btn-remove-fav-${fav.id}`}
                  className="btn btn-danger place-item__action"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => handleRemove(fav.id, fav.name)}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
