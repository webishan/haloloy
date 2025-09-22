import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import winston from 'winston';
import dotenv from 'dotenv';
import { db } from './database';
import { users, userSessions, loginAttempts, passwordResetTokens, emailVerificationTokens } from './schema';
import { eq, and, desc } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'komarce-secret-key';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

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

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
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
      ip: req.ip
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Utility functions
const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
};

const logLoginAttempt = async (email: string, ipAddress: string, userAgent: string, success: boolean, failureReason?: string) => {
  try {
    await db.insert(loginAttempts).values({
      email,
      ipAddress,
      userAgent,
      success,
      failureReason
    });
  } catch (error) {
    logger.error('Failed to log login attempt:', error);
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Routes

// Register
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('firstName').trim().isLength({ min: 2, max: 50 }),
  body('lastName').trim().isLength({ min: 2, max: 50 }),
  body('role').isIn(['customer', 'merchant']),
  body('country').isIn(['BD', 'MY', 'AE', 'PH']),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, role, country, phone } = req.body;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      country,
      phone,
      username: email.split('@')[0] + '_' + Date.now()
    }).returning();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.role);

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(userSessions).values({
      userId: newUser.id,
      token: accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip
    });

    // Log successful registration
    await logLoginAttempt(email, req.ip, req.get('User-Agent') || '', true);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        country: newUser.country,
        isActive: newUser.isActive
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      await logLoginAttempt(email, req.ip, req.get('User-Agent') || '', false, 'User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      await logLoginAttempt(email, req.ip, req.get('User-Agent') || '', false, 'Account deactivated');
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logLoginAttempt(email, req.ip, req.get('User-Agent') || '', false, 'Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(userSessions).values({
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip
    });

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Log successful login
    await logLoginAttempt(email, req.ip, req.get('User-Agent') || '', true);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country,
        isActive: user.isActive
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
app.post('/api/auth/refresh', [
  body('refreshToken').notEmpty()
], async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Check if session exists and is active
    const [session] = await db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.refreshToken, refreshToken),
        eq(userSessions.isActive, true)
      ))
      .limit(1);

    if (!session) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check if refresh token is expired
    if (new Date() > session.refreshExpiresAt) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);

    // Update session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.update(userSessions)
      .set({
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresAt,
        refreshExpiresAt
      })
      .where(eq(userSessions.id, session.id));

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Deactivate session
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.token, token));

    res.json({ message: 'Logout successful' });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    // Deactivate all sessions
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, user.id));

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt
    });

    // TODO: Send email with reset link
    // For now, just log the token (in production, send email)
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If the email exists, a reset link has been sent' });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password
app.post('/api/auth/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
], async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    // Check if reset token exists and is valid
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.isUsed, false)
      ))
      .limit(1);

    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, decoded.userId));

    // Mark reset token as used
    await db.update(passwordResetTokens)
      .set({ isUsed: true })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Deactivate all sessions
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, decoded.userId));

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
