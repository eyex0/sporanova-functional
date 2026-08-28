CREATE TYPE "public"."agent_runs_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_runs_trigger_type" AS ENUM('manual', 'workflow', 'schedule', 'data_sync');--> statement-breakpoint
CREATE TYPE "public"."agents_status" AS ENUM('active', 'idle', 'paused', 'error');--> statement-breakpoint
CREATE TYPE "public"."data_source_runs_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."data_sources_status" AS ENUM('connected', 'syncing', 'failed', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."documents_status" AS ENUM('uploading', 'processing', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."insights_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."insights_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."integrations_status" AS ENUM('connected', 'failed', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."jobs_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."memberships_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."message_sources_source_type" AS ENUM('document', 'data_source', 'metric', 'manual');--> statement-breakpoint
CREATE TYPE "public"."messages_kind" AS ENUM('question', 'understanding', 'insight', 'recommendation', 'action');--> statement-breakpoint
CREATE TYPE "public"."messages_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_preferences_response_tone" AS ENUM('concise', 'professional', 'detailed');--> statement-breakpoint
CREATE TYPE "public"."users_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."workflow_nodes_node_type" AS ENUM('trigger', 'intelligence', 'condition', 'action');--> statement-breakpoint
CREATE TYPE "public"."workflow_runs_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_runs_trigger_type" AS ENUM('manual', 'event', 'schedule');--> statement-breakpoint
CREATE TYPE "public"."workflows_status" AS ENUM('active', 'paused', 'draft', 'archived');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"agentId" integer NOT NULL,
	"status" "agent_runs_status" DEFAULT 'pending' NOT NULL,
	"triggerType" "agent_runs_trigger_type" DEFAULT 'manual' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"errorMessage" text,
	"idempotencyKey" varchar(128),
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"purpose" text NOT NULL,
	"status" "agents_status" DEFAULT 'idle' NOT NULL,
	"configuration" jsonb,
	"capabilities" jsonb,
	"createdById" integer NOT NULL,
	"lastActivityAt" timestamp,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"workspaceId" integer,
	"actorUserId" integer,
	"action" varchar(120) NOT NULL,
	"resourceType" varchar(80) NOT NULL,
	"resourceId" varchar(80),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "business_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"metricDate" timestamp NOT NULL,
	"metricKey" varchar(80) NOT NULL,
	"segment" varchar(80) DEFAULT 'all' NOT NULL,
	"metricValue" numeric(18, 4) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"createdById" integer NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"dataSourceId" integer NOT NULL,
	"externalId" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"searchableText" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_source_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"dataSourceId" integer NOT NULL,
	"status" "data_source_runs_status" DEFAULT 'pending' NOT NULL,
	"recordsProcessed" integer DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" "data_sources_status" DEFAULT 'disconnected' NOT NULL,
	"configuration" jsonb,
	"recordCount" integer DEFAULT 0 NOT NULL,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"lastSyncAt" timestamp,
	"lastError" text,
	"createdById" integer NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"documentId" integer NOT NULL,
	"chunkIndex" integer NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"storageKey" varchar(512) NOT NULL,
	"storageUrl" text NOT NULL,
	"status" "documents_status" DEFAULT 'uploading' NOT NULL,
	"processingError" text,
	"uploadedById" integer NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"severity" "insights_severity" DEFAULT 'low' NOT NULL,
	"category" varchar(80) DEFAULT 'insight' NOT NULL,
	"status" "insights_status" DEFAULT 'open' NOT NULL,
	"createdByAgentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"provider" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "integrations_status" DEFAULT 'disconnected' NOT NULL,
	"secretReference" varchar(255),
	"configuration" jsonb,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer,
	"type" varchar(80) NOT NULL,
	"status" "jobs_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"runAt" timestamp DEFAULT now() NOT NULL,
	"lockedAt" timestamp,
	"lockedBy" varchar(128),
	"completedAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"workspaceId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "memberships_role" DEFAULT 'member' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_workspace_user_pk" PRIMARY KEY("workspaceId","userId")
);
--> statement-breakpoint
CREATE TABLE "message_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"messageId" integer NOT NULL,
	"workspaceId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"sourceType" "message_sources_source_type" NOT NULL,
	"sourceReference" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"workspaceId" integer NOT NULL,
	"authorUserId" integer,
	"role" "messages_role" NOT NULL,
	"kind" "messages_kind" DEFAULT 'question' NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"recipientUserId" integer NOT NULL,
	"type" varchar(80) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"relatedEntityType" varchar(80),
	"relatedEntityId" varchar(80),
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" varchar(64) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"accessTokenEncrypted" text,
	"refreshTokenEncrypted" text,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"companySize" varchar(32),
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workspaceId" integer NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"slackNotifications" boolean DEFAULT false NOT NULL,
	"weeklyDigest" boolean DEFAULT true NOT NULL,
	"agentNotifications" boolean DEFAULT true NOT NULL,
	"anomalyNotifications" boolean DEFAULT true NOT NULL,
	"reportNotifications" boolean DEFAULT false NOT NULL,
	"extendedContextWindow" boolean DEFAULT true NOT NULL,
	"citeSources" boolean DEFAULT true NOT NULL,
	"proactiveInsights" boolean DEFAULT false NOT NULL,
	"responseTone" "user_preferences_response_tone" DEFAULT 'professional' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64) DEFAULT 'credentials',
	"authProvider" varchar(64) DEFAULT 'credentials' NOT NULL,
	"role" "users_role" DEFAULT 'user' NOT NULL,
	"jobTitle" varchar(160),
	"avatarUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workflow_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflowId" integer NOT NULL,
	"nodeKey" varchar(80) NOT NULL,
	"nodeType" "workflow_nodes_node_type" NOT NULL,
	"label" varchar(160) NOT NULL,
	"description" text,
	"positionX" integer DEFAULT 0 NOT NULL,
	"positionY" integer DEFAULT 0 NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"configuration" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"workflowId" integer NOT NULL,
	"status" "workflow_runs_status" DEFAULT 'pending' NOT NULL,
	"triggerType" "workflow_runs_trigger_type" DEFAULT 'manual' NOT NULL,
	"idempotencyKey" varchar(128),
	"output" jsonb,
	"errorMessage" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdById" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"status" "workflows_status" DEFAULT 'draft' NOT NULL,
	"scheduleCronTaskUid" varchar(65),
	"createdById" integer NOT NULL,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdById" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_dataSourceId_data_sources_id_fk" FOREIGN KEY ("dataSourceId") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_runs" ADD CONSTRAINT "data_source_runs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_runs" ADD CONSTRAINT "data_source_runs_dataSourceId_data_sources_id_fk" FOREIGN KEY ("dataSourceId") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_source_runs" ADD CONSTRAINT "data_source_runs_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_users_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_createdByAgentId_agents_id_fk" FOREIGN KEY ("createdByAgentId") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_sources" ADD CONSTRAINT "message_sources_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorUserId_users_id_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_users_id_fk" FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_runs_workspace_idempotency_unique" ON "agent_runs" USING btree ("workspaceId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "agent_runs_agent_started_idx" ON "agent_runs" USING btree ("agentId","startedAt");--> statement-breakpoint
CREATE INDEX "agent_runs_workspace_status_idx" ON "agent_runs" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_workspace_name_unique" ON "agents" USING btree ("workspaceId","name");--> statement-breakpoint
CREATE INDEX "agents_workspace_status_idx" ON "agents" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_idx" ON "audit_logs" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actorUserId","createdAt");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_idx" ON "auth_sessions" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "business_metrics_workspace_date_key_segment_unique" ON "business_metrics" USING btree ("workspaceId","metricDate","metricKey","segment");--> statement-breakpoint
CREATE INDEX "business_metrics_workspace_key_date_idx" ON "business_metrics" USING btree ("workspaceId","metricKey","metricDate");--> statement-breakpoint
CREATE INDEX "conversations_workspace_last_message_idx" ON "conversations" USING btree ("workspaceId","lastMessageAt");--> statement-breakpoint
CREATE INDEX "conversations_creator_idx" ON "conversations" USING btree ("createdById");--> statement-breakpoint
CREATE UNIQUE INDEX "data_records_source_external_unique" ON "data_records" USING btree ("dataSourceId","externalId");--> statement-breakpoint
CREATE INDEX "data_records_workspace_source_idx" ON "data_records" USING btree ("workspaceId","dataSourceId");--> statement-breakpoint
CREATE INDEX "data_source_runs_source_started_idx" ON "data_source_runs" USING btree ("dataSourceId","startedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "data_sources_workspace_name_unique" ON "data_sources" USING btree ("workspaceId","name");--> statement-breakpoint
CREATE INDEX "data_sources_workspace_status_idx" ON "data_sources" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "document_chunks_document_index_unique" ON "document_chunks" USING btree ("documentId","chunkIndex");--> statement-breakpoint
CREATE INDEX "document_chunks_workspace_idx" ON "document_chunks" USING btree ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_storage_key_unique" ON "documents" USING btree ("storageKey");--> statement-breakpoint
CREATE INDEX "documents_workspace_status_created_idx" ON "documents" USING btree ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE INDEX "insights_workspace_status_created_idx" ON "insights" USING btree ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_workspace_provider_name_unique" ON "integrations" USING btree ("workspaceId","provider","name");--> statement-breakpoint
CREATE INDEX "integrations_workspace_status_idx" ON "integrations" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "jobs_dispatch_idx" ON "jobs" USING btree ("status","runAt");--> statement-breakpoint
CREATE INDEX "jobs_workspace_idx" ON "jobs" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "memberships_workspace_role_idx" ON "memberships" USING btree ("workspaceId","role");--> statement-breakpoint
CREATE INDEX "message_sources_message_idx" ON "message_sources" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "messages_workspace_created_idx" ON "messages" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_created_idx" ON "notifications" USING btree ("recipientUserId","readAt","createdAt");--> statement-breakpoint
CREATE INDEX "notifications_workspace_created_idx" ON "notifications" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_account_unique" ON "oauth_accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "password_reset_tokens" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_workspace_unique" ON "user_preferences" USING btree ("userId","workspaceId");--> statement-breakpoint
CREATE INDEX "user_preferences_workspace_idx" ON "user_preferences" USING btree ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_nodes_workflow_key_unique" ON "workflow_nodes" USING btree ("workflowId","nodeKey");--> statement-breakpoint
CREATE INDEX "workflow_nodes_workflow_sort_idx" ON "workflow_nodes" USING btree ("workflowId","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_workspace_idempotency_unique" ON "workflow_runs" USING btree ("workspaceId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_started_idx" ON "workflow_runs" USING btree ("workflowId","startedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_workspace_name_unique" ON "workflows" USING btree ("workspaceId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_schedule_task_unique" ON "workflows" USING btree ("scheduleCronTaskUid");--> statement-breakpoint
CREATE INDEX "workflows_workspace_status_idx" ON "workflows" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_organization_slug_unique" ON "workspaces" USING btree ("organizationId","slug");--> statement-breakpoint
CREATE INDEX "workspaces_organization_idx" ON "workspaces" USING btree ("organizationId");