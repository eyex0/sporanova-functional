// server/_core/index.ts
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express2 from "express";
import { createServer } from "http";

// server/routers.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
import { z as z11 } from "zod";

// server/auth.ts
import { and as and2, eq as eq2, gt, isNull as isNull2 } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { parse } from "cookie";

// drizzle/schema.ts
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var usersRoleEnum = pgEnum("users_role", ["user", "admin"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("credentials"),
  authProvider: varchar("authProvider", { length: 64 }).default("credentials").notNull(),
  role: usersRoleEnum("role").default("user").notNull(),
  jobTitle: varchar("jobTitle", { length: 160 }),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId), index("auth_sessions_expires_idx").on(table.expiresAt)]
);
var passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("password_reset_tokens_user_idx").on(table.userId), index("password_reset_tokens_expires_idx").on(table.expiresAt)]
);
var oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    accessTokenEncrypted: text("accessTokenEncrypted"),
    refreshTokenEncrypted: text("refreshTokenEncrypted"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("oauth_accounts_provider_account_unique").on(table.provider, table.providerAccountId), index("oauth_accounts_user_idx").on(table.userId)]
);
var organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    companySize: varchar("companySize", { length: 32 }),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt")
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)]
);
var workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    onboardingStep: integer("onboardingStep").notNull().default(0),
    onboardingData: jsonb("onboardingData").$type(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt")
  },
  (table) => [
    uniqueIndex("workspaces_organization_slug_unique").on(table.organizationId, table.slug),
    index("workspaces_organization_idx").on(table.organizationId)
  ]
);
var jobsStatusEnum = pgEnum("jobs_status", ["pending", "running", "completed", "failed"]);
var jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").references(() => workspaces.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    status: jobsStatusEnum("status").notNull().default("pending"),
    payload: jsonb("payload").$type().notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("maxAttempts").notNull().default(3),
    runAt: timestamp("runAt").notNull().defaultNow(),
    lockedAt: timestamp("lockedAt"),
    lockedBy: varchar("lockedBy", { length: 128 }),
    completedAt: timestamp("completedAt"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [index("jobs_dispatch_idx").on(table.status, table.runAt), index("jobs_workspace_idx").on(table.workspaceId, table.createdAt)]
);
var membershipsRoleEnum = pgEnum("memberships_role", ["owner", "admin", "member", "viewer"]);
var memberships = pgTable(
  "memberships",
  {
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: membershipsRoleEnum("role").notNull().default("member"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId], name: "memberships_workspace_user_pk" }),
    index("memberships_user_idx").on(table.userId),
    index("memberships_workspace_role_idx").on(table.workspaceId, table.role)
  ]
);
var responseToneEnum = pgEnum("user_preferences_response_tone", ["concise", "professional", "detailed"]);
var userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    emailNotifications: boolean("emailNotifications").notNull().default(true),
    slackNotifications: boolean("slackNotifications").notNull().default(false),
    weeklyDigest: boolean("weeklyDigest").notNull().default(true),
    agentNotifications: boolean("agentNotifications").notNull().default(true),
    anomalyNotifications: boolean("anomalyNotifications").notNull().default(true),
    reportNotifications: boolean("reportNotifications").notNull().default(false),
    extendedContextWindow: boolean("extendedContextWindow").notNull().default(true),
    citeSources: boolean("citeSources").notNull().default(true),
    proactiveInsights: boolean("proactiveInsights").notNull().default(false),
    responseTone: responseToneEnum("responseTone").notNull().default("professional"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("user_preferences_user_workspace_unique").on(table.userId, table.workspaceId),
    index("user_preferences_workspace_idx").on(table.workspaceId)
  ]
);
var agentsStatusEnum = pgEnum("agents_status", ["active", "idle", "paused", "error"]);
var agents = pgTable(
  "agents",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    purpose: text("purpose").notNull(),
    status: agentsStatusEnum("status").notNull().default("idle"),
    configuration: jsonb("configuration").$type(),
    capabilities: jsonb("capabilities").$type(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    lastActivityAt: timestamp("lastActivityAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("agents_workspace_name_unique").on(table.workspaceId, table.name),
    index("agents_workspace_status_idx").on(table.workspaceId, table.status)
  ]
);
var agentRunsStatusEnum = pgEnum("agent_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);
var agentRunsTriggerTypeEnum = pgEnum("agent_runs_trigger_type", ["manual", "workflow", "schedule", "data_sync"]);
var agentRuns = pgTable(
  "agent_runs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: integer("agentId").notNull().references(() => agents.id, { onDelete: "cascade" }),
    status: agentRunsStatusEnum("status").notNull().default("pending"),
    triggerType: agentRunsTriggerTypeEnum("triggerType").notNull().default("manual"),
    progress: integer("progress").notNull().default(0),
    input: jsonb("input").$type(),
    output: jsonb("output").$type(),
    errorMessage: text("errorMessage"),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdById: integer("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("agent_runs_workspace_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("agent_runs_agent_started_idx").on(table.agentId, table.startedAt),
    index("agent_runs_workspace_status_idx").on(table.workspaceId, table.status)
  ]
);
var messagesRoleEnum = pgEnum("messages_role", ["user", "assistant", "system"]);
var messagesKindEnum = pgEnum("messages_kind", ["question", "understanding", "insight", "recommendation", "action"]);
var conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    index("conversations_workspace_last_message_idx").on(table.workspaceId, table.lastMessageAt),
    index("conversations_creator_idx").on(table.createdById)
  ]
);
var messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    authorUserId: integer("authorUserId").references(() => users.id, { onDelete: "set null" }),
    role: messagesRoleEnum("role").notNull(),
    kind: messagesKindEnum("kind").notNull().default("question"),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("messages_workspace_created_idx").on(table.workspaceId, table.createdAt)
  ]
);
var messageSourcesTypeEnum = pgEnum("message_sources_source_type", ["document", "data_source", "metric", "manual"]);
var messageSources = pgTable(
  "message_sources",
  {
    id: serial("id").primaryKey(),
    messageId: integer("messageId").notNull().references(() => messages.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    sourceType: messageSourcesTypeEnum("sourceType").notNull(),
    sourceReference: varchar("sourceReference", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("message_sources_message_idx").on(table.messageId)]
);
var insightsSeverityEnum = pgEnum("insights_severity", ["low", "medium", "high"]);
var insightsStatusEnum = pgEnum("insights_status", ["open", "acknowledged", "resolved"]);
var insights = pgTable(
  "insights",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    severity: insightsSeverityEnum("severity").notNull().default("low"),
    category: varchar("category", { length: 80 }).notNull().default("insight"),
    status: insightsStatusEnum("status").notNull().default("open"),
    createdByAgentId: integer("createdByAgentId").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [index("insights_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt)]
);
var dataSourcesStatusEnum = pgEnum("data_sources_status", ["connected", "syncing", "failed", "disconnected"]);
var dataSources = pgTable(
  "data_sources",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    status: dataSourcesStatusEnum("status").notNull().default("disconnected"),
    configuration: jsonb("configuration").$type(),
    recordCount: integer("recordCount").notNull().default(0),
    sizeBytes: integer("sizeBytes").notNull().default(0),
    lastSyncAt: timestamp("lastSyncAt"),
    lastError: text("lastError"),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("data_sources_workspace_name_unique").on(table.workspaceId, table.name),
    index("data_sources_workspace_status_idx").on(table.workspaceId, table.status)
  ]
);
var dataSourceRunsStatusEnum = pgEnum("data_source_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);
var dataSourceRuns = pgTable(
  "data_source_runs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    dataSourceId: integer("dataSourceId").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    status: dataSourceRunsStatusEnum("status").notNull().default("pending"),
    recordsProcessed: integer("recordsProcessed").notNull().default(0),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdById: integer("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [index("data_source_runs_source_started_idx").on(table.dataSourceId, table.startedAt)]
);
var dataRecords = pgTable(
  "data_records",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    dataSourceId: integer("dataSourceId").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    payload: jsonb("payload").$type().notNull(),
    searchableText: text("searchableText"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [uniqueIndex("data_records_source_external_unique").on(table.dataSourceId, table.externalId), index("data_records_workspace_source_idx").on(table.workspaceId, table.dataSourceId)]
);
var documentsStatusEnum = pgEnum("documents_status", ["uploading", "processing", "ready", "failed", "deleted"]);
var documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: text("storageUrl").notNull(),
    status: documentsStatusEnum("status").notNull().default("uploading"),
    processingError: text("processingError"),
    uploadedById: integer("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("documents_storage_key_unique").on(table.storageKey),
    index("documents_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt)
  ]
);
var documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: integer("documentId").notNull().references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("document_chunks_document_index_unique").on(table.documentId, table.chunkIndex),
    index("document_chunks_workspace_idx").on(table.workspaceId)
  ]
);
var businessMetrics = pgTable(
  "business_metrics",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    metricDate: timestamp("metricDate").notNull(),
    metricKey: varchar("metricKey", { length: 80 }).notNull(),
    segment: varchar("segment", { length: 80 }).notNull().default("all"),
    metricValue: numeric("metricValue", { precision: 18, scale: 4 }).notNull(),
    metadata: jsonb("metadata").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("business_metrics_workspace_date_key_segment_unique").on(table.workspaceId, table.metricDate, table.metricKey, table.segment),
    index("business_metrics_workspace_key_date_idx").on(table.workspaceId, table.metricKey, table.metricDate)
  ]
);
var workflowsStatusEnum = pgEnum("workflows_status", ["active", "paused", "draft", "archived"]);
var workflows = pgTable(
  "workflows",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    status: workflowsStatusEnum("status").notNull().default("draft"),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("workflows_workspace_name_unique").on(table.workspaceId, table.name),
    uniqueIndex("workflows_schedule_task_unique").on(table.scheduleCronTaskUid),
    index("workflows_workspace_status_idx").on(table.workspaceId, table.status)
  ]
);
var workflowNodesNodeTypeEnum = pgEnum("workflow_nodes_node_type", ["trigger", "intelligence", "condition", "action"]);
var workflowNodes = pgTable(
  "workflow_nodes",
  {
    id: serial("id").primaryKey(),
    workflowId: integer("workflowId").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    nodeKey: varchar("nodeKey", { length: 80 }).notNull(),
    nodeType: workflowNodesNodeTypeEnum("nodeType").notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    description: text("description"),
    positionX: integer("positionX").notNull().default(0),
    positionY: integer("positionY").notNull().default(0),
    sortOrder: integer("sortOrder").notNull().default(0),
    configuration: jsonb("configuration").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("workflow_nodes_workflow_key_unique").on(table.workflowId, table.nodeKey),
    index("workflow_nodes_workflow_sort_idx").on(table.workflowId, table.sortOrder)
  ]
);
var workflowRunsStatusEnum = pgEnum("workflow_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);
var workflowRunsTriggerTypeEnum = pgEnum("workflow_runs_trigger_type", ["manual", "event", "schedule"]);
var workflowRuns = pgTable(
  "workflow_runs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    workflowId: integer("workflowId").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    status: workflowRunsStatusEnum("status").notNull().default("pending"),
    triggerType: workflowRunsTriggerTypeEnum("triggerType").notNull().default("manual"),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }),
    output: jsonb("output").$type(),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdById: integer("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("workflow_runs_workspace_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("workflow_runs_workflow_started_idx").on(table.workflowId, table.startedAt)
  ]
);
var integrationsStatusEnum = pgEnum("integrations_status", ["connected", "failed", "disconnected"]);
var integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: integrationsStatusEnum("status").notNull().default("disconnected"),
    secretReference: varchar("secretReference", { length: 255 }),
    configuration: jsonb("configuration").$type(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("integrations_workspace_provider_name_unique").on(table.workspaceId, table.provider, table.name),
    index("integrations_workspace_status_idx").on(table.workspaceId, table.status)
  ]
);
var notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    recipientUserId: integer("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    relatedEntityType: varchar("relatedEntityType", { length: 80 }),
    relatedEntityId: varchar("relatedEntityId", { length: 80 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    index("notifications_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt),
    index("notifications_workspace_created_idx").on(table.workspaceId, table.createdAt)
  ]
);
var auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
    actorUserId: integer("actorUserId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    resourceType: varchar("resourceType", { length: 80 }).notNull(),
    resourceId: varchar("resourceId", { length: 80 }),
    metadata: jsonb("metadata").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => [
    index("audit_logs_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("audit_logs_organization_created_idx").on(table.organizationId, table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt)
  ]
);

// server/db.ts
import { and, asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { nanoid } from "nanoid";
var connection = null;
async function getDb() {
  if (!connection && process.env.DATABASE_URL) {
    const client2 = postgres(process.env.DATABASE_URL, { prepare: false });
    connection = drizzle(client2);
  }
  return connection;
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database service is unavailable");
  return db;
}
async function getActiveMembership(workspaceId, userId) {
  const db = await requireDb();
  return (await db.select().from(memberships).where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId), eq(memberships.isActive, true))).limit(1))[0];
}
async function getWorkspaceContext(workspaceId) {
  const db = await requireDb();
  return (await db.select({ workspace: workspaces, organization: organizations }).from(workspaces).innerJoin(organizations, eq(workspaces.organizationId, organizations.id)).where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deletedAt), isNull(organizations.deletedAt))).limit(1))[0];
}
async function listWorkspacesForUser(userId) {
  const db = await requireDb();
  return db.select({ workspace: workspaces, organization: organizations, role: memberships.role }).from(memberships).innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id)).innerJoin(organizations, eq(workspaces.organizationId, organizations.id)).where(and(eq(memberships.userId, userId), eq(memberships.isActive, true), isNull(workspaces.deletedAt), isNull(organizations.deletedAt)));
}
async function listWorkspaceMembers(workspaceId) {
  const db = await requireDb();
  return db.select({
    userId: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    role: memberships.role,
    isActive: memberships.isActive,
    joinedAt: memberships.createdAt
  }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.isActive, true))).orderBy(asc(memberships.createdAt));
}
function slugify(value) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
  return base || "workspace";
}
async function bootstrapWorkspace(user, organizationNameOverride) {
  const existing = await listWorkspacesForUser(user.id);
  if (existing.length > 0) return existing;
  const db = await requireDb();
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "My Organization";
  const suffix = nanoid(6).toLowerCase();
  const organizationName = organizationNameOverride?.trim() || `${displayName}'s Organization`;
  const [organization] = await db.insert(organizations).values({
    name: organizationName,
    slug: `${slugify(displayName)}-${suffix}`,
    createdById: user.id
  }).returning({ id: organizations.id });
  const [workspace] = await db.insert(workspaces).values({
    organizationId: organization.id,
    name: organizationName === `${displayName}'s Organization` ? "Main workspace" : `${organizationName} workspace`,
    slug: "main",
    isDefault: true,
    createdById: user.id
  }).returning({ id: workspaces.id });
  await db.insert(memberships).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
  await db.insert(userPreferences).values({ workspaceId: workspace.id, userId: user.id });
  return listWorkspacesForUser(user.id);
}
async function writeAuditLog(input) {
  const context = await getWorkspaceContext(input.workspaceId);
  if (!context) return;
  const db = await requireDb();
  await db.insert(auditLogs).values({
    organizationId: context.organization.id,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId === void 0 || input.resourceId === null ? null : String(input.resourceId),
    metadata: input.metadata
  });
}

