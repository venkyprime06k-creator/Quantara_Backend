import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Validation rules
const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
];

const signinValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Sign up
router.post('/signup', signupValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email, password, name } = req.body;
  
  try {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      emailVerified: false,
    }).returning();
    
    // Create session
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db.insert(sessions).values({
      userId: newUser.id,
      token,
      expiresAt,
    });
    
    // Return user data (excluding sensitive info)
    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Sign in
router.post('/signin', signinValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email, password } = req.body;
  
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });
    
    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Sign out
router.post('/signout', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch (error) {
      next(error);
      return;
    }
  }
  
  res.json({ success: true });
});

// Get current user
router.get('/me', async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        apiCalls: users.apiCalls,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.userId));
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
