import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "komarce-secret-key";

// Authentication middleware
export function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log(`❌ JWT verification failed:`, err.message);
      console.log(`🔍 Token:`, token.substring(0, 20) + '...');
      console.log(`🔍 JWT_SECRET:`, JWT_SECRET);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    console.log(`✅ JWT verification successful for user:`, user);
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
export function authorizeRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