// server/_core/env.ts
function getOptional(name) {
  return process.env[name]?.trim() || void 0;
}
var ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  appUrl: getOptional("APP_URL") ?? "http://localhost:3000",
  appOrigin: getOptional("APP_ORIGIN") ?? "http://localhost:3000",
  databaseUrl: getOptional("DATABASE_URL"),
  sessionSecret: getOptional("SESSION_SECRET") ?? getOptional("JWT_SECRET") ?? "",
  sessionDays: Number(process.env.SESSION_DAYS ?? 14),
  ai: {
    provider: getOptional("AI_PROVIDER") ?? "openai-compatible",
    baseUrl: getOptional("AI_BASE_URL"),
    apiKey: getOptional("AI_API_KEY"),
    model: getOptional("AI_MODEL") ?? "gpt-4o-mini"
  },
  storage: {
    bucket: getOptional("S3_BUCKET"),
    region: getOptional("S3_REGION") ?? "us-east-1",
    endpoint: getOptional("S3_ENDPOINT"),
    accessKeyId: getOptional("S3_ACCESS_KEY_ID"),
    secretAccessKey: getOptional("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
  },
  email: {
    provider: getOptional("EMAIL_PROVIDER") ?? "console",
    from: getOptional("EMAIL_FROM"),
    apiKey: getOptional("EMAIL_API_KEY")
  },
  oauth: {
    googleClientId: getOptional("OAUTH_GOOGLE_CLIENT_ID"),
    googleClientSecret: getOptional("OAUTH_GOOGLE_CLIENT_SECRET")
  }
};

