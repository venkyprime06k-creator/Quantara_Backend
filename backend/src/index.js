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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Custom security headers
app.use(securityHeaders);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging (production)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

// Start server with database connection
async function startServer() {
  try {
    await testConnection();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Quantara AI Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;