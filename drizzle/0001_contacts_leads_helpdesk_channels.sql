/* ───────────────────── Contacts ───────────────────── */
CREATE TYPE "public"."contacts_status" AS ENUM('active', 'unsubscribed', 'blocked');--> statement-breakpoint
CREATE TABLE "contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" integer NOT NULL,
  "name" varchar(160) NOT NULL,
  "email" varchar(320),
  "phone" varchar(64),
  "company" varchar(160),
  "jobTitle" varchar(160),
  "source" varchar(80) DEFAULT 'manual',
  "status" "contacts_status" DEFAULT 'active' NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb,
  "createdById" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp
);--> statement-breakpoint
CREATE INDEX "contacts_workspace_status_idx" ON "contacts" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "contacts_workspace_email_idx" ON "contacts" USING btree ("workspaceId","email");--> statement-breakpoint
CREATE INDEX "contacts_workspace_created_idx" ON "contacts" USING btree ("workspaceId","createdAt");--> statement-breakpoint

/* ───────────────────── Leads ───────────────────── */
CREATE TYPE "public"."leads_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" integer NOT NULL,
  "name" varchar(160) NOT NULL,
  "email" varchar(320),
  "phone" varchar(64),
  "company" varchar(160),
  "source" varchar(80) DEFAULT 'manual',
  "status" "leads_status" DEFAULT 'new' NOT NULL,
  "value" numeric(18, 2) DEFAULT '0',
  "notes" text,
  "assignedToId" integer,
  "convertedToContactId" integer,
  "metadata" jsonb,
  "createdById" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp
);--> statement-breakpoint
CREATE INDEX "leads_workspace_status_idx" ON "leads" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "leads_workspace_assigned_idx" ON "leads" USING btree ("workspaceId","assignedToId");--> statement-breakpoint
CREATE INDEX "leads_workspace_created_idx" ON "leads" USING btree ("workspaceId","createdAt");--> statement-breakpoint

/* ───────────────────── Tickets (Helpdesk) ───────────────────── */
CREATE TYPE "public"."tickets_status" AS ENUM('new', 'open', 'pending', 'on_hold', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."tickets_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TABLE "tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" integer NOT NULL,
  "ticketNumber" serial NOT NULL,
  "subject" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "status" "tickets_status" DEFAULT 'new' NOT NULL,
  "priority" "tickets_priority" DEFAULT 'normal' NOT NULL,
  "source" varchar(80) DEFAULT 'dashboard',
  "requesterEmail" varchar(320),
  "requesterName" varchar(160),
  "assigneeId" integer,
  "contactId" integer,
  "conversationId" integer,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb,
  "resolvedAt" timestamp,
  "createdById" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_workspace_number_unique" ON "tickets" USING btree ("workspaceId","ticketNumber");--> statement-breakpoint
CREATE INDEX "tickets_workspace_status_idx" ON "tickets" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "tickets_workspace_assignee_idx" ON "tickets" USING btree ("workspaceId","assigneeId");--> statement-breakpoint
CREATE INDEX "tickets_workspace_created_idx" ON "tickets" USING btree ("workspaceId","createdAt");--> statement-breakpoint

CREATE TYPE "public"."ticket_messages_role" AS ENUM('customer', 'agent', 'system', 'note');--> statement-breakpoint
CREATE TABLE "ticket_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticketId" integer NOT NULL,
  "workspaceId" integer NOT NULL,
  "authorUserId" integer,
  "authorName" varchar(160),
  "role" "ticket_messages_role" DEFAULT 'customer' NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_created_idx" ON "ticket_messages" USING btree ("ticketId","createdAt");--> statement-breakpoint
CREATE INDEX "ticket_messages_workspace_idx" ON "ticket_messages" USING btree ("workspaceId");--> statement-breakpoint

/* ───────────────────── Channels ───────────────────── */
CREATE TYPE "public"."channels_type" AS ENUM('widget', 'help_page', 'center_stage', 'messenger', 'whatsapp', 'instagram', 'slack', 'email', 'sms', 'voice');--> statement-breakpoint
CREATE TYPE "public"."channels_status" AS ENUM('active', 'draft', 'disabled');--> statement-breakpoint
CREATE TABLE "channels" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" integer NOT NULL,
  "type" "channels_type" NOT NULL,
  "name" varchar(160) NOT NULL,
  "status" "channels_status" DEFAULT 'draft' NOT NULL,
  "configuration" jsonb,
  "embedCode" text,
  "createdById" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_type_unique" ON "channels" USING btree ("workspaceId","type");--> statement-breakpoint
CREATE INDEX "channels_workspace_status_idx" ON "channels" USING btree ("workspaceId","status");--> statement-breakpoint

/* ───────────────────── Campaigns (Outbound) ───────────────────── */
CREATE TYPE "public"."campaigns_type" AS ENUM('email', 'sms', 'scheduled', 'automated');--> statement-breakpoint
CREATE TYPE "public"."campaigns_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspaceId" integer NOT NULL,
  "name" varchar(160) NOT NULL,
  "type" "campaigns_type" NOT NULL,
  "status" "campaigns_status" DEFAULT 'draft' NOT NULL,
  "subject" varchar(255),
  "body" text,
  "recipientCount" integer DEFAULT 0 NOT NULL,
  "sentCount" integer DEFAULT 0 NOT NULL,
  "deliveredCount" integer DEFAULT 0 NOT NULL,
  "openedCount" integer DEFAULT 0 NOT NULL,
  "clickedCount" integer DEFAULT 0 NOT NULL,
  "scheduledAt" timestamp,
  "completedAt" timestamp,
  "metadata" jsonb,
  "createdById" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "deletedAt" timestamp
);--> statement-breakpoint
CREATE INDEX "campaigns_workspace_status_idx" ON "campaigns" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_type_idx" ON "campaigns" USING btree ("workspaceId","type");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_scheduled_idx" ON "campaigns" USING btree ("workspaceId","scheduledAt");--> statement-breakpoint