// server/email.ts
async function sendEmail(message) {
  if (ENV.email.provider === "console") {
    console.info(JSON.stringify({ event: "email.queued_console", to: message.to, subject: message.subject }));
    return { provider: "console", delivered: false };
  }
  if (ENV.email.provider !== "resend") throw new Error(`Unsupported EMAIL_PROVIDER: ${ENV.email.provider}`);
  if (!ENV.email.apiKey || !ENV.email.from) throw new Error("EMAIL_API_KEY and EMAIL_FROM are required for Resend");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.email.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.email.from, to: [message.to], subject: message.subject, text: message.text, ...message.html ? { html: message.html } : {} })
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status}): ${await response.text()}`);
  const result = await response.json();
  return { provider: "resend", delivered: true, id: result.id };
}

// server/auth.ts
var SESSION_COOKIE = "sopranova_session";
function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}
function publicUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
async function registerWithPassword(input) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  const existing = (await db.select().from(users).where(eq2(users.email, email)).limit(1))[0];
  if (existing) throw new Error("EMAIL_ALREADY_REGISTERED");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [row] = await db.insert(users).values({
    openId: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash,
    loginMethod: "credentials",
    authProvider: "credentials",
    role: "user",
    lastSignedIn: /* @__PURE__ */ new Date()
  }).returning({ id: users.id });
  const id = row.id;
  const user = (await db.select().from(users).where(eq2(users.id, id)).limit(1))[0];
  if (!user) throw new Error("USER_CREATION_FAILED");
  return user;
}
async function authenticateWithPassword(emailInput, password) {
  const db = await requireDb();
  const email = emailInput.trim().toLowerCase();
  const user = (await db.select().from(users).where(eq2(users.email, email)).limit(1))[0];
  if (!user?.passwordHash || !await bcrypt.compare(password, user.passwordHash)) return null;
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
  return user;
}
async function requestPasswordReset(emailInput) {
  const db = await requireDb();
  const email = emailInput.trim().toLowerCase();
  const user = (await db.select().from(users).where(eq2(users.email, email)).limit(1))[0];
  if (!user?.email) return { accepted: true };
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1e3);
  await db.delete(passwordResetTokens).where(eq2(passwordResetTokens.userId, user.id));
  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: tokenHash(rawToken), expiresAt });
  const resetUrl = `${ENV.appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your SOPRANOVA password",
    text: `Use this link to reset your password (expires in 30 minutes): ${resetUrl}`
  });
  return { accepted: true };
}
async function resetPassword(rawToken, password) {
  const db = await requireDb();
  const token = (await db.select().from(passwordResetTokens).where(and2(eq2(passwordResetTokens.tokenHash, tokenHash(rawToken)), gt(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date()), isNull2(passwordResetTokens.usedAt))).limit(1))[0];
  if (!token) throw new Error("INVALID_RESET_TOKEN");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, authProvider: "credentials", loginMethod: "credentials" }).where(eq2(users.id, token.userId));
  await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq2(passwordResetTokens.id, token.id));
  await db.delete(authSessions).where(eq2(authSessions.userId, token.userId));
  return { success: true };
}
async function createSession(userId) {
  const db = await requireDb();
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + ENV.sessionDays * 24 * 60 * 60 * 1e3);
  await db.insert(authSessions).values({ id: randomUUID(), userId, tokenHash: tokenHash(token), expiresAt });
  return { token, expiresAt };
}
async function revokeSession(token) {
  if (!token) return;
  const db = await requireDb();
  await db.delete(authSessions).where(eq2(authSessions.tokenHash, tokenHash(token)));
}
async function getUserFromSession(cookieHeader) {
  const token = cookieHeader ? parse(cookieHeader)[SESSION_COOKIE] : void 0;
  if (!token) return null;
  const db = await requireDb();
  const result = await db.select({ user: users, session: authSessions }).from(authSessions).innerJoin(users, eq2(authSessions.userId, users.id)).where(and2(eq2(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
  if (!result[0]) return null;
  await db.update(authSessions).set({ lastUsedAt: /* @__PURE__ */ new Date() }).where(eq2(authSessions.id, result[0].session.id));
  return result[0].user;
}
function sessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: ENV.isProduction && process.env.DISABLE_SECURE_COOKIE !== "1",
    sameSite: "lax",
    path: "/",
    ...expiresAt ? { expires: expiresAt } : { maxAge: 0 }
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "You must be signed in to perform this action.";
var NOT_ADMIN_ERR_MSG = "You do not have the required permission.";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var requestLogging = t.middleware(async (opts) => {
  const startedAt = Date.now();
  try {
    const result = await opts.next();
    console.info(JSON.stringify({
      event: "trpc.request",
      path: opts.path,
      type: opts.type,
      userId: opts.ctx.user?.id ?? null,
      durationMs: Date.now() - startedAt,
      outcome: result.ok ? "success" : "error"
    }));
    return result;
  } catch (error) {
    const trpcError = error instanceof TRPCError ? error : null;
    console.error(JSON.stringify({
      event: "trpc.request",
      path: opts.path,
      type: opts.type,
      userId: opts.ctx.user?.id ?? null,
      durationMs: Date.now() - startedAt,
      outcome: "error",
      code: trpcError?.code ?? "INTERNAL_SERVER_ERROR"
    }));
    throw error;
  }
});
var publicProcedure = t.procedure.use(requestLogging);
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = publicProcedure.use(requireUser);
var adminProcedure = protectedProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(z.object({ timestamp: z.number().min(0, "timestamp cannot be negative") }).optional()).query(() => ({ ok: true, service: "sopranova-api", timestamp: (/* @__PURE__ */ new Date()).toISOString() }))
});

// server/routers/agents.ts
import { and as and4, desc, eq as eq4, isNull as isNull3 } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod";

// server/authz.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z2 } from "zod";
var workspaceInput = z2.object({ workspaceId: z2.number().int().positive() });
function unwrapSuperjson(rawInput) {
  if (rawInput && typeof rawInput === "object" && "json" in rawInput) {
    return rawInput.json;
  }
  return rawInput;
}
var workspaceProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput();
  const unwrapped = unwrapSuperjson(rawInput);
  const parsed = workspaceInput.safeParse(unwrapped);
  if (!parsed.success) {
    throw new TRPCError2({ code: "BAD_REQUEST", message: "A valid workspace is required." });
  }
  const membership = await getActiveMembership(parsed.data.workspaceId, ctx.user.id);
  if (!membership) {
    throw new TRPCError2({ code: "FORBIDDEN", message: "You do not have access to this workspace." });
  }
  return next({
    ctx: { ...ctx, workspaceId: parsed.data.workspaceId, workspaceRole: membership.role }
  });
});
function workspaceRoleProcedure(allowed) {
  return workspaceProcedure.use(async ({ ctx, next }) => {
    if (!allowed.includes(ctx.workspaceRole)) {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Your workspace role cannot perform this action." });
    }
    return next({ ctx });
  });
}
var workspaceMemberProcedure = workspaceRoleProcedure(["owner", "admin", "member"]);
var workspaceManagerProcedure = workspaceRoleProcedure(["owner", "admin"]);
var workspaceOwnerProcedure = workspaceRoleProcedure(["owner"]);

// server/jobs.ts
import { and as and3, asc as asc2, eq as eq3, lte } from "drizzle-orm";
async function enqueueJob(input) {
  const db = await requireDb();
  const [row] = await db.insert(jobs).values({ workspaceId: input.workspaceId, type: input.type, payload: input.payload, runAt: input.runAt ?? /* @__PURE__ */ new Date(), maxAttempts: input.maxAttempts ?? 3 }).returning({ id: jobs.id });
  return row.id;
}

// server/routers/agents.ts
var workspaceIdInput = z3.object({ workspaceId: z3.number().int().positive() });
async function workspaceAgent(workspaceId, agentId) {
  const db = await requireDb();
  const agent = (await db.select().from(agents).where(and4(eq4(agents.id, agentId), eq4(agents.workspaceId, workspaceId), isNull3(agents.deletedAt))).limit(1))[0];
  if (!agent) throw new TRPCError3({ code: "NOT_FOUND", message: "Agent not found in this workspace." });
  return agent;
}
var agentsRouter = router({
  list: workspaceProcedure.input(workspaceIdInput.extend({ status: z3.enum(["active", "idle", "paused", "error"]).optional() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const conditions = [eq4(agents.workspaceId, ctx.workspaceId), isNull3(agents.deletedAt)];
    if (input.status) conditions.push(eq4(agents.status, input.status));
    return db.select().from(agents).where(and4(...conditions)).orderBy(desc(agents.updatedAt));
  }),
  get: workspaceProcedure.input(workspaceIdInput.extend({ agentId: z3.number().int().positive() })).query(({ ctx, input }) => workspaceAgent(ctx.workspaceId, input.agentId)),
  create: workspaceManagerProcedure.input(workspaceIdInput.extend({ name: z3.string().trim().min(2).max(160), purpose: z3.string().trim().min(4).max(2e3), description: z3.string().trim().max(4e3).optional(), capabilities: z3.array(z3.string().trim().min(1).max(80)).max(20).default([]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const created = await db.insert(agents).values({ workspaceId: ctx.workspaceId, name: input.name, purpose: input.purpose, description: input.description, capabilities: input.capabilities, createdById: ctx.user.id }).returning({ id: agents.id });
    const id = created[0].id;
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "agent.created", resourceType: "agent", resourceId: id });
    return workspaceAgent(ctx.workspaceId, id);
  }),
  setStatus: workspaceManagerProcedure.input(workspaceIdInput.extend({ agentId: z3.number().int().positive(), status: z3.enum(["active", "idle", "paused"]) })).mutation(async ({ ctx, input }) => {
    await workspaceAgent(ctx.workspaceId, input.agentId);
    const db = await requireDb();
    await db.update(agents).set({ status: input.status, lastActivityAt: /* @__PURE__ */ new Date() }).where(and4(eq4(agents.id, input.agentId), eq4(agents.workspaceId, ctx.workspaceId)));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: `agent.status_${input.status}`, resourceType: "agent", resourceId: input.agentId });
    return { success: true };
  }),
  runs: workspaceProcedure.input(workspaceIdInput.extend({ agentId: z3.number().int().positive(), pageSize: z3.number().int().min(1).max(50).default(20) })).query(async ({ ctx, input }) => {
    await workspaceAgent(ctx.workspaceId, input.agentId);
    const db = await requireDb();
    return db.select().from(agentRuns).where(and4(eq4(agentRuns.workspaceId, ctx.workspaceId), eq4(agentRuns.agentId, input.agentId))).orderBy(desc(agentRuns.createdAt)).limit(input.pageSize);
  }),
  runNow: workspaceMemberProcedure.input(workspaceIdInput.extend({ agentId: z3.number().int().positive(), instruction: z3.string().trim().min(3).max(4e3) })).mutation(async ({ ctx, input }) => {
    const agent = await workspaceAgent(ctx.workspaceId, input.agentId);
    const db = await requireDb();
    const runInsert = await db.insert(agentRuns).values({ workspaceId: ctx.workspaceId, agentId: agent.id, status: "pending", triggerType: "manual", progress: 0, input: { instruction: input.instruction }, createdById: ctx.user.id }).returning({ id: agentRuns.id });
    const runId = runInsert[0].id;
    await enqueueJob({ workspaceId: ctx.workspaceId, type: "agent.run", payload: { runId, agentId: agent.id, workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, instruction: input.instruction } });
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "agent.run_queued", resourceType: "agentRun", resourceId: runId, metadata: { agentId: agent.id } });
    return { id: runId, status: "pending", content: "The agent run was queued for the SOPRANOVA worker." };
  })
});

