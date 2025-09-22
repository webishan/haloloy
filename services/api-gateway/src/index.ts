import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
// import { RateLimiterRedis } from 'rate-limiter-flexible';
// import Redis from 'redis';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Simple in-memory rate limiter (for demo purposes)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://komarce.com'] : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// Simple rate limiting middleware
app.use((req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    next();
  } else if (current.count < maxRequests) {
    current.count++;
    next();
  } else {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round((current.resetTime - now) / 1000) || 1
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Service discovery and load balancing
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    paths: ['/api/auth/*', '/api/login', '/api/register']
  },
  user: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    paths: ['/api/users/*', '/api/profile/*']
  },
  product: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
    paths: ['/api/products/*', '/api/categories/*', '/api/brands/*']
  },
  order: {
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    paths: ['/api/orders/*', '/api/cart/*', '/api/wishlist/*']
  },
  payment: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    paths: ['/api/payments/*', '/api/wallets/*']
  },
  loyalty: {
    url: process.env.LOYALTY_SERVICE_URL || 'http://localhost:3006',
    paths: ['/api/loyalty/*', '/api/rewards/*', '/api/points/*']
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    paths: ['/api/notifications/*', '/api/chat/*', '/api/messages/*']
  },
  analytics: {
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008',
    paths: ['/api/analytics/*', '/api/dashboard/*', '/api/reports/*']
  }
};

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'komarce-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Service proxy configuration
const createServiceProxy = (serviceUrl: string, options: any = {}) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err: any, req: any, res: any) => {
      logger.error(`Proxy error for ${req.url}:`, err);
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'The requested service is temporarily unavailable'
      });
    },
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      // Add user information to headers
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      
      // Add request ID for tracing
      proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || 'unknown');
    },
    ...options
  });
};

// Route configuration
Object.entries(services).forEach(([serviceName, config]) => {
  config.paths.forEach(path => {
    const proxy = createServiceProxy(config.url);
    
    // Apply authentication to protected routes
    if (path.includes('/api/') && !path.includes('/api/auth/') && !path.includes('/api/login') && !path.includes('/api/register')) {
      app.use(path, authenticateToken, proxy);
    } else {
      app.use(path, proxy);
    }
  });
});

// Serve static files (React app)
app.use(express.static('public'));

// Catch-all handler for React Router
app.get('*', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
