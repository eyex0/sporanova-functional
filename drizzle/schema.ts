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
  varchar,
} from "drizzle-orm/pg-core";

/**
 * SOPRANOVA identity records. Product-level permissions are determined by
 * workspace memberships, never by this global role alone.
 */
export const usersRoleEnum = pgEnum("users_role", ["user", "admin"]);

export const users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("auth_sessions_user_idx").on(table.userId), index("auth_sessions_expires_idx").on(table.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("password_reset_tokens_user_idx").on(table.userId), index("password_reset_tokens_expires_idx").on(table.expiresAt)],
);

export const oauthAccounts = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("oauth_accounts_provider_account_unique").on(table.provider, table.providerAccountId), index("oauth_accounts_user_idx").on(table.userId)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    companySize: varchar("companySize", { length: 32 }),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
  },
  table => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    onboardingStep: integer("onboardingStep").notNull().default(0),
    onboardingData: jsonb("onboardingData").$type<Record<string, unknown>>(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
  },
  table => [
    uniqueIndex("workspaces_organization_slug_unique").on(table.organizationId, table.slug),
    index("workspaces_organization_idx").on(table.organizationId),
  ],
);

export const jobsStatusEnum = pgEnum("jobs_status", ["pending", "running", "completed", "failed"]);

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").references(() => workspaces.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    status: jobsStatusEnum("status").notNull().default("pending"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("maxAttempts").notNull().default(3),
    runAt: timestamp("runAt").notNull().defaultNow(),
    lockedAt: timestamp("lockedAt"),
    lockedBy: varchar("lockedBy", { length: 128 }),
    completedAt: timestamp("completedAt"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("jobs_dispatch_idx").on(table.status, table.runAt), index("jobs_workspace_idx").on(table.workspaceId, table.createdAt)],
);

export const membershipsRoleEnum = pgEnum("memberships_role", ["owner", "admin", "member", "viewer"]);

export const memberships = pgTable(
  "memberships",
  {
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: membershipsRoleEnum("role").notNull().default("member"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.workspaceId, table.userId], name: "memberships_workspace_user_pk" }),
    index("memberships_user_idx").on(table.userId),
    index("memberships_workspace_role_idx").on(table.workspaceId, table.role),
  ],
);

export const responseToneEnum = pgEnum("user_preferences_response_tone", ["concise", "professional", "detailed"]);

export const userPreferences = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("user_preferences_user_workspace_unique").on(table.userId, table.workspaceId),
    index("user_preferences_workspace_idx").on(table.workspaceId),
  ],
);

export const agentsStatusEnum = pgEnum("agents_status", ["active", "idle", "paused", "error"]);