// server/routers/analytics.ts
import { and as and5, eq as eq5, gte, lt, sql } from "drizzle-orm";
import { z as z4 } from "zod";
var workspaceInput2 = z4.object({ workspaceId: z4.number().int().positive() });
var rangeDays = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
var analyticsInput = workspaceInput2.extend({ range: z4.enum(["7D", "30D", "90D", "1Y"]).default("1Y"), segment: z4.string().trim().max(80).optional() });
function dates(range) {
  const end = /* @__PURE__ */ new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - rangeDays[range]);
  const previous = new Date(start);
  previous.setUTCDate(previous.getUTCDate() - rangeDays[range]);
  return { start, end, previous };
}
var analyticsRouter = router({
  overview: workspaceProcedure.input(analyticsInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start, previous } = dates(input.range);
    const currentRows = await db.select().from(businessMetrics).where(and5(eq5(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, start), input.segment ? eq5(businessMetrics.segment, input.segment) : void 0));
    const previousRows = await db.select().from(businessMetrics).where(and5(eq5(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, previous), lt(businessMetrics.metricDate, start), input.segment ? eq5(businessMetrics.segment, input.segment) : void 0));
    const summarize = (rows, key2) => rows.filter((row) => row.metricKey === key2).reduce((sum, row) => sum + Number(row.metricValue), 0);
    const keys = ["mrr", "nrr", "cac", "acv", "revenue"];
    const kpis = Object.fromEntries(keys.map((key2) => {
      const value = summarize(currentRows, key2);
      const prior = summarize(previousRows, key2);
      return [key2, { value, priorValue: prior, changePercent: prior === 0 ? null : (value - prior) / Math.abs(prior) * 100 }];
    }));
    return { range: input.range, kpis, series: currentRows.filter((row) => row.metricKey === "revenue").map((row) => ({ date: row.metricDate, value: Number(row.metricValue), segment: row.segment })) };
  }),
  segments: workspaceProcedure.input(analyticsInput.extend({ page: z4.number().int().min(1).default(1), pageSize: z4.number().int().min(1).max(100).default(25), sortBy: z4.enum(["segment", "mrr", "nrr", "cac", "acv"]).default("segment"), sortDirection: z4.enum(["asc", "desc"]).default("asc") })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const { start } = dates(input.range);
    const rows = await db.select({ segment: businessMetrics.segment, metricKey: businessMetrics.metricKey, total: sql`sum(${businessMetrics.metricValue})` }).from(businessMetrics).where(and5(eq5(businessMetrics.workspaceId, ctx.workspaceId), gte(businessMetrics.metricDate, start))).groupBy(businessMetrics.segment, businessMetrics.metricKey);
    const grouped = /* @__PURE__ */ new Map();
    for (const row of rows) grouped.set(row.segment, { ...grouped.get(row.segment) ?? {}, [row.metricKey]: Number(row.total) });
    const items = Array.from(grouped.entries()).map(([segment, values]) => ({ segment, ...values }));
    items.sort((left, right) => {
      const leftValue = input.sortBy === "segment" ? left.segment : left[input.sortBy] ?? 0;
      const rightValue = input.sortBy === "segment" ? right.segment : right[input.sortBy] ?? 0;
      const comparison = typeof leftValue === "string" && typeof rightValue === "string" ? leftValue.localeCompare(rightValue) : Number(leftValue) - Number(rightValue);
      return input.sortDirection === "asc" ? comparison : -comparison;
    });
    const startIndex = (input.page - 1) * input.pageSize;
    return { items: items.slice(startIndex, startIndex + input.pageSize), total: items.length, page: input.page, pageSize: input.pageSize };
  })
});

