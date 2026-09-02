import { describe, expect, it, vi, beforeEach } from "vitest";

describe("modelGateway", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("wraps invokeLLM into a ModelResponse shape", async () => {
    vi.doMock("./llm", () => ({
      invokeLLM: vi.fn().mockResolvedValue({
        id: "resp-1",
        choices: [{ message: { content: "Hello from provider" }, finish_reason: "stop" }],
        model: "gpt-4o",
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    }));
    vi.doMock("./env", () => ({
      ENV: { ai: { provider: "openrouter", model: "gpt-4o", baseUrl: "", apiKey: "" } },
    }));

    const { modelGatewayInvoke } = await import("./modelGateway");
    const result = await modelGatewayInvoke({
      messages: [{ role: "user", content: "Hi" }],
      maxTokens: 100,
    });

    expect(result.content).toBe("Hello from provider");
    expect(result.model).toBe("gpt-4o");
    expect(result.provider).toBe("openrouter");
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("contextBuilder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("builds messages with system instructions and user message", async () => {
    const { createDefaultContextBuilder } = await import("./contextBuilder");
    const builder = createDefaultContextBuilder();

    const result = await builder.build({
      workspaceId: 1,
      agentId: 1,
      conversationId: 0,
      userMessage: "What is the revenue?",
      agent: { name: "Finance Agent", purpose: "Answer financial questions", description: "", capabilities: [], configuration: {} } as any,
      history: [],
    });

    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[result.messages.length - 1]).toEqual({ role: "user", content: "What is the revenue?" });
    expect(result.providerBreakdown).toHaveProperty("agent_instructions");
    expect(result.providerBreakdown).toHaveProperty("conversation_history");
  });

  it("includes conversation history when available", async () => {
    const { createDefaultContextBuilder } = await import("./contextBuilder");
    const builder = createDefaultContextBuilder();

    const result = await builder.build({
      workspaceId: 1,
      agentId: 1,
      conversationId: 1,
      userMessage: "Follow up",
      agent: { name: "Agent", purpose: "Test", description: "", capabilities: [], configuration: {} } as any,
      history: [
        { role: "user", content: "First question" } as any,
        { role: "assistant", content: "First answer" } as any,
      ],
    });

    expect(result.providerBreakdown.conversation_history).toBeGreaterThanOrEqual(2);
  });
});

describe("agentRuntime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns failed when agent not found", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockInsert = vi.fn(() => ({ values: () => ({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }) }));
    const mockUpdate = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));

    vi.doMock("../db", () => ({
      requireDb: vi.fn().mockResolvedValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      }),
      writeAuditLog: vi.fn(),
    }));

    vi.doMock("./modelGateway", () => ({
      modelGatewayInvoke: vi.fn(),
    }));

    vi.doMock("./contextBuilder", () => ({
      createDefaultContextBuilder: () => ({
        build: vi.fn().mockResolvedValue({ messages: [], providerBreakdown: {} }),
      }),
      loadConversationHistory: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock("./toolRegistry", () => ({
      loadWorkspaceTools: vi.fn().mockResolvedValue([]),
      toolsToLLMFormat: vi.fn().mockReturnValue([]),
      executeToolCall: vi.fn(),
    }));

    vi.doMock("./conversationMemory", () => ({
      ConversationMemory: vi.fn().mockImplementation(() => ({
        summarizeConversation: vi.fn(),
        extractAndStoreFacts: vi.fn(),
      })),
    }));

    const { AgentRuntime } = await import("./agentRuntime");
    const runtime = new AgentRuntime();

    const result = await runtime.execute({
      workspaceId: 1,
      agentId: 999,
      userId: 1,
      message: "Hello",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Agent not found");
  });

  it("returns failed when conversation not found", async () => {
    let selectCallCount = 0;
    const mockAgent = { id: 1, workspaceId: 1, name: "Agent", purpose: "Test" };
    const mockLimit = vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return Promise.resolve([mockAgent]);
      return Promise.resolve([]);
    });
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockInsert = vi.fn(() => ({ values: () => ({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }) }));
    const mockUpdate = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));

    vi.doMock("../db", () => ({
      requireDb: vi.fn().mockResolvedValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      }),
      writeAuditLog: vi.fn(),
    }));

    vi.doMock("./modelGateway", () => ({
      modelGatewayInvoke: vi.fn(),
    }));

    vi.doMock("./contextBuilder", () => ({
      createDefaultContextBuilder: () => ({
        build: vi.fn().mockResolvedValue({ messages: [], providerBreakdown: {} }),
      }),
      loadConversationHistory: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock("./toolRegistry", () => ({
      loadWorkspaceTools: vi.fn().mockResolvedValue([]),
      toolsToLLMFormat: vi.fn().mockReturnValue([]),
      executeToolCall: vi.fn(),
    }));

    vi.doMock("./conversationMemory", () => ({
      ConversationMemory: vi.fn().mockImplementation(() => ({
        summarizeConversation: vi.fn(),
        extractAndStoreFacts: vi.fn(),
      })),
    }));

    const { AgentRuntime } = await import("./agentRuntime");
    const runtime = new AgentRuntime();

    const result = await runtime.execute({
      workspaceId: 1,
      agentId: 1,
      conversationId: 999,
      userId: 1,
      message: "Hello",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Conversation not found");
  });
});
