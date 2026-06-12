import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { apiLogs, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

router.get('/metrics', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user logs
    const logs = await db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.userId, userId))
      .orderBy(desc(apiLogs.createdAt));

    const totalCalls = logs.length;
    const successfulCalls = logs.filter(log => log.statusCode >= 200 && log.statusCode < 300).length;
    const failedCalls = totalCalls - successfulCalls;

    let totalResponseTime = 0;
    logs.forEach(log => {
      if (log.responseTime) {
        totalResponseTime += log.responseTime;
      }
    });

    const averageResponseTime = totalCalls > 0 ? Math.round(totalResponseTime / totalCalls) : 0;

    // Calculate usage chart data (grouped by date)
    const usageByDate = {};
    logs.forEach(log => {
      if (log.createdAt) {
        const dateStr = new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        usageByDate[dateStr] = (usageByDate[dateStr] || 0) + 1;
      }
    });

    const chartData = Object.entries(usageByDate).map(([date, count]) => ({
      date,
      count,
    })).reverse().slice(-7); // Last 7 days

    // Fetch current user details for Plan & Limit
    const [user] = await db
      .select({
        plan: users.plan,
        apiCalls: users.apiCalls,
      })
      .from(users)
      .where(eq(users.id, userId));

    const planLimits = {
      free: 100,
      pro: 10000,
      enterprise: 100000,
    };
    
    const limit = planLimits[user?.plan || 'free'] || 100;

    res.json({
      metrics: {
        totalCalls: user?.apiCalls || totalCalls,
        limit,
        successfulCalls,
        failedCalls,
        averageResponseTime,
      },
      chartData,
      recentLogs: logs.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