// server/routers/notifications.ts
import { and as and6, desc as desc2, eq as eq6, isNull as isNull4 } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z5 } from "zod";
var workspaceInput3 = z5.object({ workspaceId: z5.number().int().positive() });
var notificationsRouter = router({
  list: workspaceProcedure.input(workspaceInput3.extend({ unreadOnly: z5.boolean().default(false), limit: z5.number().int().min(1).max(100).default(30) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const conditions = [eq6(notifications.workspaceId, ctx.workspaceId), eq6(notifications.recipientUserId, ctx.user.id)];
    if (input.unreadOnly) conditions.push(isNull4(notifications.readAt));
    return db.select().from(notifications).where(and6(...conditions)).orderBy(desc2(notifications.createdAt)).limit(input.limit);
  }),
  markRead: workspaceProcedure.input(workspaceInput3.extend({ notificationId: z5.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const notification = (await db.select().from(notifications).where(and6(eq6(notifications.id, input.notificationId), eq6(notifications.workspaceId, ctx.workspaceId), eq6(notifications.recipientUserId, ctx.user.id))).limit(1))[0];
    if (!notification) throw new TRPCError4({ code: "NOT_FOUND", message: "Notification not found." });
    await db.update(notifications).set({ readAt: notification.readAt ?? /* @__PURE__ */ new Date() }).where(eq6(notifications.id, input.notificationId));
    return { success: true };
  }),
  markAllRead: workspaceProcedure.input(workspaceInput3).mutation(async ({ ctx }) => {
    const db = await requireDb();
    await db.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and6(eq6(notifications.workspaceId, ctx.workspaceId), eq6(notifications.recipientUserId, ctx.user.id), isNull4(notifications.readAt)));
    return { success: true };
  })
});
var auditRouter = router({
  list: workspaceManagerProcedure.input(workspaceInput3.extend({ page: z5.number().int().min(1).default(1), pageSize: z5.number().int().min(1).max(100).default(50) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const offset = (input.page - 1) * input.pageSize;
    const items = await db.select().from(auditLogs).where(eq6(auditLogs.workspaceId, ctx.workspaceId)).orderBy(desc2(auditLogs.createdAt)).limit(input.pageSize).offset(offset);
    return { items, page: input.page, pageSize: input.pageSize };
  })
});

// server/routers/conversations.ts
import { and as and7, desc as desc3, eq as eq7, isNull as isNull5, like, or } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z6 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => {
  if (!ENV.ai.baseUrl) throw new Error("AI_BASE_URL is not configured");
  const baseUrl = ENV.ai.baseUrl.replace(/\/$/, "");
  return baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
};
var assertApiKey = () => {
  if (!ENV.ai.apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages: messages2,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages2.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.ai.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}
async function listLLMModels() {
  assertApiKey();
  if (!ENV.ai.baseUrl) throw new Error("AI_BASE_URL is not configured");
  const baseUrl = ENV.ai.baseUrl.replace(/\/$/, "");
  const url = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.ai.apiKey}` }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/routers/conversations.ts
var workspaceInput4 = z6.object({ workspaceId: z6.number().int().positive() });
function responseText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.filter((item) => typeof item === "object" && item !== null && "type" in item && item.type === "text" && "text" in item && typeof item.text === "string").map((item) => item.text).join("\n");
  }
  return "";
}
async function ensureConversation(workspaceId, conversationId) {
  const db = await requireDb();
  const conversation = (await db.select().from(conversations).where(and7(eq7(conversations.id, conversationId), eq7(conversations.workspaceId, workspaceId), isNull5(conversations.deletedAt))).limit(1))[0];
  if (!conversation) throw new TRPCError5({ code: "NOT_FOUND", message: "Conversation not found in this workspace." });
  return conversation;
}
var conversationsRouter = router({
  list: workspaceProcedure.input(workspaceInput4).query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(conversations).where(and7(eq7(conversations.workspaceId, ctx.workspaceId), isNull5(conversations.deletedAt))).orderBy(desc3(conversations.lastMessageAt));
  }),
  create: workspaceMemberProcedure.input(workspaceInput4.extend({ title: z6.string().trim().min(2).max(255).default("New conversation") })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(conversations).values({ workspaceId: ctx.workspaceId, title: input.title, createdById: ctx.user.id }).returning({ id: conversations.id });
    const id = row.id;
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "conversation.created", resourceType: "conversation", resourceId: id });
    return ensureConversation(ctx.workspaceId, id);
  }),
  rename: workspaceMemberProcedure.input(workspaceInput4.extend({ conversationId: z6.number().int().positive(), title: z6.string().trim().min(2).max(255) })).mutation(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    await db.update(conversations).set({ title: input.title }).where(and7(eq7(conversations.id, input.conversationId), eq7(conversations.workspaceId, ctx.workspaceId)));
    return { success: true };
  }),
  delete: workspaceMemberProcedure.input(workspaceInput4.extend({ conversationId: z6.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const conversation = await ensureConversation(ctx.workspaceId, input.conversationId);
    if (conversation.createdById !== ctx.user.id && !["owner", "admin"].includes(ctx.workspaceRole)) {
      throw new TRPCError5({ code: "FORBIDDEN", message: "Only the conversation owner or a manager can delete it." });
    }
    const db = await requireDb();
    await db.update(conversations).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq7(conversations.id, input.conversationId));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "conversation.deleted", resourceType: "conversation", resourceId: input.conversationId });
    return { success: true };
  }),
  messages: workspaceProcedure.input(workspaceInput4.extend({ conversationId: z6.number().int().positive() })).query(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    const messageList = await db.select().from(messages).where(and7(eq7(messages.workspaceId, ctx.workspaceId), eq7(messages.conversationId, input.conversationId))).orderBy(messages.createdAt);
    const sourceRows = messageList.length === 0 ? [] : await db.select().from(messageSources).where(eq7(messageSources.workspaceId, ctx.workspaceId));
    return messageList.map((message) => ({ ...message, sources: sourceRows.filter((source) => source.messageId === message.id) }));
  }),
  search: workspaceProcedure.input(workspaceInput4.extend({ query: z6.string().trim().min(2).max(120), pageSize: z6.number().int().min(1).max(30).default(10) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const phrase = `%${input.query}%`;
    return db.select({ message: messages, conversation: conversations }).from(messages).innerJoin(conversations, eq7(messages.conversationId, conversations.id)).where(and7(eq7(messages.workspaceId, ctx.workspaceId), isNull5(conversations.deletedAt), or(like(messages.content, phrase), like(conversations.title, phrase)))).orderBy(desc3(messages.createdAt)).limit(input.pageSize);
  })
});
var intelligenceRouter = router({
  ask: workspaceMemberProcedure.input(workspaceInput4.extend({ conversationId: z6.number().int().positive(), question: z6.string().trim().min(3).max(4e3) })).mutation(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    const questionInsert = await db.insert(messages).values({ workspaceId: ctx.workspaceId, conversationId: input.conversationId, authorUserId: ctx.user.id, role: "user", kind: "question", content: input.question }).returning({ id: messages.id });
    const questionId = questionInsert[0].id;
    const [sourceRows, documentRows, history] = await Promise.all([
      db.select({ id: dataSources.id, name: dataSources.name, type: dataSources.type }).from(dataSources).where(and7(eq7(dataSources.workspaceId, ctx.workspaceId), eq7(dataSources.status, "connected"), isNull5(dataSources.deletedAt))).limit(8),
      db.select({ id: documents.id, name: documents.originalName }).from(documents).where(and7(eq7(documents.workspaceId, ctx.workspaceId), eq7(documents.status, "ready"), isNull5(documents.deletedAt))).limit(8),
      db.select().from(messages).where(and7(eq7(messages.workspaceId, ctx.workspaceId), eq7(messages.conversationId, input.conversationId))).orderBy(desc3(messages.createdAt)).limit(12)
    ]);
    const sourceNames = [...sourceRows.map((source) => `${source.name} (${source.type})`), ...documentRows.map((document) => document.name)];
    try {
      const catalog = await listLLMModels();
      const model = catalog.data.find((item) => item.id === "gpt-5-mini")?.id;
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: `You are SOPRANOVA Intelligence. Answer only from the conversation and source inventory provided. Do not claim to have inspected source contents that are not included. If evidence is insufficient, say what data is needed. Available workspace source inventory: ${sourceNames.length ? sourceNames.join(", ") : "none"}.` },
          ...history.reverse().map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }))
        ],
        maxTokens: 1400
      });
      const content = responseText(response.choices[0]?.message?.content) || "I could not produce a response.";
      const answerInsert = await db.insert(messages).values({ workspaceId: ctx.workspaceId, conversationId: input.conversationId, role: "assistant", kind: "insight", content }).returning({ id: messages.id });
      const answerId = answerInsert[0].id;
      const sourceValues = [
        ...sourceRows.map((source) => ({ messageId: answerId, workspaceId: ctx.workspaceId, label: source.name, sourceType: "data_source", sourceReference: String(source.id) })),
        ...documentRows.map((document) => ({ messageId: answerId, workspaceId: ctx.workspaceId, label: document.name, sourceType: "document", sourceReference: String(document.id) }))
      ];
      if (sourceValues.length) await db.insert(messageSources).values(sourceValues);
      await db.update(conversations).set({ lastMessageAt: /* @__PURE__ */ new Date() }).where(eq7(conversations.id, input.conversationId));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "intelligence.asked", resourceType: "conversation", resourceId: input.conversationId, metadata: { questionId, answerId } });
      return { id: answerId, content, kind: "insight", sources: sourceValues.map((source) => ({ label: source.label, sourceType: source.sourceType, sourceReference: source.sourceReference })) };
    } catch (error) {
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "intelligence.failed", resourceType: "conversation", resourceId: input.conversationId, metadata: { questionId } });
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Intelligence could not answer this query. Please retry.", cause: error });
    }
  })
});

// server/routers/dashboard.ts
import { and as and8, desc as desc4, eq as eq8, gte as gte2, isNull as isNull6 } from "drizzle-orm";
import { z as z7 } from "zod";
var ranges = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
var inputSchema = z7.object({ workspaceId: z7.number().int().positive(), range: z7.enum(["7D", "30D", "90D", "1Y"]).default("1Y") });
function startOfRange(range) {
  const date = /* @__PURE__ */ new Date();
  date.setUTCDate(date.getUTCDate() - ranges[range]);
  return date;
}
var dashboardRouter = router({
  overview: workspaceProcedure.input(inputSchema).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const since = startOfRange(input.range);
    const [metrics, activeAgents, sourceList, signalList, recentActivity] = await Promise.all([
      db.select().from(businessMetrics).where(and8(eq8(businessMetrics.workspaceId, ctx.workspaceId), gte2(businessMetrics.metricDate, since))),
      db.select().from(agents).where(and8(eq8(agents.workspaceId, ctx.workspaceId), eq8(agents.status, "active"), isNull6(agents.deletedAt))),
      db.select().from(dataSources).where(and8(eq8(dataSources.workspaceId, ctx.workspaceId), isNull6(dataSources.deletedAt))),
      db.select().from(insights).where(and8(eq8(insights.workspaceId, ctx.workspaceId), eq8(insights.status, "open"))).orderBy(desc4(insights.createdAt)).limit(6),
      db.select().from(auditLogs).where(eq8(auditLogs.workspaceId, ctx.workspaceId)).orderBy(desc4(auditLogs.createdAt)).limit(12)
    ]);
    const revenue = metrics.filter((metric) => metric.metricKey === "revenue").reduce((total, metric) => total + Number(metric.metricValue), 0);
    const insightsToday = signalList.filter((signal) => signal.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1e3)).length;
    return {
      range: input.range,
      kpis: {
        revenue,
        activeAgents: activeAgents.length,
        dataSources: sourceList.length,
        insightsToday
      },
      revenueSeries: metrics.filter((metric) => metric.metricKey === "revenue").map((metric) => ({ date: metric.metricDate, value: Number(metric.metricValue) })),
      activeAgents,
      signals: signalList,
      activity: recentActivity
    };
  }),
  runSummary: workspaceProcedure.input(z7.object({ workspaceId: z7.number().int().positive(), limit: z7.number().int().min(1).max(30).default(8) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    return db.select().from(agentRuns).where(eq8(agentRuns.workspaceId, ctx.workspaceId)).orderBy(desc4(agentRuns.createdAt)).limit(input.limit);
  })
});

// server/routers/data.ts
import { and as and9, desc as desc5, eq as eq9, isNull as isNull7 } from "drizzle-orm";
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z8 } from "zod";

// server/crypto.ts
import { createCipheriv, createDecipheriv, createHash as createHash2, randomBytes as randomBytes2 } from "node:crypto";
function key() {
  const secret = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY is required to configure external data sources");
  return createHash2("sha256").update(secret).digest();
}
function encryptJson(value) {
  const iv = randomBytes2(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}

// server/storage.ts
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var client = null;
function storageConfig() {
  if (!ENV.storage.bucket) throw new Error("S3_BUCKET is not configured");
  if (!ENV.storage.accessKeyId || !ENV.storage.secretAccessKey) throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
  return ENV.storage;
}
function getClient() {
  if (!client) {
    const config = storageConfig();
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
    });
  }
  return client;
}
function normalizeKey(value) {
  return value.replace(/^\/+/, "").replace(/\.\./g, "_");
}
function versionedKey(value) {
  const normalized = normalizeKey(value);
  const dot = normalized.lastIndexOf(".");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return dot === -1 ? `${normalized}-${suffix}` : `${normalized.slice(0, dot)}-${suffix}${normalized.slice(dot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const config = storageConfig();
  const key2 = versionedKey(relKey);
  await getClient().send(new PutObjectCommand({ Bucket: config.bucket, Key: key2, Body: data, ContentType: contentType }));
  return { key: key2, url: await storageGetSignedUrl(key2) };
}
async function storageGet(relKey) {
  const key2 = normalizeKey(relKey);
  return { key: key2, url: await storageGetSignedUrl(key2) };
}
async function storageGetSignedUrl(relKey, expiresIn = 900) {
  const config = storageConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }), { expiresIn });
}
async function storageDelete(relKey) {
  const config = storageConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }));
}

