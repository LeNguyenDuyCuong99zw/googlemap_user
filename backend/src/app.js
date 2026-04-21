/**
 * app.js — Entrypoint của Express backend
 * 
 * Khởi tạo Express, đăng ký middleware, mount routes, xử lý lỗi toàn cục.
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

// ── Import routes ──────────────────────────────────────────────────────────
const placesRouter    = require('./routes/places');
const favoritesRouter = require('./routes/favorites');
const historyRouter   = require('./routes/history');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware bảo mật ─────────────────────────────────────────────────────
app.use(helmet()); // Set HTTP security headers (CSP, HSTS, …)

// CORS — chỉ cho phép các origin trong biến môi trường
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép tool như Postman gọi không có origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// Rate limiter — chống spam / brute-force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,                   // tối đa 200 request / cửa sổ
  standardHeaders: true,
  legacyHeaders:  false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Parse JSON body
app.use(express.json());

// HTTP request logger (chỉ dùng ở dev)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Health check (không cần auth) ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'ggmap-backend',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/places',    placesRouter);
app.use('/favorites', favoritesRouter);
app.use('/history',   historyRouter);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);

  // CORS error
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error:   err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // export cho Jest
