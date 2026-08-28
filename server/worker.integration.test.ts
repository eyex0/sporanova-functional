import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireDb: vi.fn(),
  writeAuditLog: vi.fn(),
  decryptJson: vi.fn(),
  storageGet: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("./db", () => ({ requireDb: mocks.requireDb, writeAuditLog: mocks.writeAuditLog }));
vi.mock("./crypto", () => ({ decryptJson: mocks.decryptJson }));
vi.mock("./storage", () => ({ storageGet: mocks.storageGet }));
vi.mock("./email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/env", () => ({ ENV: { ai: { model: "test-model" } } }));

import { processDataSourceSync, processDocument, processWorkflowRun } from "./worker";

function chain<T>(rows: T[]) {
  return {
    from: () => ({
      where: () => ({
        limit: async () => rows,
        orderBy: async () => rows,
      }),
    }),
  };
}

function dbMock(selectRows: unknown[][] = []) {
  let selectIndex = 0;
  const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({ affectedRows: 1 })) })) }));
  const insert = vi.fn(() => ({ values: vi.fn(() => { const thenable: any = {}; thenable.returning = vi.fn(async () => [{ id: 501 }]); thenable.onConflictDoUpdate = vi.fn(async () => undefined); thenable.then = (resolve: (value: unknown) => unknown) => Promise.resolve([{ id: 501 }]).then(resolve); return thenable; }) }));
  const deleteQuery = vi.fn(() => ({ where: vi.fn(async () => ({ affectedRows: 1 })) }));
  const select = vi.fn(() => chain(selectRows[selectIndex++] ?? []));
  const db = { select, update, insert, delete: deleteQuery };
  mocks.requireDb.mockResolvedValue(db);
  return { db, update, insert, deleteQuery };
}

describe("worker handler integration contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it("does not reprocess a ready document that already has chunks", async () => {
    const { db, update, insert, deleteQuery } = dbMock([[{ id: 10, status: "ready", storageKey: "docs/10", mimeType: "text/plain", workspaceId: 7 }], [{ id: 55 }]]);
    await expect(processDocument({ documentId: 10, workspaceId: 7 })).resolves.toBeUndefined();
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(deleteQuery).not.toHaveBeenCalled();
    expect(mocks.storageGet).not.toHaveBeenCalled();
  });

  it("marks document processing failures and preserves the provider error", async () => {
    const { update } = dbMock([[{ id: 11, status: "uploaded", storageKey: "docs/11", mimeType: "text/plain", workspaceId: 7, uploadedById: 2 }]]);
    mocks.storageGet.mockRejectedValue(new Error("storage unavailable"));
    await expect(processDocument({ documentId: 11, workspaceId: 7 })).rejects.toThrow("storage unavailable");
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.results[1]?.value.set).toHaveBeenCalledWith({ status: "failed", processingError: "storage unavailable" });
  });

  it("does not refetch or mutate a completed data-source run", async () => {
    const { update, insert } = dbMock([
      [{ id: 22, workspaceId: 7, configuration: { secret: "encrypted" }, deletedAt: null }],
      [{ id: 33, status: "completed" }],
    ]);
    await expect(processDataSourceSync({ dataSourceId: 22, runId: 33, workspaceId: 7 })).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(mocks.decryptJson).not.toHaveBeenCalled();
  });

  it("marks sync and source failed when decryption or fetch fails", async () => {
    const { update } = dbMock([[{ id: 23, workspaceId: 7, configuration: { secret: "encrypted" }, deletedAt: null }], [{ id: 34, status: "pending" }]]);
    mocks.decryptJson.mockImplementation(() => { throw new Error("invalid encrypted configuration"); });
    await expect(processDataSourceSync({ dataSourceId: 23, runId: 34, workspaceId: 7 })).rejects.toThrow("invalid encrypted configuration");
    expect(update).toHaveBeenCalledTimes(3);
    expect(update.mock.results[2]?.value.set).toHaveBeenCalledWith({ status: "failed", lastError: "invalid encrypted configuration" });
  });

  it("executes configured notification nodes, records output, and audits completion", async () => {
    const { update, insert } = dbMock([
      [{ id: 41, workflowId: 51, workspaceId: 7, status: "pending", createdById: 2 }],
      [{ id: 51, workspaceId: 7, status: "active", deletedAt: null }],
      [{ id: 61, nodeKey: "notify-owner", nodeType: "action", configuration: { action: "create_notification", recipientUserId: 2, title: "Revenue alert", content: "Revenue changed" } }],
      [{ id: 2, email: "owner@example.test" }],
    ]);
    await expect(processWorkflowRun({ runId: 41, workspaceId: 7 })).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith({ to: "owner@example.test", subject: "Revenue alert", text: "Revenue changed" });
    expect(update.mock.results.at(-1)?.value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", output: { executedNotificationNodes: [61], unsupportedNodes: [] } }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "workflow.run_completed", resourceId: 41 }));
  });

  it("fails workflow execution without inserting a notification when no action is supported", async () => {
    const { update, insert } = dbMock([
      [{ id: 42, workflowId: 52, workspaceId: 7, status: "pending", createdById: 2 }],
      [{ id: 52, workspaceId: 7, status: "active", deletedAt: null }],
      [{ id: 62, nodeKey: "unsupported", nodeType: "action", configuration: { action: "call_webhook" } }],
    ]);
    await expect(processWorkflowRun({ runId: 42, workspaceId: 7 })).rejects.toThrow("no configured executable notification action");
    expect(insert).not.toHaveBeenCalled();
    expect(update.mock.results.at(-1)?.value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", errorMessage: "This workflow has no configured executable notification action." }));
  });
});