// server/routers/data.ts
var workspaceInput5 = z8.object({ workspaceId: z8.number().int().positive() });
var acceptedMimeTypes = /* @__PURE__ */ new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"]);
var maximumUploadBytes = 10 * 1024 * 1024;
var connectionInput = z8.object({ endpoint: z8.string().url().max(2e3), headers: z8.record(z8.string().max(120), z8.string().max(4096)).refine((value) => Object.keys(value).length <= 30, "At most 30 headers are allowed.").default({}) });
function normalizedName(name) {
  return name.replace(/[\\/\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 255);
}
function publicHttpsEndpoint(rawUrl) {
  const endpoint = new URL(rawUrl);
  if (endpoint.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname) || /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(endpoint.hostname)) throw new TRPCError6({ code: "BAD_REQUEST", message: "The data source endpoint must be a public HTTPS URL." });
  return endpoint;
}
function mimeMatchesBytes(mimeType, bytes) {
  const prefix = bytes.subarray(0, 8).toString("utf8");
  if (mimeType === "application/pdf") return prefix.startsWith("%PDF-");
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return bytes.subarray(0, 2).toString("utf8") === "PK";
  return mimeType === "text/csv" && !bytes.subarray(0, Math.min(bytes.length, 2048)).includes(0);
}
var dataSourcesRouter = router({
  list: workspaceProcedure.input(workspaceInput5).query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(dataSources).where(and9(eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))).orderBy(desc5(dataSources.updatedAt));
    return rows.map(({ configuration, ...source }) => ({ ...source, configured: Boolean(configuration) }));
  }),
  create: workspaceManagerProcedure.input(workspaceInput5.extend({ name: z8.string().trim().min(2).max(160), type: z8.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(dataSources).values({ workspaceId: ctx.workspaceId, name: input.name, type: input.type, status: "disconnected", createdById: ctx.user.id }).returning({ id: dataSources.id });
    const id = row.id;
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.created", resourceType: "dataSource", resourceId: id });
    return { id, status: "disconnected" };
  }),
  configureHttp: workspaceManagerProcedure.input(workspaceInput5.extend({ dataSourceId: z8.number().int().positive(), connection: connectionInput })).mutation(async ({ ctx, input }) => {
    const endpoint = publicHttpsEndpoint(input.connection.endpoint);
    const db = await requireDb();
    const source = (await db.select().from(dataSources).where(and9(eq9(dataSources.id, input.dataSourceId), eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))).limit(1))[0];
    if (!source) throw new TRPCError6({ code: "NOT_FOUND", message: "Data source not found in this workspace." });
    await db.update(dataSources).set({ configuration: { mode: "http", secret: encryptJson({ endpoint: endpoint.toString(), headers: input.connection.headers }) }, status: "disconnected", lastError: null }).where(eq9(dataSources.id, source.id));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.configured", resourceType: "dataSource", resourceId: source.id });
    return { success: true };
  }),
  sync: workspaceMemberProcedure.input(workspaceInput5.extend({ dataSourceId: z8.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const source = (await db.select().from(dataSources).where(and9(eq9(dataSources.id, input.dataSourceId), eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))).limit(1))[0];
    if (!source?.configuration) throw new TRPCError6({ code: "CONFLICT", message: "Configure this data source before syncing it." });
    const [runRow] = await db.insert(dataSourceRuns).values({ workspaceId: ctx.workspaceId, dataSourceId: source.id, status: "pending", createdById: ctx.user.id }).returning({ id: dataSourceRuns.id });
    const runId = runRow.id;
    await db.update(dataSources).set({ status: "syncing", lastError: null }).where(eq9(dataSources.id, source.id));
    await enqueueJob({ workspaceId: ctx.workspaceId, type: "data-source.sync", payload: { dataSourceId: source.id, runId, workspaceId: ctx.workspaceId } });
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.sync_queued", resourceType: "dataSourceRun", resourceId: runId });
    return { id: runId, status: "pending" };
  }),
  disconnect: workspaceManagerProcedure.input(workspaceInput5.extend({ dataSourceId: z8.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const source = (await db.select().from(dataSources).where(and9(eq9(dataSources.id, input.dataSourceId), eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))).limit(1))[0];
    if (!source) throw new TRPCError6({ code: "NOT_FOUND", message: "Data source not found in this workspace." });
    await db.update(dataSources).set({ status: "disconnected" }).where(eq9(dataSources.id, input.dataSourceId));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.disconnected", resourceType: "dataSource", resourceId: input.dataSourceId });
    return { success: true };
  }),
  delete: workspaceManagerProcedure.input(workspaceInput5.extend({ dataSourceId: z8.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const source = (await db.select().from(dataSources).where(and9(eq9(dataSources.id, input.dataSourceId), eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))).limit(1))[0];
    if (!source) throw new TRPCError6({ code: "NOT_FOUND", message: "Data source not found in this workspace." });
    await db.update(dataSources).set({ status: "disconnected", configuration: null, deletedAt: /* @__PURE__ */ new Date() }).where(eq9(dataSources.id, source.id));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "data_source.deleted", resourceType: "dataSource", resourceId: source.id });
    return { success: true };
  })
});
var documentsRouter = router({
  list: workspaceProcedure.input(workspaceInput5).query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(documents).where(and9(eq9(documents.workspaceId, ctx.workspaceId), isNull7(documents.deletedAt))).orderBy(desc5(documents.createdAt));
  }),
  upload: workspaceMemberProcedure.input(workspaceInput5.extend({ originalName: z8.string().min(1).max(255), mimeType: z8.string().max(120), dataBase64: z8.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (!acceptedMimeTypes.has(input.mimeType)) throw new TRPCError6({ code: "BAD_REQUEST", message: "This document type is not allowed." });
    const safeName = normalizedName(input.originalName);
    if (!safeName || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.dataBase64)) throw new TRPCError6({ code: "BAD_REQUEST", message: "The upload payload is invalid." });
    const bytes = Buffer.from(input.dataBase64, "base64");
    if (!bytes.length || bytes.length > maximumUploadBytes) throw new TRPCError6({ code: "PAYLOAD_TOO_LARGE", message: "Files must be between 1 byte and 10 MB." });
    if (!mimeMatchesBytes(input.mimeType, bytes)) throw new TRPCError6({ code: "BAD_REQUEST", message: "The file contents do not match the declared document type." });
    const stored = await storagePut(`workspaces/${ctx.workspaceId}/documents/${Date.now()}-${safeName}`, bytes, input.mimeType);
    const db = await requireDb();
    const [docRow] = await db.insert(documents).values({ workspaceId: ctx.workspaceId, originalName: safeName, mimeType: input.mimeType, sizeBytes: bytes.length, storageKey: stored.key, storageUrl: stored.url, status: "processing", uploadedById: ctx.user.id }).returning({ id: documents.id });
    const id = docRow.id;
    await enqueueJob({ workspaceId: ctx.workspaceId, type: "document.process", payload: { documentId: id, workspaceId: ctx.workspaceId } });
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "document.uploaded", resourceType: "document", resourceId: id, metadata: { sizeBytes: bytes.length, mimeType: input.mimeType, processing: "queued" } });
    return { id, originalName: safeName, status: "processing", sizeBytes: bytes.length };
  }),
  accessUrl: workspaceProcedure.input(workspaceInput5.extend({ documentId: z8.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const document = (await db.select().from(documents).where(and9(eq9(documents.id, input.documentId), eq9(documents.workspaceId, ctx.workspaceId), eq9(documents.status, "ready"), isNull7(documents.deletedAt))).limit(1))[0];
    if (!document) throw new TRPCError6({ code: "NOT_FOUND", message: "Document not available in this workspace." });
    return storageGet(document.storageKey);
  }),
  delete: workspaceManagerProcedure.input(workspaceInput5.extend({ documentId: z8.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const document = (await db.select().from(documents).where(and9(eq9(documents.id, input.documentId), eq9(documents.workspaceId, ctx.workspaceId), isNull7(documents.deletedAt))).limit(1))[0];
    if (!document) throw new TRPCError6({ code: "NOT_FOUND", message: "Document not found in this workspace." });
    await storageDelete(document.storageKey);
    await db.update(documents).set({ status: "deleted", deletedAt: /* @__PURE__ */ new Date() }).where(eq9(documents.id, input.documentId));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "document.deleted", resourceType: "document", resourceId: input.documentId });
    return { success: true };
  })
});
var memoryRouter = router({ summary: workspaceProcedure.input(workspaceInput5).query(async ({ ctx }) => {
  const db = await requireDb();
  const [documentList, sourceList, chunks] = await Promise.all([db.select().from(documents).where(and9(eq9(documents.workspaceId, ctx.workspaceId), eq9(documents.status, "ready"), isNull7(documents.deletedAt))), db.select().from(dataSources).where(and9(eq9(dataSources.workspaceId, ctx.workspaceId), isNull7(dataSources.deletedAt))), db.select({ id: documentChunks.id }).from(documentChunks).where(eq9(documentChunks.workspaceId, ctx.workspaceId))]);
  return { documents: documentList.length, dataSources: sourceList.length, indexedChunks: chunks.length, indexingAvailable: chunks.length > 0 };
}) });

