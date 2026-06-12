CREATE TABLE IF NOT EXISTS "api_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text DEFAULT 'New Chat',
	"model" text DEFAULT 'microsoft/phi-2',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tokens" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	"source" text DEFAULT 'website',
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"avatar_url" text,
	"provider" text DEFAULT 'email',
	"provider_id" text,
	"email_verified" boolean DEFAULT false,
	"api_calls" integer DEFAULT 0,
	"plan" text DEFAULT 'free',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_logs_user_created_idx" ON "api_logs" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_user_created_idx" ON "conversations" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_idx" ON "subscribers" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
