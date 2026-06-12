import express from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db/index.js';
import { subscribers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Subscribe to newsletter
router.post('/subscribe', [
  body('email').isEmail().normalizeEmail(),
  body('source').optional().isString(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email, source = 'website' } = req.body;
  
  try {
    // Check if already subscribed
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email));
    
    if (existing.length > 0) {
      if (existing[0].unsubscribedAt) {
        // Re-subscribe
        await db
          .update(subscribers)
          .set({ unsubscribedAt: null, source })
          .where(eq(subscribers.email, email));
        
        return res.json({ message: 'Successfully resubscribed!' });
      }
      return res.json({ message: 'Already subscribed!' });
    }
    
    // Add new subscriber
    await db.insert(subscribers).values({
      email,
      source,
    });
    
    res.status(201).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe
router.post('/unsubscribe', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email } = req.body;
  
  try {
    await db
      .update(subscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(subscribers.email, email));
    
    res.json({ message: 'Successfully unsubscribed' });
  } catch (error) {
    next(error);
  }
});

// Get subscriber count (public)
router.get('/count', async (req, res, next) => {
  try {
    const all = await db.select().from(subscribers);
    const active = all.filter(s => !s.unsubscribedAt);
    
    res.json({ count: active.length });
  } catch (error) {
    next(error);
  }
});

export default router;