// server/routers/workspaces.ts
import { and as and10, eq as eq10, isNull as isNull8 } from "drizzle-orm";
import { z as z9 } from "zod";
var workspaceIdInput2 = z9.object({ workspaceId: z9.number().int().positive() });
var workspacesRouter = router({
  list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),
  bootstrap: protectedProcedure.mutation(async ({ ctx }) => {
    const workspacesForUser = await bootstrapWorkspace(ctx.user);
    return {
      workspaces: workspacesForUser,
      created: workspacesForUser.length === 1
    };
  }),
  current: workspaceProcedure.input(workspaceIdInput2).query(async ({ ctx }) => {
    const items = await listWorkspacesForUser(ctx.user.id);
    return items.find((item) => item.workspace.id === ctx.workspaceId) ?? null;
  }),
  members: workspaceProcedure.input(workspaceIdInput2).query(({ ctx }) => listWorkspaceMembers(ctx.workspaceId)),
  completeOnboarding: workspaceManagerProcedure.input(
    workspaceIdInput2.extend({
      organizationName: z9.string().trim().min(2).max(160),
      workspaceName: z9.string().trim().min(2).max(160).optional(),
      companySize: z9.string().trim().max(32).optional(),
      jobTitle: z9.string().trim().max(160).optional(),
      agentName: z9.string().trim().min(2).max(160).optional(),
      agentPersonality: z9.string().trim().max(8e3).optional(),
      deploymentChannels: z9.array(z9.string().trim().min(1).max(40)).max(20).optional(),
      techStack: z9.array(z9.string().trim().min(1).max(80)).max(40).optional(),
      referralSource: z9.string().trim().max(120).optional(),
      plan: z9.string().trim().max(60).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    console.log("[completeOnboarding] userId:", ctx.user.id, "workspaceId:", ctx.workspaceId, "input:", JSON.stringify(input).substring(0, 200));
    const db = await requireDb();
    const workspace = (await db.select().from(workspaces).where(and10(eq10(workspaces.id, ctx.workspaceId), isNull8(workspaces.deletedAt))).limit(1))[0];
    if (!workspace) {
      console.log("[completeOnboarding] workspace not found!");
      return null;
    }
    await db.update(organizations).set({ name: input.organizationName, companySize: input.companySize ?? null }).where(eq10(organizations.id, workspace.organizationId));
    await db.update(workspaces).set({
      name: input.workspaceName ?? workspace.name,
      onboardingCompleted: true,
      onboardingStep: 6,
      onboardingData: {
        agentName: input.agentName ?? null,
        agentPersonality: input.agentPersonality ?? null,
        deploymentChannels: input.deploymentChannels ?? [],
        techStack: input.techStack ?? [],
        referralSource: input.referralSource ?? null,
        plan: input.plan ?? "free",
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }).where(eq10(workspaces.id, ctx.workspaceId));
    if (input.jobTitle !== void 0) {
      await db.update(users).set({ jobTitle: input.jobTitle || null }).where(eq10(users.id, ctx.user.id));
    }
    let createdAgentId = null;
    const agentName = input.agentName?.trim() || "SOPRANOVA";
    const purpose = input.agentPersonality?.trim() || "Answer customer questions clearly and concisely. Stay polite and professional. Escalate billing or account issues to a human agent when unsure.";
    const capabilities = input.deploymentChannels?.length ? input.deploymentChannels : ["chat"];
    const existingAgent = (await db.select().from(agents).where(and10(eq10(agents.workspaceId, ctx.workspaceId), eq10(agents.name, agentName), isNull8(agents.deletedAt))).limit(1))[0];
    if (!existingAgent) {
      const created = await db.insert(agents).values({
        workspaceId: ctx.workspaceId,
        name: agentName,
        purpose,
        description: purpose.length > 240 ? purpose.slice(0, 240) : purpose,
        capabilities,
        status: "idle",
        createdById: ctx.user.id
      }).returning({ id: agents.id });
      createdAgentId = created[0].id;
    } else {
      createdAgentId = existingAgent.id;
    }
    await writeAuditLog({
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.user.id,
      action: "workspace.onboarding_completed",
      resourceType: "workspace",
      resourceId: ctx.workspaceId,
      metadata: {
        agentName,
        plan: input.plan ?? "free",
        channels: input.deploymentChannels ?? [],
        techStack: input.techStack ?? []
      }
    });
    return { success: true, agentId: createdAgentId };
  }),
  update: workspaceManagerProcedure.input(workspaceIdInput2.extend({ name: z9.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(workspaces).set({ name: input.name }).where(eq10(workspaces.id, ctx.workspaceId));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.updated", resourceType: "workspace", resourceId: ctx.workspaceId });
    return { success: true };
  }),
  getOnboarding: workspaceProcedure.input(workspaceIdInput2).query(async ({ ctx }) => {
    const db = await requireDb();
    const workspace = (await db.select().from(workspaces).where(and10(eq10(workspaces.id, ctx.workspaceId), isNull8(workspaces.deletedAt))).limit(1))[0];
    if (!workspace) return null;
    return {
      completed: workspace.onboardingCompleted,
      step: workspace.onboardingStep,
      data: workspace.onboardingData ?? {}
    };
  }),
  saveOnboardingStep: workspaceProcedure.input(
    workspaceIdInput2.extend({
      step: z9.number().int().min(0).max(10),
      data: z9.record(z9.string(), z9.unknown()).optional(),
      completed: z9.boolean().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const update = { onboardingStep: input.step };
    if (input.data !== void 0) update.onboardingData = input.data;
    if (input.completed !== void 0) update.onboardingCompleted = input.completed;
    await db.update(workspaces).set(update).where(eq10(workspaces.id, ctx.workspaceId));
    if (input.completed) {
      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workspace.onboarding_completed",
        resourceType: "workspace",
        resourceId: ctx.workspaceId,
        metadata: input.data ?? {}
      });
    }
    return { success: true };
  })
});
var preferencesRouter = router({
  get: workspaceProcedure.input(workspaceIdInput2).query(async ({ ctx }) => {
    const db = await requireDb();
    const profile = (await db.select().from(users).where(eq10(users.id, ctx.user.id)).limit(1))[0] ?? null;
    const preferences = (await db.select().from(userPreferences).where(and10(eq10(userPreferences.userId, ctx.user.id), eq10(userPreferences.workspaceId, ctx.workspaceId))).limit(1))[0] ?? null;
    return { profile, preferences };
  }),
  updateProfile: protectedProcedure.input(z9.object({ name: z9.string().trim().min(2).max(160), jobTitle: z9.string().trim().max(160).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(users).set({ name: input.name, jobTitle: input.jobTitle ?? null }).where(eq10(users.id, ctx.user.id));
    return { success: true };
  }),
  update: workspaceProcedure.input(
    workspaceIdInput2.extend({
      emailNotifications: z9.boolean().optional(),
      slackNotifications: z9.boolean().optional(),
      weeklyDigest: z9.boolean().optional(),
      agentNotifications: z9.boolean().optional(),
      anomalyNotifications: z9.boolean().optional(),
      reportNotifications: z9.boolean().optional(),
      extendedContextWindow: z9.boolean().optional(),
      citeSources: z9.boolean().optional(),
      proactiveInsights: z9.boolean().optional(),
      responseTone: z9.enum(["concise", "professional", "detailed"]).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { workspaceId: _workspaceId, ...changes } = input;
    await db.insert(userPreferences).values({ userId: ctx.user.id, workspaceId: ctx.workspaceId, ...changes }).onConflictDoUpdate({ target: [userPreferences.userId, userPreferences.workspaceId], set: changes });
    return { success: true };
  })
});

// server/routers/workflows.ts
import { and as and11, desc as desc6, eq as eq11, isNull as isNull9 } from "drizzle-orm";
import { TRPCError as TRPCError7 } from "@trpc/server";
import { randomUUID as randomUUID2 } from "node:crypto";
import { z as z10 } from "zod";
var workspaceInput6 = z10.object({ workspaceId: z10.number().int().positive() });
var nodeInput = z10.object({
  nodeKey: z10.string().trim().min(1).max(80),
  nodeType: z10.enum(["trigger", "intelligence", "condition", "action"]),
  label: z10.string().trim().min(1).max(160),
  description: z10.string().trim().max(2e3).optional(),
  positionX: z10.number().int().min(-1e4).max(1e4).default(0),
  positionY: z10.number().int().min(-1e4).max(1e4).default(0),
  sortOrder: z10.number().int().min(0).max(1e3).default(0),
  configuration: z10.record(z10.string(), z10.unknown()).optional()
});
async function ensureWorkflow(workspaceId, workflowId) {
  const db = await requireDb();
  const workflow = (await db.select().from(workflows).where(and11(eq11(workflows.id, workflowId), eq11(workflows.workspaceId, workspaceId), isNull9(workflows.deletedAt))).limit(1))[0];
  if (!workflow) throw new TRPCError7({ code: "NOT_FOUND", message: "Workflow not found in this workspace." });
  return workflow;
}
var workflowsRouter = router({
  list: workspaceProcedure.input(workspaceInput6).query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(workflows).where(and11(eq11(workflows.workspaceId, ctx.workspaceId), isNull9(workflows.deletedAt))).orderBy(desc6(workflows.updatedAt));
  }),
  get: workspaceProcedure.input(workspaceInput6.extend({ workflowId: z10.number().int().positive() })).query(async ({ ctx, input }) => {
    const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
    const db = await requireDb();
    const nodes = await db.select().from(workflowNodes).where(eq11(workflowNodes.workflowId, workflow.id)).orderBy(workflowNodes.sortOrder);
    return { workflow, nodes };
  }),
  create: workspaceManagerProcedure.input(workspaceInput6.extend({ name: z10.string().trim().min(2).max(160), description: z10.string().trim().max(4e3).optional(), nodes: z10.array(nodeInput).min(1).max(50) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [workflowRow] = await db.insert(workflows).values({ workspaceId: ctx.workspaceId, name: input.name, description: input.description, createdById: ctx.user.id }).returning({ id: workflows.id });
    const workflowId = workflowRow.id;
    await db.insert(workflowNodes).values(input.nodes.map((node) => ({ workflowId, ...node })));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.created", resourceType: "workflow", resourceId: workflowId });
    return { id: workflowId };
  }),
  update: workspaceManagerProcedure.input(workspaceInput6.extend({ workflowId: z10.number().int().positive(), name: z10.string().trim().min(2).max(160).optional(), description: z10.string().trim().max(4e3).nullable().optional(), status: z10.enum(["active", "paused", "draft", "archived"]).optional() })).mutation(async ({ ctx, input }) => {
    await ensureWorkflow(ctx.workspaceId, input.workflowId);
    const db = await requireDb();
    const { workspaceId: _workspaceId, workflowId, ...changes } = input;
    await db.update(workflows).set(changes).where(and11(eq11(workflows.id, workflowId), eq11(workflows.workspaceId, ctx.workspaceId)));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.updated", resourceType: "workflow", resourceId: workflowId });
    return { success: true };
  }),
  runNow: workspaceMemberProcedure.input(workspaceInput6.extend({ workflowId: z10.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const workflow = await ensureWorkflow(ctx.workspaceId, input.workflowId);
    if (workflow.status === "archived") throw new TRPCError7({ code: "CONFLICT", message: "Archived workflows cannot be executed." });
    const db = await requireDb();
    const idempotencyKey = `manual:${workflow.id}:${ctx.user.id}:${randomUUID2()}`.slice(0, 128);
    const [runRow] = await db.insert(workflowRuns).values({ workspaceId: ctx.workspaceId, workflowId: workflow.id, status: "pending", triggerType: "manual", idempotencyKey, createdById: ctx.user.id }).returning({ id: workflowRuns.id });
    const runId = runRow.id;
    await enqueueJob({ workspaceId: ctx.workspaceId, type: "workflow.run", payload: { runId, workflowId: workflow.id, workspaceId: ctx.workspaceId } });
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workflow.run_queued", resourceType: "workflowRun", resourceId: runId, metadata: { workflowId: workflow.id } });
    return { id: runId, status: "pending" };
  }),
  runs: workspaceProcedure.input(workspaceInput6.extend({ workflowId: z10.number().int().positive(), pageSize: z10.number().int().min(1).max(50).default(20) })).query(async ({ ctx, input }) => {
    await ensureWorkflow(ctx.workspaceId, input.workflowId);
    const db = await requireDb();
    return db.select().from(workflowRuns).where(and11(eq11(workflowRuns.workspaceId, ctx.workspaceId), eq11(workflowRuns.workflowId, input.workflowId))).orderBy(desc6(workflowRuns.createdAt)).limit(input.pageSize);
  })
});

// server/routers.ts
var credentialsInput = z11.object({
  email: z11.string().trim().email().max(320),
  password: z11.string().min(12, "Use at least 12 characters.").max(128)
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? publicUser(ctx.user) : null),
    register: publicProcedure.input(credentialsInput.extend({ name: z11.string().trim().min(2).max(160), organizationName: z11.string().trim().min(2).max(180).optional() })).mutation(async ({ ctx, input }) => {
      try {
        const user = await registerWithPassword(input);
        await bootstrapWorkspace(user, input.organizationName);
        const session = await createSession(user.id);
        ctx.res.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
        return publicUser(user);
      } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") throw new TRPCError8({ code: "CONFLICT", message: "An account already exists for this email." });
        throw error;
      }
    }),
    login: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const user = await authenticateWithPassword(input.email, input.password);
      if (!user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      const session = await createSession(user.id);
      ctx.res.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
      return publicUser(user);
    }),
    requestPasswordReset: publicProcedure.input(z11.object({ email: z11.string().trim().email().max(320) })).mutation(async ({ input }) => {
      await requestPasswordReset(input.email);
      return { accepted: true };
    }),
    resetPassword: publicProcedure.input(z11.object({ token: z11.string().min(20).max(200), password: z11.string().min(12).max(128) })).mutation(async ({ input }) => {
      try {
        return await resetPassword(input.token, input.password);
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_RESET_TOKEN") throw new TRPCError8({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
        throw error;
      }
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.headers.cookie?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
      await revokeSession(token);
      ctx.res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return { success: true };
    })
  }),
  workspaces: workspacesRouter,
  preferences: preferencesRouter,
  dashboard: dashboardRouter,
  conversations: conversationsRouter,
  intelligence: intelligenceRouter,
  agents: agentsRouter,
  dataSources: dataSourcesRouter,
  documents: documentsRouter,
  memory: memoryRouter,
  analytics: analyticsRouter,
  workflows: workflowsRouter,
  notifications: notificationsRouter,
  audit: auditRouter
});

