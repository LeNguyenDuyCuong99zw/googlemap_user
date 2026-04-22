/**
 * components/PhotoUpload.jsx — Upload ảnh địa điểm lên Google Cloud Storage
 *
 * Hiển thị khi user click vào một địa điểm trên bản đồ.
 * Cho phép:
 *   - Chọn file ảnh từ thiết bị
 *   - Preview ảnh trước khi upload
 *   - Upload lên GCS → hiển thị public URL
 *   - Xem danh sách ảnh đã upload
 *   - Xóa ảnh khỏi GCS
 *
 * ☁️ Dịch vụ: Google Cloud Storage (Object Storage)
 */

import { useState, useEffect, useRef } from 'react';
import { uploadPhoto, getUserPhotos, deletePhoto } from '../services/api';

export default function PhotoUpload({ place, onClose }) {
  const [photos,    setPhotos]    = useState([]);
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState('');
  const fileInputRef = useRef();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Tải danh sách ảnh hiện có của địa điểm
  useEffect(() => {
    if (!place?.placeId) return;
    setLoading(true);
    getUserPhotos(place.placeId)
      .then(data => setPhotos(data.photos || []))
      .catch(err => showToast(err.message))
      .finally(() => setLoading(false));
  }, [place?.placeId]);

  // Xử lý chọn file
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  // Upload lên Google Cloud Storage
  const handleUpload = async () => {
    if (!file || !place?.placeId) return;
    setUploading(true);
    try {
      const result = await uploadPhoto(file, place.placeId, place.name);
      showToast(`☁️ Đã upload lên Cloud Storage!`);
      // Thêm ảnh mới vào đầu danh sách
      setPhotos(prev => [{
        fileName:  result.fileName,
        publicUrl: result.publicUrl,
        size:      result.size,
        createdAt: new Date().toISOString(),
        placeName: place.name,
      }, ...prev]);
      setFile(null);
      setPreview(null);
      fileInputRef.current.value = '';
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Xóa ảnh khỏi GCS
  const handleDelete = async (photo) => {
    if (!window.confirm('Xóa ảnh này khỏi Cloud Storage?')) return;
    try {
      await deletePhoto(photo.fileName);
      setPhotos(prev => prev.filter(p => p.fileName !== photo.fileName));
      showToast('🗑️ Đã xóa khỏi Cloud Storage');
    } catch (err) {
      showToast(`❌ ${err.message}`);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="photo-upload-overlay" onClick={onClose}>
      <div className="photo-upload-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="photo-upload-header">
          <div>
            <div className="photo-upload-title">☁️ Cloud Storage</div>
            <div className="photo-upload-subtitle">
              📍 {place?.name || 'Địa điểm'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 20 }}>✕</button>
        </div>

        {/* GCS Info Badge */}
        <div className="gcs-badge">
          <span>🌐</span>
          <span>Google Cloud Storage · Bucket: <strong>ggmap-place-photos</strong> · Region: asia-southeast1</span>
        </div>

        {/* Upload Area */}
        <div
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" className="upload-preview-img" />
          ) : (
            <div className="upload-dropzone-placeholder">
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>Chọn ảnh để upload</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                JPEG, PNG, WebP · Tối đa 10 MB
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {file && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
              📄 {file.name} · {formatSize(file.size)}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              style={{ minWidth: 120 }}
            >
              {uploading
                ? <><span className="spinner" style={{ borderTopColor: '#fff' }} /> Đang upload...</>
                : '☁️ Upload lên GCS'
              }
            </button>
          </div>
        )}

        {/* Danh sách ảnh đã lưu */}
        <div className="photo-list-header">
          <span>Ảnh trên Cloud Storage</span>
          <span className="photo-count-badge">{photos.length}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <span className="spinner" /> Đang tải từ Cloud...
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Chưa có ảnh nào được lưu trên Cloud Storage
          </div>
        ) : (
          <div className="photo-grid">
            {photos.map((photo, idx) => (
              <div key={photo.fileName || idx} className="photo-grid-item">
                <img
                  src={photo.publicUrl}
                  alt={photo.placeName}
                  className="photo-grid-img"
                  loading="lazy"
                />
                <div className="photo-grid-overlay">
                  <div style={{ fontSize: 11 }}>{formatSize(Number(photo.size))}</div>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 16, padding: '2px 6px', color: '#ff6b6b' }}
                    onClick={() => handleDelete(photo)}
                    title="Xóa khỏi Cloud Storage"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
