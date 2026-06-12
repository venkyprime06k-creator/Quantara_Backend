import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { testConnection } from './db/index.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import newsletterRoutes from './routes/newsletter.js';
import analyticsRoutes from './routes/analytics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders, cspDirectives } from './middleware/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for Render)
app.set('trust proxy', 1);

// ========================================
// CORS - Must be FIRST
// ========================================
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ========================================
// Body Parsing
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ========================================
// Security Headers (with CSP bypass for now)
// ========================================
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid issues
}));
app.use(securityHeaders);

// ========================================
// Request Logging
// ========================================
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

// ========================================
// Rate Limiting (only in production)
// ========================================
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// ========================================
// HEALTH CHECK - Must work even without DB
// ========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
  });
});

// ========================================
// TEST ENDPOINT - To verify routing works
// ========================================
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// ========================================
// ROUTES
// ========================================
console.log('📦 Loading routes...');
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);
console.log('✅ Routes loaded successfully');

// ========================================
// 404 Handler - Must be AFTER all routes
// ========================================
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ========================================
// Global Error Handler
// ========================================
app.use(errorHandler);

// ========================================
// Start Server
// ========================================
async function startServer() {
  console.log('🚀 Starting Quantara AI Server...');
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '✓ Configured' : '✗ Missing'}`);
  
  // Test database connection (non-blocking)
  try {
    await testConnection();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('⚠️ Database connection failed:', error.message);
    console.log('⚠️ Server will start but database features may not work');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  });
}

startServer();

export default app;