// server/oauth.ts
import { and as and12, eq as eq12, or as or2 } from "drizzle-orm";
import { createHmac, randomBytes as randomBytes3, timingSafeEqual } from "node:crypto";
function encodeState(state) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = createHmac("sha256", ENV.sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function decodeState(value) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", ENV.sessionSecret).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!state.nonce || !state.returnTo.startsWith("/") || Date.now() - state.createdAt > 10 * 60 * 1e3) return null;
    return state;
  } catch {
    return null;
  }
}
function registerOAuthRoutes(app) {
  app.get("/api/auth/google", (req, res) => {
    if (!ENV.oauth.googleClientId || !ENV.oauth.googleClientSecret) return res.status(503).json({ error: "Google OAuth is not configured." });
    const returnTo = typeof req.query.returnTo === "string" && req.query.returnTo.startsWith("/") ? req.query.returnTo : "/app/dashboard";
    const callback = `${ENV.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.oauth.googleClientId);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", encodeState({ nonce: randomBytes3(18).toString("base64url"), createdAt: Date.now(), returnTo }));
    res.redirect(url.toString());
  });
  app.get("/api/auth/google/callback", async (req, res) => {
    const state = decodeState(typeof req.query.state === "string" ? req.query.state : void 0);
    const code = typeof req.query.code === "string" ? req.query.code : void 0;
    if (!state || !code || !ENV.oauth.googleClientId || !ENV.oauth.googleClientSecret) return res.status(400).send("Invalid OAuth callback.");
    try {
      const callback = `${ENV.appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: ENV.oauth.googleClientId, client_secret: ENV.oauth.googleClientSecret, redirect_uri: callback, grant_type: "authorization_code" }) });
      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const token = await tokenResponse.json();
      if (!token.access_token) throw new Error("Google did not return an access token");
      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!profileResponse.ok) throw new Error("Google profile request failed");
      const profile = await profileResponse.json();
      if (!profile.sub || !profile.email || !profile.email_verified) throw new Error("Google account does not expose a verified email");
      const db = await requireDb();
      const existingAccount = (await db.select().from(oauthAccounts).where(and12(eq12(oauthAccounts.provider, "google"), eq12(oauthAccounts.providerAccountId, profile.sub))).limit(1))[0];
      let user = existingAccount ? (await db.select().from(users).where(eq12(users.id, existingAccount.userId)).limit(1))[0] : void 0;
      if (!user) user = (await db.select().from(users).where(or2(eq12(users.email, profile.email.toLowerCase()), eq12(users.openId, profile.sub))).limit(1))[0];
      if (!user) {
        const [insert] = await db.insert(users).values({ openId: profile.sub, email: profile.email.toLowerCase(), name: profile.name ?? profile.email.split("@")[0], avatarUrl: profile.picture, loginMethod: "google", authProvider: "google", role: "user", lastSignedIn: /* @__PURE__ */ new Date() }).returning({ id: users.id });
        user = (await db.select().from(users).where(eq12(users.id, insert.id)).limit(1))[0];
      }
      if (!user) throw new Error("Unable to create account");
      if (!existingAccount) await db.insert(oauthAccounts).values({ userId: user.id, provider: "google", providerAccountId: profile.sub });
      await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date(), name: user.name ?? profile.name, avatarUrl: user.avatarUrl ?? profile.picture, authProvider: "google" }).where(eq12(users.id, user.id));
      await bootstrapWorkspace(user);
      const session = await createSession(user.id);
      res.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
      res.redirect(state.returnTo);
    } catch (error) {
      console.error(JSON.stringify({ event: "auth.google_callback_failed", error: error instanceof Error ? error.message : "unknown" }));
      res.status(500).send("Sign in could not be completed.");
    }
  });
}

// server/_core/context.ts
async function createContext(opts) {
  const user = await getUserFromSession(opts.req.headers.cookie);
  return { req: opts.req, res: opts.res, user };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 5173),
    strictPort: false
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function findDistPublic() {
  const candidates = [
    path2.resolve(import.meta.dirname, "public"),
    path2.resolve(import.meta.dirname, "../..", "dist", "public")
  ];
  for (const p of candidates) {
    if (fs.existsSync(path2.join(p, "index.html"))) return p;
  }
  return candidates[0];
}
function hasDistPublic() {
  return fs.existsSync(path2.join(findDistPublic(), "index.html"));
}
function serveStatic(app) {
  const distPath = findDistPublic();
  if (!fs.existsSync(distPath)) {
    console.warn(
      `Build directory not found: ${distPath}. SPA serving disabled (API only).`
    );
    return;
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
async function startServer() {
  if (ENV.isProduction && !ENV.sessionSecret) throw new Error("SESSION_SECRET must be configured in production");
  const app = express2();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use(express2.json({ limit: "12mb" }));
  app.use(express2.urlencoded({ limit: "12mb", extended: false }));
  registerOAuthRoutes(app);
  app.get("/manus-storage/:key(*)", async (req, res) => {
    const key2 = String(req.params.key ?? "").replace(/^\/+/, "");
    const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/+$/, "");
    const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!key2 || !forgeBaseUrl || !forgeKey) return res.status(404).end();
    try {
      const presignUrl = new URL("v1/storage/presign/get", `${forgeBaseUrl}/`);
      presignUrl.searchParams.set("path", key2);
      const response = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
      if (!response.ok) return res.status(502).end();
      const payload = await response.json();
      if (!payload.url) return res.status(502).end();
      return res.redirect(307, payload.url);
    } catch {
      return res.status(502).end();
    }
  });
  app.use((req, res, next) => {
    const origin = req.headers.origin || (req.headers.host ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}` : process.env.APP_ORIGIN || "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (hasDistPublic()) {
    serveStatic(app);
  } else if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    console.warn("No dist/public found and not in development mode. API-only mode.");
  }
  const port = Number(process.env.PORT ?? 3e3);
  server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.info(`SOPRANOVA API listening on http://localhost:${port}`);
  });
}
startServer().catch((error) => {
  console.error("SOPRANOVA server failed to start", error);
  process.exit(1);
});
