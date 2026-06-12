import { 
  pgTable, serial, text, timestamp, integer, 
  boolean, jsonb, index, uniqueIndex 
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // This creates column "password_hash"
  name: text('name'),
  avatarUrl: text('avatar_url'),
  provider: text('provider').default('email'),
  providerId: text('provider_id'),
  emailVerified: boolean('email_verified').default(false),
  apiCalls: integer('api_calls').default(0),
  plan: text('plan').default('free'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Sessions table
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.token),
  userIdx: index('sessions_user_idx').on(table.userId),
}));

// Conversations table
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').default('New Chat'),
  model: text('model').default('microsoft/phi-2'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userCreatedIdx: index('conversations_user_created_idx').on(table.userId, table.createdAt),
}));

// Messages table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId, table.createdAt),
}));

// Subscribers table
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  subscribedAt: timestamp('subscribed_at').defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  source: text('source').default('website'),
}, (table) => ({
  emailIdx: uniqueIndex('subscribers_email_idx').on(table.email),
}));

// API logs table
export const apiLogs = pgTable('api_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code'),
  responseTime: integer('response_time'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userCreatedIdx: index('api_logs_user_created_idx').on(table.userId, table.createdAt),
}));
