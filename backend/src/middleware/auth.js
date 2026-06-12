import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and is valid
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        )
      );
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // Check rate limits based on plan
  if (req.user) {
    const limits = {
      free: 100,
      pro: 10000,
      enterprise: 100000,
    };
    
    const maxCalls = limits[req.user.plan] || 100;
    
    if (req.user.apiCalls >= maxCalls) {
      return res.status(429).json({ 
        error: 'API limit reached. Please upgrade your plan.' 
      });
    }
  }
  
  next();
}
