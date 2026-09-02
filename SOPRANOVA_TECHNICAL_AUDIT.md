# SOPRANOVA — Full Technical Audit & Gap Analysis

**Audit Date:** September 2, 2026
**Repository:** `eyex0/sporanova-functional`
**Audit Mode:** READ-ONLY — No modifications made

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Current Project](#2-current-project)
3. [Architecture Discovery](#3-architecture-discovery)
4. [Frontend Audit](#4-frontend-audit)
5. [Backend Audit](#5-backend-audit)
6. [Database Audit](#6-database-audit)
7. [Authentication & Multi-Tenancy](#7-authentication--multi-tenancy)
8. [Agent Runtime Audit](#8-agent-runtime-audit)
9. [Model Gateway](#9-model-gateway)
10. [Knowledge / RAG Audit](#10-knowledge--rag-audit)
11. [Memory Audit](#11-memory-audit)
12. [Tool System Audit](#12-tool-system-audit)
13. [Workflow Engine Audit](#13-workflow-engine-audit)
14. [Haier Service Agent Requirements](#14-haier-service-agent-requirements)
15. [Multimodal Audit](#15-multimodal-audit)
16. [Voice Audit](#16-voice-audit)
17. [WhatsApp Audit](#17-whatsapp-audit)
18. [Salesforce Audit](#18-salesforce-audit)
19. [Analytics](#19-analytics)
20. [Evaluation](#20-evaluation)
21. [Observability](#21-observability)
22. [Security Audit](#22-security-audit)
23. [Performance & Scalability](#23-performance--scalability)
24. [Testing Audit](#24-testing-audit)
25. [Deployment Audit](#25-deployment-audit)
26. [Chatbase Benchmark](#26-chatbase-benchmark)
27. [Gap Analysis](#27-gap-analysis)
28. [Architectural Problems](#28-architectural-problems)
29. [What Should Not Be Built](#29-what-should-not-be-built)
30. [Recommended Target Architecture](#30-recommended-target-architecture)
31. [Implementation Roadmap](#31-implementation-roadmap)
32. [Haier Demo Plan](#32-haier-demo-plan)
33. [Final Executive Summary](#33-final-executive-summary)

---

## 1. Product Vision

SOPRANOVA aims to be a **multi-tenant Enterprise AI Agent Platform** — the core engine behind configurable AI assistants for companies like Haier, Samsung, Accent, telecoms, retail, and insurance.

The Haier solution must be a **configuration/extension of the core SOPRANOVA platform**, never a separate codebase.

**Target Capabilities:** Organizations, Workspaces, Users, RBAC, Configurable AI Agents, Agent Runtime, Multiple LLM providers, Model Gateway/Router, Knowledge Bases, RAG, Document ingestion, Vector search, Memory, Tools, Tool execution, Workflows, Business Rules, Integrations, Conversations, Multimodal AI, Vision, Voice, WhatsApp, Human handoff, CRM integration, Salesforce, Analytics, Evaluation, Observability, Security, Agent versioning, Agent deployment, API/SDK, Enterprise customization.

---

## 2. Current Project

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui (New York), wouter 3, TanStack React Query, tRPC client (custom fetch) |
| Backend | Express 4, tRPC v11 (superjson), TypeScript, ESM |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Auth | Session-based (cookie `sopranova_session`), bcrypt, jose JWT (available but not used), Google OAuth (placeholder) |
| AI | OpenAI-compatible via OpenRouter (`openai/gpt-4o`), `server/_core/llm.ts` |
| Storage | S3-compatible (Supabase Storage) |
| Email | Resend API |
| Queue | Database-backed polling worker (`jobs` table) |
| Deployment | Render.com (Frankfurt, free tier), Docker, Vercel (static) |
| Testing | Vitest (9 files, ~32 tests), e2e-test.mjs (36 API tests) |

### Codebase Size

| Area | Files | Lines (approx) |
|------|-------|-----------------|
| Server core | 8 | ~800 |
| Server routers | 14 | ~2,200 |
| Server services | 7 | ~500 |
| Server tests | 9 | ~500 |
| Frontend pages | 25 | ~5,500 |
| Frontend components | 10 | ~1,200 |
| shadcn/ui | 53 | ~3,500 |
| Database schema | 1 | 763 |
| Shared types | 4 | ~400 |
| **Total** | **~130 source files** | **~15,000 lines** |

---

## 3. Architecture Discovery

```
Frontend (React 19 + Vite)
  ↓ fetch() with credentials:include
  ↓ superjson serialization
API Layer (Express + tRPC v11)
  ↓ tRPC procedures with middleware
  ↓ workspaceProcedure (RBAC: owner/admin/member/viewer)
Backend Services
  ├── Auth (session management, bcrypt, Resend email)
  ├── Authorization (workspace-scoped membership lookup)
  ├── AI (invokeLLM → OpenRouter → GPT-4o)
  ├── Storage (S3-compatible → Supabase Storage)
  ├── Encryption (AES-256-GCM for data source configs)
  ├── Email (Resend API)
  └── Jobs (database polling → worker process)
Database (PostgreSQL via Supabase)
  ├── 33 tables
  ├── 20 enums
  └── Comprehensive indexes
External Services
  ├── Supabase (PostgreSQL + S3 storage)
  ├── OpenRouter (LLM gateway)
  ├── Resend (transactional email)
  └── Google OAuth (placeholder, not configured)
```

### Key Architectural Patterns

- **Single tRPC router** (`appRouter`) — all 67 procedures in one tree
- **Database-backed job queue** — polling every 1.5s, optimistic locking
- **Separate worker process** — spawned via `child_process.spawn()` on Windows, `fork()` on Linux
- **Session-based auth** — SHA-256 hashed tokens in DB, httpOnly cookies
- **Workspace-scoped RBAC** — 4 roles (owner/admin/member/viewer) checked per-request
- **Soft deletes** — `deletedAt` column pattern on most entity tables
- **Encrypted secrets** — AES-256-GCM for data source configurations

---

## 4. Frontend Audit

### Frontend Inventory

There is **one active frontend** at `client/src/`. No legacy or duplicate frontend exists.

**Provider hierarchy:**
```
TRPCProvider (QueryClientProvider + custom fetch client)
  → AuthProvider (AuthContext)
    → App (wouter Router)
      → ErrorBoundary
        → ThemeProvider
          → TooltipProvider + Toaster
          → RouteTransition → Switch (all routes)
```

### Route Map (43 routes)

| Category | Routes | Auth |
|----------|--------|------|
| Landing | `/`, `/solutions`, `/blog`, `/docs`, `/changelog`, `/resources`, `/customers`, `/enterprise`, `/pricing`, `/haier-demo` | No |
| Auth | `/auth/signup`, `/auth/signin`, `/auth/forgot-password`, `/auth/reset-password` | No |
| Dashboard (20) | `/dashboard/*` — Backstage, Overview, Playground, Conversations, Leads, Data Sources, Workflows, Analytics (3 sub), Contacts, Channels, Integrations, Outbound, Helpdesk, Documents, Getting Started, Settings, Team | Yes |
| Reference | `/use-cases/:slug`, `/industries/:slug`, `/features/:slug`, `/solutions/:slug`, `/customers/:slug` | No |

### Page Status

| Page | Route | Data Sources | Status |
|------|-------|-------------|--------|
| Home (Landing) | `/` | customerStories (empty array) | **Working** but empty customer data |
| AuthFlow | `/auth/*` | authApi | **Working** |
| Backstage | `/dashboard` | agentsApi.list | **Working** — agent CRUD |
| Dashboard | `/dashboard/overview` | dashboardApi.overview | **Working** |
| Playground | `/dashboard/playground` | agentsApi, intelligenceApi | **Working** — chat with agent |
| Conversations | `/dashboard/conversations` | conversationsApi, intelligenceApi | **Working** |
| Channels | `/dashboard/channels` | channelsApi | **Working** — channel management |
| Integrations | `/dashboard/integrations` | None (static list) | **Static** — no actual integration logic |
| DataSources | `/dashboard/data-sources` | dataSourcesApi | **Working** — HTTP source configure |
| Documents | `/dashboard/documents` | documentsApi | **Working** — upload/download |
| Workflows | `/dashboard/workflows` | workflowsApi | **Working** — create/run |
| Analytics | `/dashboard/analytics` | analyticsApi | **Working** — KPI display |
| Helpdesk | `/dashboard/helpdesk` | helpdeskApi | **Working** — ticket management |
| Leads | `/dashboard/leads` | leadsApi | **Working** |
| Contacts | `/dashboard/contacts` | contactsApi | **Working** |
| Settings | `/dashboard/settings` | preferencesApi | **Working** |
| Team | `/dashboard/team` | workspacesApi.members | **Working** |
| Outbound | `/dashboard/outbound` | outboundApi | **Working** — campaign CRUD (no actual sending) |
| GettingStarted | `/dashboard/getting-started` | None (static) | **Static** checklist |
| HaierDemo | `/haier-demo` | None (static) | **Static** simulation page |

### "Continue for Free" Button Investigation

The landing page Home.tsx has a `primary-button` class CTA. Tracing the flow:

1. **Home.tsx** renders `<PrimaryButton onClick={() => notice("Create agent")}>` — this calls a **toast notification**, not navigation
2. **PublicNav.tsx** has "Try for Free" linking to `/auth/signup` — **this works correctly**
3. **The issue:** The main CTA on the landing page hero calls `notice()` which only shows a toast, doesn't navigate. It should navigate to `/auth/signup`

**Root cause:** `Home.tsx` line ~239 — the CTA button calls `notice("Create agent")` (a toast function) instead of navigating to `/auth/signup`. The `notice` function is defined as `toast("Action", { description: "..." })`. This is a **frontend logic error**, not a backend or auth issue.

### Duplicated Code

| What | Where | Issue |
|------|-------|-------|
| `useAuth` hook | `_core/hooks/useAuth.ts` | Alternative auth using tRPC React hooks. **Not used** by any page. Dead code. |
| Auth state | `contexts/AuthContext.tsx` | The actual auth provider used by the app. Uses custom fetch, not tRPC hooks. |
| Dashboard layout CSS | `DashboardLayout.css` | ~500 lines of hand-written CSS alongside Tailwind |
| Page CSS files | Per-page `.css` files | 12 page-specific CSS files — inconsistent with Tailwind |

---

## 5. Backend Audit

### Service Inventory

| Service | File | Purpose | Status |
|---------|------|---------|--------|
| Express app | `server/_core/index.ts` | HTTP server, middleware, route mounting | **KEEP** |
| tRPC setup | `server/_core/trpc.ts` | Procedure definitions, error scrubbing, logging | **KEEP** |
| Context | `server/_core/context.ts` | Per-request context with session user | **KEEP** |
| Auth | `server/auth.ts` | Register, login, sessions, password reset | **KEEP** |
| AuthZ | `server/authz.ts` | Workspace RBAC middleware (4 levels) | **KEEP** |
| DB layer | `server/db.ts` | Drizzle connection, user/workspace queries | **IMPROVE** — needs connection pooling config |
| LLM client | `server/_core/llm.ts` | OpenAI-compatible completions with retry | **KEEP** — needs abstraction for multi-provider |
| Email | `server/email.ts` | Resend/console email sending | **KEEP** |
| Storage | `server/storage.ts` | S3-compatible object storage | **KEEP** |
| Crypto | `server/crypto.ts` | AES-256-GCM encryption | **KEEP** |
| Jobs | `server/jobs.ts` | Database-backed job queue | **IMPROVE** — polling is inefficient |
| Worker | `server/worker.ts` | Background job processor | **IMPROVE** — needs error recovery |
| OAuth | `server/oauth.ts` | Google OAuth flow | **KEEP** — placeholder |
| Vite | `server/_core/vite.ts` | Dev server / static serving | **KEEP** |
| Env | `server/_core/env.ts` | Environment config | **KEEP** |
| Cookies | `server/_core/cookies.ts` | Cookie options | **KEEP** |
| Health | `server/_core/systemRouter.ts` | Health check endpoint | **KEEP** |

### Router Inventory (14 routers, 67 procedures)

| Router | File | Procedures | Status |
|--------|------|-----------|--------|
| system | `systemRouter.ts` | 1 (health) | **KEEP** |
| auth | `routers.ts` (inline) | 6 (me, register, login, logout, resetPassword, requestPasswordReset) | **KEEP** |
| workspaces | `routers/workspaces.ts` | 10 (list, bootstrap, current, members, invite, updateRole, remove, completeOnboarding, update, getOnboarding, saveOnboardingStep) | **KEEP** |
| preferences | `routers/workspaces.ts` | 3 (get, updateProfile, update) | **KEEP** |
| dashboard | `routers/dashboard.ts` | 2 (overview, runSummary) | **KEEP** |
| conversations | `routers/conversations.ts` | 6 (list, create, rename, delete, messages, search) | **KEEP** |
| intelligence | `routers/conversations.ts` | 1 (ask) | **IMPROVE** — needs streaming, context injection |
| agents | `routers/agents.ts` | 8 (list, get, create, setStatus, runs, runNow, update, delete) | **KEEP** |
| dataSources | `routers/data.ts` | 6 (list, create, configureHttp, sync, disconnect, delete) | **KEEP** |
| documents | `routers/data.ts` | 4 (list, upload, accessUrl, delete) | **KEEP** |
| memory | `routers/data.ts` | 1 (summary) | **MISSING** — only returns counts, no actual memory |
| analytics | `routers/analytics.ts` | 5 (overview, segments, topics, sentiment, trends) | **IMPROVE** — needs real data, not generated |
| workflows | `routers/workflows.ts` | 6 (list, get, create, update, runNow, runs) | **IMPROVE** — only supports notification actions |
| notifications | `routers/notifications.ts` | 3 (list, markRead, markAllRead) | **KEEP** |
| audit | `routers/notifications.ts` | 1 (list) | **KEEP** |
| contacts | `routers/contacts.ts` | 7 (list, get, create, update, delete, import, export) | **KEEP** |
| leads | `routers/leads.ts` | 7 (list, get, create, update, delete, convert, export) | **KEEP** |
| helpdesk | `routers/helpdesk.ts` | 8 (listTickets, getTicket, listMessages, createTicket, updateTicket, addMessage, deleteTicket, listInboxes) | **KEEP** |
| channels | `routers/channels.ts` | 4 (list, configure, disable, getEmbedCode) | **IMPROVE** — channel logic is mostly CRUD, no actual webhook handling |
| outbound | `routers/outbound.ts` | 7 (listCampaigns, getCampaign, createCampaign, updateCampaign, sendCampaign, deleteCampaign, campaignStats) | **IMPROVE** — sending is just a status change, no actual email/SMS dispatch |

---

## 6. Database Audit

### Schema Overview

33 tables, 20 enums, PostgreSQL. All tables have `createdAt`, most have `updatedAt`. Soft deletes via `deletedAt` on 10 tables.

### Domain Coverage

| Domain | Tables | Status |
|--------|--------|--------|
| **Identity** | `users`, `auth_sessions`, `password_reset_tokens`, `oauth_accounts` | EXISTS |
| **Organization** | `organizations` | EXISTS |
| **Workspace** | `workspaces`, `memberships`, `user_preferences` | EXISTS |
| **Agents** | `agents`, `agent_runs` | EXISTS |
| **Conversations** | `conversations`, `messages`, `message_sources` | EXISTS |
| **Knowledge/RAG** | `documents`, `document_chunks` | PARTIALLY EXISTS — no embeddings table |
| **Data** | `data_sources`, `data_source_runs`, `data_records` | EXISTS |
| **Memory** | None | MISSING — no memory tables |
| **Tools** | None | MISSING — no tool registry tables |
| **Workflows** | `workflows`, `workflow_nodes`, `workflow_runs` | EXISTS |
| **Integrations** | `integrations` | EXISTS — but generic, no provider-specific fields |
| **Analytics** | `business_metrics`, `insights` | EXISTS |
| **CRM** | `contacts`, `leads` | EXISTS |
| **Helpdesk** | `tickets`, `ticket_messages` | EXISTS |
| **Channels** | `channels` | EXISTS |
| **Outbound** | `campaigns` | EXISTS |
| **Notifications** | `notifications` | EXISTS |
| **Audit** | `audit_logs` | EXISTS |
| **Queue** | `jobs` | EXISTS |

### Critical Missing Tables

| Missing Table | Purpose | Impact |
|--------------|---------|--------|
| `embeddings` | Vector embeddings for RAG | **CRITICAL** — no vector search possible |
| `tools` | Tool registry definitions | **HIGH** — no tool system |
| `tool_executions` | Tool call audit trail | **HIGH** |
| `memories` | Persistent agent memory | **HIGH** — no memory |
| `model_configs` | Per-workspace model settings | **MEDIUM** |
| `agent_versions` | Agent version history | **MEDIUM** — no versioning |
| `evaluations` | AI evaluation results | **MEDIUM** |
| `api_keys` | API key management | **MEDIUM** — no API/SDK |

### Index Quality

Indexes are **good** on workspace-scoped queries. Most list endpoints have composite indexes on `(workspaceId, status)` or `(workspaceId, createdAt)`. The `jobs` table has a proper dispatch index on `(status, runAt)`.

### Tenant Isolation

**Every workspace-scoped table has `workspaceId` with `ON DELETE CASCADE`.** The `workspaceProcedure` middleware validates membership on every request. This is a **solid foundation** for multi-tenancy.

### Relationship Quality

Foreign keys are properly defined with appropriate `ON DELETE` behavior:
- `CASCADE` for workspace-scoped children
- `RESTRICT` for user-owned critical resources
- `SET NULL` for optional references

---

## 7. Authentication & Multi-Tenancy

### Authentication Flow

1. User registers with email/password (12+ chars, bcrypt 12 rounds)
2. Server creates user, organization, workspace, membership (owner)
3. Server creates session (48 random bytes, SHA-256 hashed, stored in DB)
4. Session token set as httpOnly cookie `sopranova_session`
5. All API calls include cookie → server resolves user via `getUserFromSession()`

### Session Management

- Token: 48 random bytes → base64url → SHA-256 hash → stored in `auth_sessions`
- Cookie: httpOnly, secure (in production), sameSite "lax", 14-day expiry
- Password reset: 32 random bytes, 30-minute expiry, invalidates all sessions

### RBAC

Four workspace roles: `owner`, `admin`, `member`, `viewer`

| Procedure Level | Allowed Roles | Used By |
|----------------|---------------|---------|
| `workspaceProcedure` | owner, admin, member, viewer | Read operations |
| `workspaceMemberProcedure` | owner, admin, member | Create/update |
| `workspaceManagerProcedure` | owner, admin | Configuration |
| `workspaceOwnerProcedure` | owner | Destructive ops |

### Multi-Tenancy Safety

- **Workspace isolation:** Every query is scoped to `workspaceId`
- **Membership validation:** Per-request check against `memberships` table
- **RLS:** Not implemented at database level — relies on application middleware
- **Cross-tenant reads:** Blocked by `workspaceProcedure` middleware

### Scalability Assessment

| Scale | Can Support? | Notes |
|-------|-------------|-------|
| 100 orgs | YES | Current architecture works |
| 1,000 orgs | YES | DB indexes adequate, single PG handles this |
| 10,000 orgs | MAYBE | Polling worker becomes bottleneck; need queue migration |

### Security Risks

| Risk | Severity | Detail |
|------|----------|--------|
| No rate limiting per-user | MEDIUM | Only per-endpoint global limits |
| Session not rotated on role change | LOW | Old sessions retain old permissions |
| Password reset token not rate-limited per-email | MEDIUM | Only global auth limiter |
| No account lockout after failed attempts | MEDIUM | Brute-force possible |
| Cookie sameSite "lax" in dev | LOW | Should be "none" for cross-origin dev |

---

## 8. Agent Runtime Audit

### Current Agent Execution Flow

1. User clicks "Run Now" in UI
2. Frontend calls `agents.runNow` mutation
3. Server creates `agent_runs` record (status: pending)
4. Server enqueues `agent.run` job
5. Worker claims job, calls `processAgentRun()`
6. Worker loads agent's `purpose` field as system prompt
7. Worker calls `invokeLLM()` with system prompt + user instruction
8. Worker saves output to `agent_runs.output`
9. Worker updates status to completed/failed

### Assessment: This is a **Chatbot**, NOT an Agent Runtime

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Prompt execution | EXISTS | System prompt from agent.purpose |
| Context construction | PARTIAL | Only last 12 messages in `intelligence.ask` |
| Conversation state | EXISTS | Conversations + messages tables |
| Model calls | EXISTS | `invokeLLM()` with retry |
| Streaming | MISSING | No SSE/WebSocket support |
| Tool calls | MISSING | No tool schema, no function calling |
| Error handling | EXISTS | Retry with backoff, status tracking |
| Model abstraction | PARTIAL | Single provider (OpenRouter) |
| Token tracking | MISSING | No token counting |
| Cost tracking | MISSING | No cost calculation |
| Multi-step reasoning | MISSING | Single LLM call per run |
| Memory retrieval | MISSING | No memory system |
| Knowledge retrieval | MISSING | No vector search |

**Verdict:** The current system is a **basic chatbot** that sends a single LLM call with a system prompt. There is no agentic loop, no tool calling, no multi-step reasoning, no RAG retrieval.

---

## 9. Model Gateway

### Current State

Single provider configuration via environment variables:

```
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-4o
```

### What Exists

- `invokeLLM()` in `server/_core/llm.ts` — sends chat completions to any OpenAI-compatible endpoint
- `listLLMModels()` — lists available models from the provider
- Retry with exponential backoff
- Tool/function calling support in the API (parameter exists but never used)

### What is Missing

| Component | Status |
|-----------|--------|
| Multi-provider abstraction | MISSING — hardcoded to single endpoint |
| Model router | MISSING — no A/B testing, no fallback |
| Provider failover | MISSING |
| Token counting | MISSING |
| Cost tracking | MISSING |
| Rate limiting per-provider | MISSING |
| Model selection per-agent | MISSING |
| Response caching | MISSING |

---

## 10. Knowledge / RAG Audit

### Current Knowledge Pipeline

```
Upload (documents.upload)
  ↓ S3 storage
  ↓ processDocument job
  ↓ Text extraction (PDF regex, DOCX XML, XLSX shared strings, CSV/TXT direct)
  ↓ Chunking (3500 chars, max 500 chunks)
  ↓ document_chunks table (content + metadata)
  ↓ STOP — no embeddings, no vector search
```

### Pipeline Stage Assessment

| Stage | Status | Detail |
|-------|--------|--------|
| Upload | EXISTS | S3 storage with MIME validation |
| Extraction | PARTIAL | PDF uses regex (unreliable), DOCX/XLSX via XML parsing |
| Cleaning | MISSING | No HTML stripping, no whitespace normalization |
| Chunking | EXISTS | Fixed 3500-char chunks |
| Metadata | PARTIAL | Only documentId and chunkIndex |
| Embedding | **MISSING** | No embedding generation |
| Vector Storage | **MISSING** | No vector database |
| Retrieval | **MISSING** | No similarity search |
| Reranking | **MISSING** | No reranking |
| Context | **MISSING** | No context assembly for LLM |
| Citations | PARTIAL | `message_sources` table exists but not used in RAG |

### RAG in intelligence.ask

The `intelligence.ask` endpoint:
1. Fetches data source records (raw JSON)
2. Fetches document chunks (raw text, no vector search)
3. Builds a text summary of available sources
4. Sends to LLM as context

**This is NOT RAG.** It's "dump all data into the prompt." No embedding, no similarity search, no relevance ranking.

### Document Format Support

| Format | Support | Quality |
|--------|---------|---------|
| PDF | PARTIAL | Regex-based text extraction (unreliable for complex PDFs) |
| DOCX | EXISTS | XML parsing of word/document.xml |
| XLSX | EXISTS | Shared strings + worksheet XML |
| CSV | EXISTS | Direct text read |
| TXT | EXISTS | Direct text read |
| Images | MISSING | No OCR |
| URLs | MISSING | No web scraping |

---

## 11. Memory Audit

### Current State: **MISSING**

- No memory tables in the database
- No memory read/write endpoints
- `memory.summary` only returns counts of documents and data sources
- No conversation-level memory
- No user-level memory
- No agent-level memory

### What Exists

- `conversations` + `messages` tables provide **implicit conversation history**
- `intelligence.ask` includes last 12 messages as context
- `document_chunks` stores extracted text (but not searchable by similarity)

### What is Missing

| Memory Type | Status |
|-------------|--------|
| Short-term (conversation) | PARTIAL — last 12 messages loaded |
| Long-term (user) | MISSING |
| Entity memory | MISSING |
| Semantic memory | MISSING |
| Memory retrieval | MISSING |
| Memory update | MISSING |
| Memory deletion (privacy) | MISSING |

---

## 12. Tool System Audit

### Current State: **MISSING**

- No tool registry tables
- No tool schema definitions
- No tool execution engine
- No tool permission model
- `invokeLLM()` supports `tools` parameter but it's never used

### What Would Be Needed

| Component | Status |
|-----------|--------|
| Tool registry | MISSING |
| Tool schemas (JSON Schema) | MISSING |
| Tool execution engine | MISSING |
| Permission model | MISSING |
| Authentication per tool | MISSING |
| Retry logic | MISSING |
| Audit logging | MISSING |
| Salesforce connector | MISSING |
| WhatsApp connector | MISSING |
| Email connector | PARTIAL — Resend exists but not as a tool |
| Calendar connector | MISSING |
| Custom REST API tool | MISSING |

---

## 13. Workflow Engine Audit

### Current State: **PARTIAL**

The workflow system has:
- CRUD for workflows and nodes
- Node types: trigger, intelligence, condition, action
- Execution via `processWorkflowRun()` in worker

### What Actually Works

- `create_notification` action — creates in-app notification and sends email
- That's it.

### What is Missing

| Component | Status |
|-----------|--------|
| Visual workflow builder | MISSING — only CRUD, no visual editor |
| Node execution engine | PARTIAL — only notification actions |
| Condition evaluation | MISSING — condition nodes exist but not evaluated |
| AI node execution | MISSING — intelligence nodes not executed |
| Tool node execution | MISSING |
| Human approval | MISSING |
| Wait/delay nodes | MISSING |
| Error handling | MISSING |
| Retries | MISSING |
| Execution tracing | MISSING |
| Workflow versioning | MISSING |

---

## 14. Haier Service Agent Requirements

### Requirement vs Current Capability

| Haier Requirement | Current Status | Gap |
|-------------------|---------------|-----|
| Text input | EXISTS | Conversations support text |
| Image input | MISSING | No multimodal support |
| Audio input | MISSING | No audio processing |
| Video input | MISSING | No video processing |
| Customer identification | PARTIAL | Contacts table exists, but no customer portal |
| Product identification | MISSING | No product database |
| Model identification | MISSING | No product model lookup |
| Issue diagnosis | PARTIAL | LLM can reason about text, no structured diagnosis |
| Error code lookup | MISSING | No error code database |
| Manual retrieval | MISSING | No vector search for manuals |
| Troubleshooting procedures | MISSING | No structured procedure system |
| Warranty information | MISSING | No warranty data |
| Remote resolution | PARTIAL | Text instructions possible via chat |
| Voice response | MISSING | No TTS |
| Image response | MISSING | No image generation |
| Salesforce case creation | MISSING | No Salesforce integration |
| Technician scheduling | MISSING | No scheduling system |
| Human handoff | MISSING | No escalation system |

**Verdict: ~15% of Haier requirements are met.** The platform can handle basic text conversations but lacks nearly all enterprise features needed for a real Haier deployment.

---

## 15. Multimodal Audit

| Modality | Status | Detail |
|----------|--------|--------|
| Text | EXISTS | Full text I/O in conversations |
| Image input | MISSING | No image upload or processing |
| Image output | MISSING | No image generation |
| Audio input | MISSING | No speech-to-text |
| Audio output | MISSING | No text-to-speech |
| Video input | MISSING | No video processing |
| File upload in chat | MISSING | Only document upload to knowledge base |

---

## 16. Voice Audit

### Current State: **MISSING**

No telephony, STT, or TTS components exist.

### Required Components for Voice

| Component | Status |
|-----------|--------|
| Telephony (SIP/PSTN) | MISSING |
| STT (Speech-to-Text) | MISSING |
| Agent Runtime (streaming) | MISSING |
| TTS (Text-to-Speech) | MISSING |
| Call recording | MISSING |
| Call routing | MISSING |
| Voicemail | MISSING |

---

## 17. WhatsApp Audit

### Current State: **MISSING**

- `channels` table has `whatsapp` type but status is "unavailable"
- No webhook endpoint for incoming WhatsApp messages
- No WhatsApp Business API integration
- No media handling
- No conversation mapping

### What Would Be Needed

| Component | Status |
|-----------|--------|
| WhatsApp Business API setup | MISSING |
| Webhook endpoint | MISSING |
| Incoming message processing | MISSING |
| Media download/handling | MISSING |
| Outbound message sending | MISSING |
| Template messages | MISSING |
| Conversation mapping | MISSING |
| Rate limiting | MISSING |

---

## 18. Salesforce Audit

### Current State: **MISSING**

- `Integrations.tsx` shows Salesforce as a card in the integration grid
- No actual Salesforce API integration exists
- No OAuth flow for Salesforce
- No case creation
- No customer lookup

### What Would Be Needed

| Component | Status |
|-----------|--------|
| Salesforce OAuth | MISSING |
| API client | MISSING |
| Customer lookup | MISSING |
| Case creation | MISSING |
| Attachment handling | MISSING |
| Case updates | MISSING |
| Technician workflow | MISSING |

---

## 19. Analytics

### Current State: **PARTIAL**

The analytics system has 5 endpoints generating **synthetic data**:

- `analytics.overview` — generates random KPI data
- `analytics.segments` — generates random segment metrics
- `analytics.topics` — generates random topic data
- `analytics.sentiment` — generates random sentiment distribution
- `analytics.trends` — generates random time-series

### What Works

- KPI display UI with date range filtering
- Topic ranking with trend indicators
- Sentiment distribution display
- Revenue trend charts

### What is Missing

| Metric | Status |
|--------|--------|
| Real conversation metrics | MISSING — data is generated |
| Resolution rate | MISSING |
| Escalation rate | MISSING |
| Token usage | MISSING |
| Cost tracking | MISSING |
| Tool usage | MISSING |
| Error rates | MISSING |
| Customer satisfaction | MISSING |
| AI-specific metrics | MISSING |

---

## 20. Evaluation

### Current State: **MISSING**

No AI evaluation framework exists.

### What Would Be Needed

| Component | Status |
|-----------|--------|
| Test case dataset | MISSING |
| Automated evaluation | MISSING |
| Hallucination detection | MISSING |
| Groundedness scoring | MISSING |
| Tool accuracy testing | MISSING |
| Regression detection | MISSING |
| A/B testing | MISSING |

---

## 21. Observability

### Current State: **PARTIAL**

- `audit_logs` table records all mutations
- `requestLogging` middleware logs every tRPC call (path, type, userId, duration, outcome)
- `agent_runs` table tracks execution status
- Structured error logging with stack traces in development

### What is Missing

| Component | Status |
|-----------|--------|
| Distributed tracing | MISSING |
| LLM call logging | MISSING |
| Token usage tracking | MISSING |
| Cost attribution | MISSING |
| Latency histograms | MISSING |
| Error alerting | MISSING |
| Dashboard for ops | MISSING |
| Log aggregation | MISSING |

---

## 22. Security Audit

### Risk Assessment

| Risk | Severity | Detail | Mitigation |
|------|----------|--------|------------|
| No RLS at database level | **HIGH** | Application-level only; a bug in middleware = data leak | Add PostgreSQL RLS policies |
| No per-user rate limiting | **MEDIUM** | Only global endpoint limits | Add per-session/per-user limits |
| No account lockout | **MEDIUM** | Unlimited login attempts | Add lockout after N failures |
| Prompt injection | **HIGH** | User input goes directly to LLM with system prompt | Add input sanitization, instruction hierarchy |
| No file content scanning | **MEDIUM** | Uploaded documents processed without malware check | Add content validation |
| DATA_ENCRYPTION_KEY in env | **LOW** | Symmetric key, rotation difficult | Consider KMS |
| Session not rotated on privilege change | **LOW** | Role changes don't invalidate sessions | Add session versioning |
| Embed.js CORS | **LOW** | Embed script makes cross-origin requests | Verify CSP headers |
| No CSRF protection | **MEDIUM** | Cookie-based auth without CSRF tokens | Add SameSite + CSRF token |
| Worker process permissions | **LOW** | Worker runs with same DB credentials as API | Consider separate credentials |

---

## 23. Performance & Scalability

### Current Bottlenecks

| Area | Issue | Impact |
|------|-------|--------|
| Job queue polling | 1.5s interval, single-worker claim | Delays under load |
| intelligence.ask | Loads ALL data source records + ALL document chunks | Slow with large knowledge bases |
| No caching | Every request hits the database | Repeated queries |
| No connection pooling config | Default postgres.js pool | May exhaust connections at scale |
| Free tier Render | 512MB RAM, shared CPU | Limits concurrent users |
| Vite build size | 772KB main bundle | Slow initial load |
| No CDN | Static assets served from Render | High latency for distant users |

### What Works Well

- Database indexes are well-designed for workspace-scoped queries
- Soft deletes avoid expensive schema changes
- Lazy loading reduces initial bundle size
- Job queue with exponential backoff handles failures gracefully

---

## 24. Testing Audit

### Test Inventory

| File | Tests | Coverage |
|------|-------|----------|
| `feature-flows.test.ts` | 4 | Agent run, intelligence ask, analytics, notifications |
| `document-validation.test.ts` | 1 | MIME validation |
| `crypto.test.ts` | 1 | Encryption round-trip |
| `authz.test.ts` | 4 | Workspace RBAC |
| `auth.logout.test.ts` | 1 | Logout cookie clearing |
| `system.health.test.ts` | 1 | Health endpoint |
| `worker.integration.test.ts` | 3 | Worker processors |
| `worker.helpers.test.ts` | 4 | Text extraction, chunking, normalization |
| `oauth.test.ts` | 2 | OAuth readiness |
| `e2e-test.mjs` | 36 | Full API endpoint coverage |
| **Total** | **~57** | |

### Coverage Assessment

| Area | Coverage | Notes |
|------|----------|-------|
| Auth | GOOD | Login, logout, RBAC, OAuth tested |
| Workspaces | GOOD | Members, roles tested |
| Agents | GOOD | Run queueing tested |
| Intelligence | GOOD | Ask flow tested |
| Documents | GOOD | Validation tested |
| Worker | GOOD | All 4 processors tested |
| Analytics | PARTIAL | KPI calculation tested, no real data tests |
| Workflows | PARTIAL | Notification action tested |
| Frontend | **NONE** | No frontend tests |
| Integration | PARTIAL | e2e covers API but not browser flows |
| AI evaluation | **NONE** | No quality tests |

---

## 25. Deployment Audit

### Current Deployment

| Component | Platform | Status |
|-----------|----------|--------|
| API server | Render.com (Frankfurt) | **Working** |
| Worker | Render.com (Frankfurt) | **Working** (separate service) |
| Database | Supabase (PostgreSQL) | **Working** |
| Storage | Supabase (S3-compatible) | **Working** |
| CDN | None | **Missing** |
| CI/CD | None (manual push) | **Missing** |
| Monitoring | None | **Missing** |
| Log aggregation | None | **Missing** |

### Deployment Readiness

| Level | Status |
|-------|--------|
| Development Ready | **YES** |
| Demo Ready | **YES** |
| Pilot Ready | **PARTIAL** — needs real data, monitoring |
| Production Ready | **NO** — needs CI/CD, monitoring, RLS, rate limiting |

---

## 26. Chatbase Benchmark

| Feature | Chatbase | SOPRANOVA | Assessment |
|---------|----------|-----------|------------|
| Agent Builder | Visual, multi-agent | Basic CRUD | **BUILD** |
| Knowledge | File upload + URLs + scraping | File upload only | **IMPROVE** |
| RAG | Vector search + reranking | None | **BUILD** |
| Chat | Widget + iframe + API | Widget + iframe | **KEEP** |
| Deployment | Multiple channels | Widget + embed | **IMPROVE** |
| Analytics | Real metrics | Generated data | **BUILD** |
| Tools | Built-in + custom | None | **BUILD** |
| Integrations | Native (Slack, Zapier, etc.) | Static cards | **BUILD** |
| Memory | Long-term + short-term | None | **BUILD** |
| Workflow | Visual builder | CRUD only | **BUILD** |
| Evaluation | Built-in | None | **BUILD** |
| Multimodal | Image + file | None | **BUILD** |
| Voice | STT + TTS | None | **BUILD** |
| Enterprise | SSO, RBAC, audit | RBAC + audit | **KEEP** |

---

## 27. Gap Analysis

| Capability | Current Status | Evidence | Priority | Recommendation |
|------------|---------------|----------|----------|----------------|
| Multi-tenant auth | EXISTS | Session-based, RBAC, workspace isolation | — | KEEP |
| Agent CRUD | EXISTS | agents router, Backstage UI | — | KEEP |
| Basic chat | EXISTS | conversations + intelligence.ask | — | IMPROVE with streaming |
| Document upload | EXISTS | S3 storage, MIME validation | — | KEEP |
| Text extraction | PARTIAL | PDF regex, DOCX/XLSX XML | P1 | IMPROVE with proper libraries |
| Embed.js widget | EXISTS | Self-contained IIFE | — | KEEP |
| Workspace RBAC | EXISTS | 4 roles, per-request validation | — | KEEP |
| Audit logging | EXISTS | audit_logs table, writeAuditLog | — | KEEP |
| **Vector embeddings** | **MISSING** | No embedding table, no vector DB | **P0** | BUILD |
| **RAG retrieval** | **MISSING** | No similarity search | **P0** | BUILD |
| **Tool system** | **MISSING** | No tool registry, no execution | **P0** | BUILD |
| **Streaming responses** | **MISSING** | No SSE/WebSocket | **P0** | BUILD |
| **Memory system** | **MISSING** | No memory tables | **P1** | BUILD |
| **Real analytics** | **MISSING** | Data is generated, not real | **P1** | BUILD |
| **Multi-provider LLM** | **MISSING** | Single OpenRouter endpoint | **P1** | BUILD model gateway |
| **Workflow engine** | **PARTIAL** | CRUD exists, execution is stub | **P1** | BUILD real execution |
| **WhatsApp integration** | **MISSING** | Channel type exists, no logic | **P2** | BUILD |
| **Salesforce integration** | **MISSING** | Card exists, no logic | **P2** | BUILD |
| **Voice (STT/TTS)** | **MISSING** | Nothing | **P3** | BUILD later |
| **AI evaluation** | **MISSING** | Nothing | **P2** | BUILD |
| **API/SDK** | **MISSING** | No API keys, no public API | **P2** | BUILD |
| **Agent versioning** | **MISSING** | No version history | **P3** | BUILD later |
| **CI/CD** | **MISSING** | Manual push | **P1** | BUILD |
| **Monitoring** | **MISSING** | No alerting | **P1** | BUILD |
| **Database RLS** | **MISSING** | Application-level only | **P0** | BUILD |
| **Per-user rate limiting** | **MISSING** | Global only | **P1** | BUILD |
| **CSRF protection** | **MISSING** | No tokens | **P1** | BUILD |
| **Frontend tests** | **MISSING** | Zero frontend tests | **P2** | BUILD |
| **PDF text extraction** | **PARTIAL** | Regex-based, unreliable | **P1** | Use pdf-parse or pdfjs |

---

## 28. Architectural Problems

| # | Problem | Why It Matters | Impact | Recommended Solution | Priority |
|---|---------|---------------|--------|---------------------|----------|
| 1 | **No vector database** | RAG is the core value prop of an AI agent platform | Platform cannot provide intelligent answers from knowledge | Add pgvector extension or dedicated vector DB | P0 |
| 2 | **No embedding pipeline** | Documents are chunked but never embedded | Knowledge base is useless for retrieval | Build embedding generation on document upload | P0 |
| 3 | **No tool system** | Agents cannot perform actions | Agents are chatbots, not agents | Build tool registry + execution engine | P0 |
| 4 | **No streaming** | Responses appear only when complete | Poor UX, feels slow | Add SSE to intelligence.ask | P0 |
| 5 | **Analytics data is fake** | Dashboard shows random numbers | Misleading, erodes trust | Implement real metric collection | P1 |
| 6 | **Single LLM provider** | No fallback, no cost optimization | Vendor lock-in, single point of failure | Build model gateway abstraction | P1 |
| 7 | **Dead code** | `_core/hooks/useAuth.ts`, legacy MySQL migrations | Confusion, maintenance burden | Remove dead files | P2 |
| 8 | **Workflow engine is stub** | Only notification actions work | Feature is incomplete | Build real node execution | P1 |
| 9 | **No database RLS** | One middleware bug = data leak | Tenant isolation at risk | Add PostgreSQL row-level security | P0 |
| 10 | **PDF extraction is regex** | Unreliable for real documents | Poor knowledge quality | Use proper PDF parsing library | P1 |
| 11 | **No error alerting** | Silent failures | Issues discovered by users | Add error reporting | P1 |
| 12 | **"Continue for Free" broken** | CTA shows toast instead of navigating | Lost conversions | Fix navigation to /auth/signup | P0 |
| 13 | **Customer stories empty** | customerStories array is empty | Landing page has no social proof | Populate or remove section | P2 |
| 14 | **Channels are CRUD only** | No webhook handling, no real integration | Channels are non-functional | Build actual webhook processors | P1 |
| 15 | **Outbound campaigns don't send** | sendCampaign just changes status | Feature is cosmetic | Integrate with email/SMS providers | P2 |

---

## 29. What Should NOT Be Built

| Feature | Why Not Now |
|---------|------------|
| Custom video generation | Complex, low ROI at this stage |
| SAML/SCIM SSO | Enterprise feature, not needed for pilot |
| Multi-region deployment | Single region is fine for initial users |
| Custom AI model training | Use existing models first |
| Real-time collaboration | Not needed for AI agent platform |
| Mobile apps | Web-first approach, responsive design is sufficient |
| Complex reporting engine | Basic analytics first, iterate |
| Marketplace/plugin system | Build core features first |
| White-label UI | Focus on one brand first |
| Multi-language admin UI | English first, localize later |
| Complex approval workflows | Simple flows first |
| Real-time voice calls | Text-first, voice later |
| Video conferencing integration | Not core to AI agent platform |
| ERP integrations | Salesforce/CRM first, ERP later |
| Custom deployment options | SaaS first, self-hosted later |

---

## 30. Recommended Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│  Landing │ Auth │ Dashboard │ Agent Builder │ Playground │
│  PublicNav │ DashboardLayout │ CommandPalette │ embed.js │
└───────────────┬─────────────────────────────────────────┘
                │ tRPC + SSE (streaming)
┌───────────────▼─────────────────────────────────────────┐
│                   API Layer (Express)                    │
│  tRPC Router │ Middleware │ Auth │ RBAC │ Rate Limiting  │
└───────┬───────────┬───────────────┬─────────────────────┘
        │           │               │
┌───────▼───┐ ┌─────▼─────┐ ┌──────▼──────┐
│  Auth     │ │ Agent     │ │ Knowledge   │
│  Service  │ │ Runtime   │ │ Service     │
│  Sessions │ │ Orchestr. │ │ Ingestion   │
│  RBAC     │ │ Tool Exec │ │ Embedding   │
│  OAuth    │ │ Memory    │ │ Retrieval   │
└───────────┘ └─────┬─────┘ └──────┬──────┘
                    │               │
┌───────────────────▼───────────────▼─────────────────────┐
│                 Model Gateway                            │
│  Router │ Provider Adapter │ Token Counter │ Cost Track  │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ OpenAI   │ Anthropic│ Google   │ Local    │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              PostgreSQL + pgvector                       │
│  Users │ Workspaces │ Agents │ Conversations │ Messages  │
│  Documents │ Embeddings │ Tools │ Memory │ Workflows     │
│  Analytics │ Audit │ Jobs │ Integrations                 │
└─────────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Infrastructure                              │
│  S3 Storage │ Job Queue (BullMQ/Redis) │ Email (Resend) │
│  Observability (OpenTelemetry) │ CI/CD (GitHub Actions)  │
└─────────────────────────────────────────────────────────┘
```

### How Components Connect

1. **Frontend** → tRPC mutations/queries → **API Layer**
2. **API Layer** → validates auth + RBAC → delegates to services
3. **Agent Runtime** → receives user message → retrieves context (memory + knowledge) → constructs prompt → calls Model Gateway → processes tool calls → returns response
4. **Model Gateway** → selects provider based on config/cost → routes request → tracks tokens/cost
5. **Knowledge Service** → ingests documents → generates embeddings → stores in pgvector → retrieves relevant chunks for queries
6. **PostgreSQL** → single source of truth with pgvector for embeddings
7. **Job Queue** → handles async work (embeddings, syncs, evaluations)

---

## 31. Implementation Roadmap

### Phase 0: Architecture Stabilization (1-2 weeks)

**Objective:** Fix critical issues, remove dead code, establish foundations.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Fix "Continue for Free" button | `Home.tsx` | None | Button navigates to /auth/signup |
| Remove dead code (`useAuth.ts`, legacy MySQL migrations) | `_core/hooks/useAuth.ts`, `drizzle/legacy-mysql/` | None | No dead imports |
| Add database RLS policies | `drizzle/schema.ts`, migrations | Medium | All queries enforce workspace isolation at DB level |
| Add per-user rate limiting | `server/_core/index.ts` | Low | 429 returned after threshold |
| Add CSRF protection | `server/_core/cookies.ts`, middleware | Low | Cross-origin mutations rejected |
| Configure connection pooling | `server/db.ts` | Low | Pool size appropriate for Render free tier |
| Populate or remove empty customer stories | `data/customerStories.ts`, `Home.tsx` | None | No empty sections on landing page |
| Add error reporting | `server/_core/index.ts` | Low | Errors sent to monitoring service |

### Phase 1: Core Agent Platform (2-3 weeks)

**Objective:** Transform chatbot into agent runtime with streaming and tools.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Add SSE streaming to intelligence.ask | `routers/conversations.ts`, `_core/llm.ts`, `lib/trpc.ts` | Medium | Responses stream token-by-token |
| Build tool registry schema | `drizzle/schema.ts` | Low | Tools table with JSON Schema support |
| Build tool execution engine | New: `server/tools.ts` | Medium | Tools can be called by agents |
| Build 5 built-in tools | `server/tools/` | Low | HTTP request, email send, notification, ticket create, contact lookup |
| Add tool calling to agent runtime | `server/worker.ts` | Medium | Agent can execute tools in a loop |
| Add token counting | `_core/llm.ts` | Low | Token usage tracked per call |
| Add cost tracking | `server/routers/analytics.ts` | Low | Real cost data in analytics |
| Add multi-provider model gateway | New: `server/models.ts` | Medium | Support OpenAI, Anthropic, Google |

### Phase 2: Knowledge / RAG (2-3 weeks)

**Objective:** Enable real document retrieval with vector search.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Enable pgvector extension | Supabase dashboard | None | `vector` type available |
| Create embeddings table | `drizzle/schema.ts` | Low | Table with vector column |
| Build embedding generation pipeline | `server/worker.ts`, new embedding service | Medium | Documents get embedded on upload |
| Replace PDF regex with proper parser | `server/worker.ts` | Low | Use pdf-parse library |
| Build similarity search function | New: `server/search.ts` | Medium | Semantic search over embeddings |
| Integrate RAG into intelligence.ask | `routers/conversations.ts` | Medium | Responses grounded in knowledge |
| Add relevance scoring | `server/search.ts` | Low | Results ranked by similarity |
| Add citation generation | `routers/conversations.ts` | Low | Sources cited in responses |

### Phase 3: Memory (1-2 weeks)

**Objective:** Enable persistent agent memory.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Create memories table | `drizzle/schema.ts` | Low | Table with embedding for semantic search |
| Build memory CRUD endpoints | New: `routers/memory.ts` | Low | Create, search, update, delete memories |
| Add memory retrieval to agent runtime | `server/worker.ts` | Low | Agent recalls relevant memories |
| Add memory extraction from conversations | `server/worker.ts` | Low | Key facts extracted and stored |

### Phase 4: Workflow Engine (2-3 weeks)

**Objective:** Build real workflow execution.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Build node executor | New: `server/workflow-executor.ts` | Medium | Nodes execute in order |
| Implement condition nodes | `workflow-executor.ts` | Medium | Branching based on conditions |
| Implement AI nodes | `workflow-executor.ts` | Low | AI calls within workflows |
| Implement tool nodes | `workflow-executor.ts` | Low | Tool calls within workflows |
| Implement wait/delay nodes | `workflow-executor.ts` | Low | Workflows can pause |
| Add execution tracing | `workflow_runs` table | Low | Every step logged |

### Phase 5: Haier Pilot (3-4 weeks)

**Objective:** Deploy a working Haier support agent.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Build product knowledge base loader | New ingestion pipeline | Medium | Haier manuals ingested and embedded |
| Build Haier agent configuration | Agent config + system prompt | Low | Agent knows Haier products |
| Build customer lookup tool | New tool | Low | Find customer by email/phone |
| Build warranty check tool | New tool | Low | Check warranty status |
| Build ticket creation tool | New tool | Low | Create Salesforce/internal tickets |
| Build escalation workflow | Workflow configuration | Low | Handoff to human when needed |
| Deploy widget on Haier test page | embed.js | None | Chat works on Haier site |

### Phase 6: Multimodal (2-3 weeks)

**Objective:** Support images, audio, and files in conversations.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Add image upload to conversations | `routers/conversations.ts`, `messages` table | Medium | Images can be sent in chat |
| Add image analysis via LLM vision | `server/_core/llm.ts` | Low | Agent can "see" images |
| Add file upload to conversations | Same | Medium | Files can be shared in chat |
| Add OCR for document images | New service | Medium | Text extracted from images |

### Phase 7: Voice / WhatsApp (3-4 weeks)

**Objective:** Enable phone and WhatsApp channels.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Add STT integration | New: `server/stt.ts` | Medium | Audio transcribed to text |
| Add TTS integration | New: `server/tts.ts` | Medium | Text converted to speech |
| Build WhatsApp webhook endpoint | New route | Medium | Incoming messages processed |
| Build WhatsApp message handler | New service | Medium | Text + media handled |
| Add telephony integration | External service | High | Phone calls can reach agent |

### Phase 8: Enterprise (2-3 weeks)

**Objective:** Enterprise features for production deployment.

| Task | Files Affected | Risk | Acceptance Criteria |
|------|---------------|------|-------------------|
| Build API key management | New table + routes | Low | Programmatic API access |
| Build public REST API | New routes | Medium | External integrations possible |
| Add SAML/SSO | New auth provider | High | Enterprise login |
| Build evaluation framework | New service | Medium | Automated quality testing |
| Add comprehensive monitoring | Infrastructure | Low | Alerts on errors/latency |
| Set up CI/CD | GitHub Actions | Low | Automated testing + deployment |

---

## 32. Haier Demo Plan

### Demo Flow (Real, Not Fake)

```
Customer (web browser)
  ↓ visits haier-europe.com/support
  ↓ SOPRANOVA embed.js loaded
  ↓ Chat widget appears

Customer: "My Haier HRF-468IF7 is not cooling"
  ↓
SOPRANOVA Agent (configured for Haier):
  1. Retrieves product info from knowledge base (RAG)
  2. Identifies product: Haier HRF-468IF7 Refrigerator
  3. Checks troubleshooting procedures
  4. Asks diagnostic questions
  5. Provides step-by-step resolution

If unresolved:
  6. Creates support ticket
  7. Attaches conversation transcript
  8. Escalates to human agent
  9. Provides ticket number to customer
```

### What Must Exist for This Demo

| Component | Minimum Viable | Can Be Stubbed |
|-----------|---------------|----------------|
| Embed widget | **REAL** — already works | No |
| Agent configuration | **REAL** — system prompt + personality | No |
| Knowledge base | **REAL** — 5-10 Haier manuals embedded | No |
| RAG retrieval | **REAL** — vector search over manuals | No |
| Streaming responses | **REAL** — token-by-token | No |
| Product lookup tool | **REAL** — query product DB | Can use hardcoded data initially |
| Warranty check tool | Can be stubbed | Yes — return mock data |
| Ticket creation | **REAL** — create helpdesk ticket | No |
| Escalation | **REAL** — handoff to human | Can be simulated |
| Analytics | Can show real conversation data | Yes — basic counts |

### Minimum Demo Requirements

1. **Embed widget deployed on test page** — already works
2. **Agent with Haier-specific system prompt** — configure via Backstage
3. **10 Haier product manuals uploaded and embedded** — need pgvector + embedding pipeline
4. **RAG retrieval working** — similarity search returning relevant chunks
5. **Streaming responses** — SSE for real-time output
6. **Product lookup tool** — hardcoded Haier product catalog
7. **Ticket creation tool** — creates helpdesk ticket on escalation

---

## 33. Final Executive Summary

### 1. What SOPRANOVA Already Has

- **Solid multi-tenant architecture** with workspace-scoped RBAC (4 roles)
- **Complete authentication system** with sessions, password reset, OAuth placeholder
- **67 tRPC API endpoints** covering agents, conversations, data, documents, workflows, analytics, helpdesk, contacts, leads, channels, outbound
- **33 PostgreSQL tables** with proper relationships, indexes, and soft deletes
- **Background job processor** with 4 job types (agent run, data sync, document processing, workflow)
- **S3-compatible storage** for document uploads
- **Embeddable chat widget** that works
- **25 frontend pages** with responsive design
- **53 shadcn/ui components** ready for use
- **Comprehensive test suite** (57 tests across 10 files + 36 e2e tests)
- **Deployed and running** on Render.com

### 2. What Is Good

- **Tenant isolation** — Every query is workspace-scoped, RBAC validated per-request
- **Database design** — Well-normalized, proper foreign keys, good indexes
- **Auth security** — Token hashing, httpOnly cookies, password reset with expiry
- **Error handling** — Structured error scrubbing, production-safe error messages
- **Job queue** — Exponential backoff, retry logic, max attempts
- **Code organization** — Clear separation of routers, services, and core

### 3. What Is Broken

- **"Continue for Free" CTA** — Shows toast instead of navigating to signup
- **Analytics data** — All generated/random, not real
- **Customer stories** — Empty array, no content
- **Outbound campaigns** — Send action just changes status, no actual delivery
- **Channel webhooks** — No incoming webhook handling for any channel
- **PDF extraction** — Regex-based, unreliable for real documents

### 4. What Is Missing

- **Vector embeddings and RAG** — The core differentiator for an AI platform
- **Tool system** — Agents cannot perform any actions
- **Streaming** — No real-time response delivery
- **Memory** — No persistent agent memory
- **Real analytics** — No actual metric collection
- **Multi-provider LLM** — Single hardcoded provider
- **WhatsApp integration** — Channel exists but no logic
- **Salesforce integration** — Card exists but no logic
- **Voice (STT/TTS)** — Nothing
- **AI evaluation** — Nothing
- **CI/CD** — Manual deployment
- **Monitoring** — No alerting
- **Database RLS** — Application-level only
- **API keys / public API** — No programmatic access

### 5. What Should Be Preserved

- **Multi-tenant architecture** — The foundation is solid
- **RBAC system** — 4 roles with per-request validation
- **Database schema** — Well-designed, extendable
- **tRPC API structure** — Clean router organization
- **Worker architecture** — Separate process, job queue pattern
- **Auth flow** — Secure session management
- **Embed widget** — Simple, effective, self-contained

### 6. What Should Be Refactored

- **Agent runtime** — Transform from single LLM call to agentic loop with tools
- **Intelligence endpoint** — Add streaming, proper RAG context injection
- **Analytics** — Replace generated data with real metric collection
- **Document processing** — Replace regex PDF extraction with proper library
- **Workflow engine** — Build real node execution beyond notifications

### 7. What Should NOT Be Touched

- **Database schema core** — users, workspaces, memberships, auth tables
- **Auth flow** — Session management is solid
- **RBAC middleware** — Working correctly
- **tRPC router structure** — Well organized
- **Embed widget** — Simple and effective
- **Frontend component library** — shadcn/ui components are reusable

### 8. What Must Be Built First

1. **Vector embeddings + RAG** — Without this, the platform is a chatbot, not an AI agent platform
2. **Streaming responses** — Critical for user experience
3. **Tool system** — What makes agents useful
4. **Database RLS** — Security foundation
5. **Fix "Continue for Free"** — Lost conversion

### 9. Biggest Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No RLS = data leak | Medium | Critical | Add PostgreSQL RLS policies immediately |
| RAG quality insufficient | Medium | High | Invest in proper chunking, embedding, reranking |
| Streaming complexity | Low | Medium | Use established patterns (SSE with tRPC) |
| Tool execution safety | Medium | High | Sandboxed execution, permission model |
| Vendor lock-in (OpenRouter) | Medium | Medium | Build provider abstraction early |

### 10. Estimated Implementation Complexity

| Phase | Effort | Team Size | Duration |
|-------|--------|-----------|----------|
| Phase 0: Stabilization | Low | 1 dev | 1-2 weeks |
| Phase 1: Agent Platform | Medium | 1-2 devs | 2-3 weeks |
| Phase 2: Knowledge/RAG | Medium | 1-2 devs | 2-3 weeks |
| Phase 3: Memory | Low | 1 dev | 1-2 weeks |
| Phase 4: Workflows | Medium | 1-2 devs | 2-3 weeks |
| Phase 5: Haier Pilot | Medium | 2 devs | 3-4 weeks |
| Phase 6: Multimodal | Medium | 1-2 devs | 2-3 weeks |
| Phase 7: Voice/WhatsApp | High | 2-3 devs | 3-4 weeks |
| Phase 8: Enterprise | Medium | 1-2 devs | 2-3 weeks |
| **Total** | | | **~18-27 weeks** |

### 11. Recommended Next 10 Development Tasks

| # | Task | Priority | Est. Effort |
|---|------|----------|-------------|
| 1 | Fix "Continue for Free" button navigation | P0 | 10 min |
| 2 | Enable pgvector extension, create embeddings table | P0 | 2 hours |
| 3 | Build embedding generation pipeline (on document upload) | P0 | 1 day |
| 4 | Build similarity search function | P0 | 1 day |
| 5 | Integrate RAG into intelligence.ask | P0 | 1 day |
| 6 | Add SSE streaming to intelligence.ask | P0 | 1 day |
| 7 | Add PostgreSQL RLS policies | P0 | 1 day |
| 8 | Build tool registry schema + CRUD | P0 | 1 day |
| 9 | Build HTTP request tool (first built-in tool) | P0 | 1 day |
| 10 | Add per-user rate limiting | P1 | 2 hours |

---

**Audit completed.** This report reflects the current state of the codebase as of September 2, 2026. No files were modified during this audit.