export const agents = pgTable(
  "agents",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    purpose: text("purpose").notNull(),
    status: agentsStatusEnum("status").notNull().default("idle"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    capabilities: jsonb("capabilities").$type<string[]>(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    lastActivityAt: timestamp("lastActivityAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("agents_workspace_name_unique").on(table.workspaceId, table.name),
    index("agents_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const agentRunsStatusEnum = pgEnum("agent_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);
export const agentRunsTriggerTypeEnum = pgEnum("agent_runs_trigger_type", ["manual", "workflow", "schedule", "data_sync"]);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: integer("agentId").notNull().references(() => agents.id, { onDelete: "cascade" }),
    status: agentRunsStatusEnum("status").notNull().default("pending"),
    triggerType: agentRunsTriggerTypeEnum("triggerType").notNull().default("manual"),
    progress: integer("progress").notNull().default(0),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    errorMessage: text("errorMessage"),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdById: integer("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("agent_runs_workspace_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("agent_runs_agent_started_idx").on(table.agentId, table.startedAt),
    index("agent_runs_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const messagesRoleEnum = pgEnum("messages_role", ["user", "assistant", "system"]);
export const messagesKindEnum = pgEnum("messages_kind", ["question", "understanding", "insight", "recommendation", "action"]);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("conversations_workspace_last_message_idx").on(table.workspaceId, table.lastMessageAt),
    index("conversations_creator_idx").on(table.createdById),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    authorUserId: integer("authorUserId").references(() => users.id, { onDelete: "set null" }),
    role: messagesRoleEnum("role").notNull(),
    kind: messagesKindEnum("kind").notNull().default("question"),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("messages_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const messageSourcesTypeEnum = pgEnum("message_sources_source_type", ["document", "data_source", "metric", "manual"]);

export const messageSources = pgTable(
  "message_sources",
  {
    id: serial("id").primaryKey(),
    messageId: integer("messageId").notNull().references(() => messages.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    sourceType: messageSourcesTypeEnum("sourceType").notNull(),
    sourceReference: varchar("sourceReference", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("message_sources_message_idx").on(table.messageId)],
);

export const insightsSeverityEnum = pgEnum("insights_severity", ["low", "medium", "high"]);
export const insightsStatusEnum = pgEnum("insights_status", ["open", "acknowledged", "resolved"]);

export const insights = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("insights_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt)],
);

export const dataSourcesStatusEnum = pgEnum("data_sources_status", ["connected", "syncing", "failed", "disconnected"]);

export const dataSources = pgTable(
  "data_sources",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    status: dataSourcesStatusEnum("status").notNull().default("disconnected"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    recordCount: integer("recordCount").notNull().default(0),
    sizeBytes: integer("sizeBytes").notNull().default(0),
    lastSyncAt: timestamp("lastSyncAt"),
    lastError: text("lastError"),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("data_sources_workspace_name_unique").on(table.workspaceId, table.name),
    index("data_sources_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const dataSourceRunsStatusEnum = pgEnum("data_source_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);

export const dataSourceRuns = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("data_source_runs_source_started_idx").on(table.dataSourceId, table.startedAt)],
);

export const dataRecords = pgTable(
  "data_records",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    dataSourceId: integer("dataSourceId").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    searchableText: text("searchableText"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("data_records_source_external_unique").on(table.dataSourceId, table.externalId), index("data_records_workspace_source_idx").on(table.workspaceId, table.dataSourceId)],
);

export const documentsStatusEnum = pgEnum("documents_status", ["uploading", "processing", "ready", "failed", "deleted"]);

export const documents = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("documents_storage_key_unique").on(table.storageKey),
    index("documents_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: integer("documentId").notNull().references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("document_chunks_document_index_unique").on(table.documentId, table.chunkIndex),
    index("document_chunks_workspace_idx").on(table.workspaceId),
  ],
);

export const businessMetrics = pgTable(
  "business_metrics",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    metricDate: timestamp("metricDate").notNull(),
    metricKey: varchar("metricKey", { length: 80 }).notNull(),
    segment: varchar("segment", { length: 80 }).notNull().default("all"),
    metricValue: numeric("metricValue", { precision: 18, scale: 4 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("business_metrics_workspace_date_key_segment_unique").on(table.workspaceId, table.metricDate, table.metricKey, table.segment),
    index("business_metrics_workspace_key_date_idx").on(table.workspaceId, table.metricKey, table.metricDate),
  ],
);

export const workflowsStatusEnum = pgEnum("workflows_status", ["active", "paused", "draft", "archived"]);

export const workflows = pgTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("workflows_workspace_name_unique").on(table.workspaceId, table.name),
    uniqueIndex("workflows_schedule_task_unique").on(table.scheduleCronTaskUid),
    index("workflows_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const workflowNodesNodeTypeEnum = pgEnum("workflow_nodes_node_type", ["trigger", "intelligence", "condition", "action"]);

export const workflowNodes = pgTable(
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
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("workflow_nodes_workflow_key_unique").on(table.workflowId, table.nodeKey),
    index("workflow_nodes_workflow_sort_idx").on(table.workflowId, table.sortOrder),
  ],
);

export const workflowRunsStatusEnum = pgEnum("workflow_runs_status", ["pending", "running", "completed", "failed", "cancelled"]);
export const workflowRunsTriggerTypeEnum = pgEnum("workflow_runs_trigger_type", ["manual", "event", "schedule"]);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    workflowId: integer("workflowId").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    status: workflowRunsStatusEnum("status").notNull().default("pending"),
    triggerType: workflowRunsTriggerTypeEnum("triggerType").notNull().default("manual"),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }),
    output: jsonb("output").$type<Record<string, unknown>>(),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdById: integer("createdById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("workflow_runs_workspace_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("workflow_runs_workflow_started_idx").on(table.workflowId, table.startedAt),
  ],
);

export const integrationsStatusEnum = pgEnum("integrations_status", ["connected", "failed", "disconnected"]);

export const integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: integrationsStatusEnum("status").notNull().default("disconnected"),
    secretReference: varchar("secretReference", { length: 255 }),
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("integrations_workspace_provider_name_unique").on(table.workspaceId, table.provider, table.name),
    index("integrations_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const notifications = pgTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("notifications_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt),
    index("notifications_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    workspaceId: integer("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
    actorUserId: integer("actorUserId").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    resourceType: varchar("resourceType", { length: 80 }).notNull(),
    resourceId: varchar("resourceId", { length: 80 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("audit_logs_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("audit_logs_organization_created_idx").on(table.organizationId, table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type WorkspaceRole = typeof memberships.$inferSelect.role;
