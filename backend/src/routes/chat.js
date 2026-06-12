import express from 'express';
import { authenticate, requireApiKey } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { conversations, messages, users, apiLogs } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { callAIStream } from '../services/ai.js';

const router = express.Router();

// Get all conversations for user
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, req.user.id))
      .orderBy(desc(conversations.updatedAt));
    
    res.json(userConversations);
  } catch (error) {
    next(error);
  }
});

// Get single conversation with messages
router.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    res.json({ conversation, messages: conversationMessages });
  } catch (error) {
    next(error);
  }
});

// Create new conversation
router.post('/conversations', authenticate, async (req, res, next) => {
  try {
    const { title, model } = req.body;
    
    const [newConversation] = await db
      .insert(conversations)
      .values({
        userId: req.user.id,
        title: title || 'New Chat',
        model: model || 'microsoft/phi-2',
      })
      .returning();
    
    res.status(201).json(newConversation);
  } catch (error) {
    next(error);
  }
});

// Delete conversation
router.delete('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const conversationId = parseInt(req.params.id);
    
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Send message with streaming response
router.post('/messages', authenticate, requireApiKey, async (req, res, next) => {
  const startTime = Date.now();
  const { conversationId, content, model } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  let conversation;
  
  try {
    // Create or get conversation
    if (conversationId) {
      const [existing] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));
      
      if (!existing || existing.userId !== req.user.id) {
        res.write(`data: ${JSON.stringify({ error: 'Conversation not found' })}\n\n`);
        res.end();
        return;
      }
      conversation = existing;
      
      // Update model if selected model changed
      if (model && model !== conversation.model) {
        await db
          .update(conversations)
          .set({ model })
          .where(eq(conversations.id, conversation.id));
        conversation.model = model;
      }
    } else {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: req.user.id,
          title: content.slice(0, 50),
          model: model || 'microsoft/phi-2',
        })
        .returning();
      conversation = newConversation;
    }
    
    // Save user message
    const [savedUserMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: 'user',
        content: content,
      })
      .returning();
    
    // Get conversation history (last 10 messages for context)
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt)
      .limit(10);
    
    let fullResponse = '';
    
    // Get API keys from headers (for custom keys) or use env variables
    const customKeys = {
      openAIKey: req.headers['x-openai-key'],
      anthropicKey: req.headers['x-anthropic-key'],
      geminiKey: req.headers['x-gemini-key'],
      groqKey: req.headers['x-groq-key'],
      hfKey: req.headers['x-huggingface-key'],
    };
    
    console.log(`Processing message with model: ${conversation.model}`);
    
    // Stream AI response with timeout
    const streamPromise = callAIStream(history, conversation.model, async (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
    }, customKeys);
    
    // Add timeout of 60 seconds for AI response
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI response timeout after 60 seconds')), 60000);
    });
    
    await Promise.race([streamPromise, timeoutPromise]);
    
    // Ensure we have a response
    if (!fullResponse || fullResponse.trim().length === 0) {
      fullResponse = "I'm having trouble processing that request. Could you please rephrase or try again?";
      res.write(`data: ${JSON.stringify({ chunk: fullResponse, done: false })}\n\n`);
    }
    
    // Save assistant message
    const [assistantMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: 'assistant',
        content: fullResponse,
        tokens: Math.ceil(fullResponse.length / 4),
      })
      .returning();
    
    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
    
    // Update user API call count
    await db
      .update(users)
      .set({ apiCalls: (req.user.apiCalls || 0) + 1 })
      .where(eq(users.id, req.user.id));
    
    // Log successful API call
    await db.insert(apiLogs).values({
      userId: req.user.id,
      endpoint: '/api/chat/messages',
      method: 'POST',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // Send completion
    res.write(`data: ${JSON.stringify({ 
      done: true, 
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      title: conversation.title,
    })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('Chat error:', error);
    
    // Send error message to client
    let errorMessage = error.message || 'An unexpected error occurred';
    
    // Provide user-friendly error messages
    if (errorMessage.includes('API key')) {
      errorMessage = '⚠️ Invalid or missing API key. Please add your Hugging Face API key to the backend .env file.';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = '⏳ The AI service is taking too long to respond. Please try again.';
    } else if (errorMessage.includes('rate limit')) {
      errorMessage = '⚠️ Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('503')) {
      errorMessage = '⏳ The model is loading. This may take 10-30 seconds. Please try again.';
    }
    
    // Log error to database
    try {
      await db.insert(apiLogs).values({
        userId: req.user?.id,
        endpoint: '/api/chat/messages',
        method: 'POST',
        statusCode: 500,
        responseTime: Date.now() - startTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    // Send error to client
    res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
    res.end();
  }
});

export default router;
