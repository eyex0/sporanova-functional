import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveMembership: vi.fn(),
  requireDb: vi.fn(),
  writeAuditLog: vi.fn(),
  enqueueJob: vi.fn(),
  listLLMModels: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => ({ getActiveMembership: mocks.getActiveMembership, requireDb: mocks.requireDb, writeAuditLog: mocks.writeAuditLog }));
vi.mock("./jobs", () => ({ enqueueJob: mocks.enqueueJob }));
vi.mock("./_core/llm", () => ({ listLLMModels: mocks.listLLMModels, invokeLLM: mocks.invokeLLM }));

import { agentsRouter } from "./routers/agents";
import { analyticsRouter } from "./routers/analytics";
import { conversationsRouter, intelligenceRouter } from "./routers/conversations";
import { notificationsRouter } from "./routers/notifications";
import { router } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";

const testRouter = router({ agents: agentsRouter, intelligence: intelligenceRouter, analytics: analyticsRouter, conversations: conversationsRouter, notifications: notificationsRouter });

function context(role: "owner" | "admin" | "member" | "viewer" = "member"): TrpcContext {
  return {
    user: { id: 41, openId: "user-41", name: "Test User", email: "test@example.com", loginMethod: "credentials", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function chain<T>(rows: T[]) {
  const query = (): Record<string, unknown> & PromiseLike<T[]> => {
    const result = {
      limit: async () => rows,
      offset: async () => rows,
      orderBy: () => query(),
      then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
    };
    return result;
  };
  return { from: () => ({ where: () => query() }) };
}

function dbMock(selectRows: unknown[][], insertIds: number[] = [501]) {
  let selectIndex = 0;
  let insertIndex = 0;
  const select = vi.fn(() => chain(selectRows[selectIndex++] ?? []));
  const insert = vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => [{ id: insertIds[insertIndex++] ?? 999 }]) })) }));
  const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({ affectedRows: 1 })) })) }));
  const db = { select, insert, update };
  mocks.requireDb.mockResolvedValue(db);
  return { db, insert, update };
}

describe("authenticated feature flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveMembership.mockResolvedValue({ workspaceId: 7, userId: 41, role: "member", isActive: true });
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.enqueueJob.mockResolvedValue(801);
  });

  it("queues a real agent run only after resolving the agent in the active workspace", async () => {
    const { insert } = dbMock([[{ id: 12, workspaceId: 7, name: "Revenue Analyst", purpose: "Analyze revenue", status: "active", deletedAt: null }]], [901]);
    const caller = testRouter.createCaller(context());
    await expect(caller.agents.runNow({ workspaceId: 7, agentId: 12, instruction: "Explain the latest variance" })).resolves.toMatchObject({ id: 901, status: "pending" });
    expect(mocks.enqueueJob).toHaveBeenCalledWith({ workspaceId: 7, type: "agent.run", payload: { runId: 901, agentId: 12, workspaceId: 7, actorUserId: 41, instruction: "Explain the latest variance" } });
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 7, action: "agent.run_queued", resourceId: 901 }));
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("answers intelligence from a persisted conversation and cites connected workspace sources", async () => {
    const { insert, update } = dbMock([
      [{ id: 31, workspaceId: 7, createdById: 41, deletedAt: null }],
      [{ id: 44, name: "Salesforce", type: "http" }],
      [{ id: 45, name: "Q3 report" }],
      [{ id: 31, conversationId: 31, role: "user", content: "What changed?" }],
    ], [1001, 1002, 1003]);
    mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Revenue declined in North. [Salesforce]" } }] });
    const caller = testRouter.createCaller(context());
    await expect(caller.intelligence.ask({ workspaceId: 7, conversationId: 31, question: "What changed in North?" })).resolves.toMatchObject({ id: 1002, content: "Revenue declined in North. [Salesforce]", sources: [{ label: "Salesforce", sourceType: "data_source", sourceReference: "44" }, { label: "Q3 report", sourceType: "document", sourceReference: "45" }] });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", maxTokens: 1400 }));
    expect(insert).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenCalledTimes(1);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "intelligence.asked", resourceId: 31 }));
  });

  it("calculates analytics KPI change from workspace-scoped current and prior periods", async () => {
    dbMock([
      [{ metricKey: "mrr", metricValue: "1200", metricDate: new Date(), segment: "all" }, { metricKey: "revenue", metricValue: "5000", metricDate: new Date(), segment: "all" }],
      [{ metricKey: "mrr", metricValue: "1000", metricDate: new Date(), segment: "all" }],
    ]);
    const caller = testRouter.createCaller(context("viewer"));
    const result = await caller.analytics.overview({ workspaceId: 7, range: "30D" });
    expect(result).toMatchObject({ range: "30D", kpis: { mrr: { value: 1200, priorValue: 1000, changePercent: 20 }, revenue: { value: 5000, priorValue: 0, changePercent: null } } });
    expect(mocks.getActiveMembership).toHaveBeenCalledWith(7, 41);
  });

  it("lists only the signed-in user's unread notifications and marks an authorized item read", async () => {
    const { update } = dbMock([[{ id: 71, workspaceId: 7, recipientUserId: 41, title: "Revenue alert", readAt: null }], [{ id: 71, workspaceId: 7, recipientUserId: 41, title: "Revenue alert", readAt: null }]]);
    const caller = testRouter.createCaller(context());
    await expect(caller.notifications.list({ workspaceId: 7, unreadOnly: true, limit: 10 })).resolves.toEqual([{ id: 71, workspaceId: 7, recipientUserId: 41, title: "Revenue alert", readAt: null }]);
    await expect(caller.notifications.markRead({ workspaceId: 7, notificationId: 71 })).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledTimes(1);
  });
});
