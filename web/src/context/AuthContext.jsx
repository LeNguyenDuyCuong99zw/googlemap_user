/**
 * context/AuthContext.jsx — Quản lý trạng thái xác thực toàn ứng dụng
 * 
 * Cung cấp các props:
 * - user: Firebase User object (null nếu chưa login)
 * - loading: Đang kiểm tra auth state
 * - token: ID Token hiện tại (để gọi API backend)
 * - loginWithGoogle(): Đăng nhập bằng Google
 * - loginWithEmail(email, password): Đăng nhập bằng email
 * - registerWithEmail(email, password, name): Đăng ký mới
 * - logout(): Đăng xuất
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Lắng nghe thay đổi auth state từ Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Lấy fresh token mỗi khi user state thay đổi
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup listener khi unmount
  }, []);

  // Refresh token trước khi gọi API (token có TTL 1 giờ)
  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(/* forceRefresh= */ false);
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithEmail = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Cập nhật tên hiển thị ngay sau khi tạo tài khoản
      await updateProfile(cred.user, { displayName });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    token,
    loading,
    error,
    getToken,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook để dùng trong component
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
