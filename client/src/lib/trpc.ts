import superjson from "superjson";

const API_URL = import.meta.env.VITE_API_URL || "";

function buildUrl(path: string, input?: unknown) {
  const base = `/api/trpc/${path}`;
  if (input !== undefined) {
    const serialized = superjson.serialize(input);
    const qs = new URLSearchParams({ input: JSON.stringify(serialized) });
    return `${API_URL}${base}?${qs}`;
  }
  return `${API_URL}${base}`;
}

function deserialize<T>(raw: unknown): T {
  return superjson.deserialize(raw as Parameters<typeof superjson.deserialize>[0]) as T;
}

async function trpcFetch<T>(path: string, input?: unknown): Promise<T> {
  const url = buildUrl(path, input);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  const json = await res.json();
  return deserialize<T>(json.result?.data ?? json);
}

async function trpcMutate<T>(path: string, input?: unknown): Promise<T> {
  const url = `${API_URL}/api/trpc/${path}`;
  const serialized = input !== undefined ? superjson.serialize(input) : { json: {} };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(serialized),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  const json = await res.json();
  return deserialize<T>(json.result?.data ?? json);
}

/* ===== Auth ===== */
export const authApi = {
  me: () => trpcFetch<Record<string, unknown> | null>("auth.me"),
  login: (input: { email: string; password: string }) =>
    trpcMutate<Record<string, unknown>>("auth.login", input),
  register: (input: { name: string; email: string; password: string; organizationName?: string }) =>
    trpcMutate<Record<string, unknown>>("auth.register", input),
  logout: () => trpcMutate<{ success: boolean }>("auth.logout"),
};

/* ===== Workspaces ===== */
export const workspacesApi = {
  list: () => trpcFetch("workspaces.list"),
  bootstrap: () => trpcMutate("workspaces.bootstrap"),
  current: (input: Record<string, unknown>) => trpcFetch("workspaces.current", input),
  members: (input: Record<string, unknown>) => trpcFetch("workspaces.members", input),
  update: (input: Record<string, unknown>) => trpcMutate("workspaces.update", input),
  getOnboarding: (input: Record<string, unknown>) => trpcFetch("workspaces.getOnboarding", input),
  saveOnboardingStep: (input: Record<string, unknown>) => trpcMutate("workspaces.saveOnboardingStep", input),
  completeOnboarding: (input: Record<string, unknown>) => trpcMutate("workspaces.completeOnboarding", input),
};

/* ===== Members ===== */
export const membersApi = {
  invite: (input: Record<string, unknown>) => trpcMutate("workspaces.invite", input),
  updateRole: (input: Record<string, unknown>) => trpcMutate("workspaces.updateRole", input),
  remove: (input: Record<string, unknown>) => trpcMutate("workspaces.remove", input),
};

/* ===== Dashboard ===== */
export const dashboardApi = {
  overview: (input: Record<string, unknown>) => trpcFetch("dashboard.overview", input),
  runSummary: (input: Record<string, unknown>) => trpcFetch("dashboard.runSummary", input),
};

/* ===== Agents ===== */
export const agentsApi = {
  list: (input: Record<string, unknown>) => trpcFetch<{ items: any[] } | any[]>("agents.list", input),
  get: (input: Record<string, unknown>) => trpcFetch("agents.get", input),
  create: (input: Record<string, unknown>) => trpcMutate("agents.create", input),
  update: (input: Record<string, unknown>) => trpcMutate("agents.update", input),
  setStatus: (input: Record<string, unknown>) => trpcMutate("agents.setStatus", input),
  delete: (input: Record<string, unknown>) => trpcMutate("agents.delete", input),
  runs: (input: Record<string, unknown>) => trpcFetch("agents.runs", input),
  runNow: (input: Record<string, unknown>) => trpcMutate("agents.runNow", input),
  chat: (input: Record<string, unknown>) => trpcMutate("agents.chat", input),
  chatStream: async function* (input: {
    workspaceId: number;
    agentId: number;
    conversationId: number;
    message: string;
  }) {
    const res = await fetch("/api/agents/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Stream failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) yield parsed.content;
          } catch {}
        }
      }
    }
  },
};

/* ===== Conversations ===== */
export const conversationsApi = {
  list: (input: Record<string, unknown>) => trpcFetch("conversations.list", input),
  create: (input: Record<string, unknown>) => trpcMutate("conversations.create", input),
  rename: (input: Record<string, unknown>) => trpcMutate("conversations.rename", input),
  delete: (input: Record<string, unknown>) => trpcMutate("conversations.delete", input),
  messages: (input: Record<string, unknown>) => trpcFetch("conversations.messages", input),
  search: (input: Record<string, unknown>) => trpcFetch("conversations.search", input),
};

/* ===== Intelligence ===== */
export const intelligenceApi = {
  ask: (input: Record<string, unknown>) => trpcMutate("intelligence.ask", input),
};

/* ===== Data Sources ===== */
export const dataSourcesApi = {
  list: (input: Record<string, unknown>) => trpcFetch("dataSources.list", input),
  create: (input: Record<string, unknown>) => trpcMutate("dataSources.create", input),
  configureHttp: (input: Record<string, unknown>) => trpcMutate("dataSources.configureHttp", input),
  sync: (input: Record<string, unknown>) => trpcMutate("dataSources.sync", input),
  disconnect: (input: Record<string, unknown>) => trpcMutate("dataSources.disconnect", input),
  delete: (input: Record<string, unknown>) => trpcMutate("dataSources.delete", input),
};

/* ===== Documents ===== */
export const documentsApi = {
  list: (input: Record<string, unknown>) => trpcFetch("documents.list", input),
  upload: (input: Record<string, unknown>) => trpcMutate("documents.upload", input),
  accessUrl: (input: Record<string, unknown>) => trpcFetch("documents.accessUrl", input),
  delete: (input: Record<string, unknown>) => trpcMutate("documents.delete", input),
};

/* ===== Memory ===== */
export const memoryApi = {
  summary: (input: Record<string, unknown>) => trpcFetch("memory.summary", input),
};

/* ===== Analytics ===== */
export const analyticsApi = {
  overview: (input: Record<string, unknown>) => trpcFetch("analytics.overview", input),
  segments: (input: Record<string, unknown>) => trpcFetch("analytics.segments", input),
  topics: (input: Record<string, unknown>) => trpcFetch("analytics.topics", input),
  sentiment: (input: Record<string, unknown>) => trpcFetch("analytics.sentiment", input),
  trends: (input: Record<string, unknown>) => trpcFetch("analytics.trends", input),
};

/* ===== Workflows ===== */
export const workflowsApi = {
  list: (input: Record<string, unknown>) => trpcFetch("workflows.list", input),
  get: (input: Record<string, unknown>) => trpcFetch("workflows.get", input),
  create: (input: Record<string, unknown>) => trpcMutate("workflows.create", input),
  update: (input: Record<string, unknown>) => trpcMutate("workflows.update", input),
  updateNodes: (input: Record<string, unknown>) => trpcMutate("workflows.updateNodes", input),
  runNow: (input: Record<string, unknown>) => trpcMutate("workflows.runNow", input),
  enqueueRun: (input: Record<string, unknown>) => trpcMutate("workflows.enqueueRun", input),
  runs: (input: Record<string, unknown>) => trpcFetch("workflows.runs", input),
  runDetail: (input: Record<string, unknown>) => trpcFetch("workflows.runDetail", input),
  snapshot: (input: Record<string, unknown>) => trpcMutate("workflows.snapshot", input),
  // V2: Approvals
  approvals: (input: Record<string, unknown>) => trpcFetch("workflows.approvals", input),
  approveStep: (input: Record<string, unknown>) => trpcMutate("workflows.approveStep", input),
  // V2: Resume
  resumeRun: (input: Record<string, unknown>) => trpcMutate("workflows.resumeRun", input),
  // V2: Deployments
  deploy: (input: Record<string, unknown>) => trpcMutate("workflows.deploy", input),
  deployments: (input: Record<string, unknown>) => trpcFetch("workflows.deployments", input),
  // V2: Versions
  versions: (input: Record<string, unknown>) => trpcFetch("workflows.versions", input),
  // V2: Validate
  validate: (input: Record<string, unknown>) => trpcFetch("workflows.validate", input),
};

/* ===== Notifications ===== */
export const notificationsApi = {
  list: (input: Record<string, unknown>) => trpcFetch("notifications.list", input),
  markRead: (input: Record<string, unknown>) => trpcMutate("notifications.markRead", input),
  markAllRead: (input: Record<string, unknown>) => trpcMutate("notifications.markAllRead", input),
};

/* ===== Audit ===== */
export const auditApi = {
  list: (input: Record<string, unknown>) => trpcFetch("audit.list", input),
};

/* ===== Preferences ===== */
export const preferencesApi = {
  get: (input: Record<string, unknown>) => trpcFetch("preferences.get", input),
  updateProfile: (input: Record<string, unknown>) => trpcMutate("preferences.updateProfile", input),
  update: (input: Record<string, unknown>) => trpcMutate("preferences.update", input),
};

/* ===== Contacts ===== */
export const contactsApi = {
  list: (input: Record<string, unknown>) => trpcFetch<{ items: any[]; total: number; page: number; pageSize: number }>("contacts.list", input),
  get: (input: Record<string, unknown>) => trpcFetch("contacts.get", input),
  create: (input: Record<string, unknown>) => trpcMutate("contacts.create", input),
  update: (input: Record<string, unknown>) => trpcMutate("contacts.update", input),
  delete: (input: Record<string, unknown>) => trpcMutate("contacts.delete", input),
  import: (input: Record<string, unknown>) => trpcMutate<{ imported: number }>("contacts.import", input),
  export: (input: Record<string, unknown>) => trpcFetch<{ csv: string; count: number }>("contacts.export", input),
};

/* ===== Leads ===== */
export const leadsApi = {
  list: (input: Record<string, unknown>) => trpcFetch<{ items: any[]; total: number; page: number; pageSize: number }>("leads.list", input),
  get: (input: Record<string, unknown>) => trpcFetch("leads.get", input),
  create: (input: Record<string, unknown>) => trpcMutate("leads.create", input),
  update: (input: Record<string, unknown>) => trpcMutate("leads.update", input),
  delete: (input: Record<string, unknown>) => trpcMutate("leads.delete", input),
  convert: (input: Record<string, unknown>) => trpcMutate<{ contactId: number }>("leads.convert", input),
  export: (input: Record<string, unknown>) => trpcFetch<{ csv: string; count: number }>("leads.export", input),
};

/* ===== Helpdesk ===== */
export const helpdeskApi = {
  listTickets: (input: Record<string, unknown>) => trpcFetch<{ items: any[]; total: number; page: number; pageSize: number }>("helpdesk.listTickets", input),
  getTicket: (input: Record<string, unknown>) => trpcFetch("helpdesk.getTicket", input),
  listMessages: (input: Record<string, unknown>) => trpcFetch<any[]>("helpdesk.listMessages", input),
  createTicket: (input: Record<string, unknown>) => trpcMutate("helpdesk.createTicket", input),
  updateTicket: (input: Record<string, unknown>) => trpcMutate("helpdesk.updateTicket", input),
  addMessage: (input: Record<string, unknown>) => trpcMutate("helpdesk.addMessage", input),
  deleteTicket: (input: Record<string, unknown>) => trpcMutate("helpdesk.deleteTicket", input),
  listInboxes: (input: Record<string, unknown>) => trpcFetch<{ inboxes: { key: string; label: string; count: number }[] }>("helpdesk.listInboxes", input),
};

/* ===== Channels ===== */
export const channelsApi = {
  list: (input: Record<string, unknown>) => trpcFetch<any[]>("channels.list", input),
  get: (input: Record<string, unknown>) => trpcFetch<any>("channels.get", input),
  configure: (input: Record<string, unknown>) => trpcMutate<{ success: boolean }>("channels.configure", input),
  disable: (input: Record<string, unknown>) => trpcMutate<{ success: boolean }>("channels.disable", input),
  getEmbedCode: (input: Record<string, unknown>) => trpcFetch<{ embedCode: string | null; config: Record<string, unknown> } | null>("channels.getEmbedCode", input),
  send: (input: Record<string, unknown>) => trpcMutate("channels.send", input),
  configSchema: (input: Record<string, unknown>) => trpcFetch<{ schema: Array<{ key: string; label: string; type: string; required?: boolean; placeholder?: string; options?: Array<{ label: string; value: string }> }> }>("channels.configSchema", input),
  registry: (input: Record<string, unknown>) => trpcFetch<any>("channels.registry", input),
  agents: (input: Record<string, unknown>) => trpcFetch<Array<{ id: number; name: string; status: string }>>("channels.agents", input),
};

/* ===== Outbound ===== */
export const outboundApi = {
  listCampaigns: (input: Record<string, unknown>) => trpcFetch<{ items: any[]; total: number; page: number; pageSize: number }>("outbound.listCampaigns", input),
  getCampaign: (input: Record<string, unknown>) => trpcFetch("outbound.getCampaign", input),
  createCampaign: (input: Record<string, unknown>) => trpcMutate("outbound.createCampaign", input),
  updateCampaign: (input: Record<string, unknown>) => trpcMutate("outbound.updateCampaign", input),
  sendCampaign: (input: Record<string, unknown>) => trpcMutate("outbound.sendCampaign", input),
  deleteCampaign: (input: Record<string, unknown>) => trpcMutate("outbound.deleteCampaign", input),
  campaignStats: (input: Record<string, unknown>) => trpcFetch("outbound.campaignStats", input),
};

/* ===== Tools ===== */
export const toolsApi = {
  list: (input: Record<string, unknown>) => trpcFetch("tools.list", input),
  get: (input: Record<string, unknown>) => trpcFetch("tools.get", input),
  create: (input: Record<string, unknown>) => trpcMutate("tools.create", input),
  update: (input: Record<string, unknown>) => trpcMutate("tools.update", input),
  delete: (input: Record<string, unknown>) => trpcMutate("tools.delete", input),
  executions: (input: Record<string, unknown>) => trpcFetch("tools.executions", input),
};

/* ===== Observability ===== */
export const observabilityApi = {
  traces: (input: Record<string, unknown>) => trpcFetch("observability.traces", input),
  traceDetail: (input: Record<string, unknown>) => trpcFetch("observability.traceDetail", input),
  agentStats: (input: Record<string, unknown>) => trpcFetch("observability.agentStats", input),
  costs: (input: Record<string, unknown>) => trpcFetch("observability.costs", input),
  performance: (input: Record<string, unknown>) => trpcFetch("observability.performance", input),
  datasets: (input: Record<string, unknown>) => trpcFetch("observability.datasets", input),
  datasetDetail: (input: Record<string, unknown>) => trpcFetch("observability.datasetDetail", input),
  createDataset: (input: Record<string, unknown>) => trpcMutate("observability.createDataset", input),
  addTestCase: (input: Record<string, unknown>) => trpcMutate("observability.addTestCase", input),
  runEval: (input: Record<string, unknown>) => trpcMutate("observability.runEval", input),
  evalRuns: (input: Record<string, unknown>) => trpcFetch("observability.evalRuns", input),
  evalRunDetail: (input: Record<string, unknown>) => trpcFetch("observability.evalRunDetail", input),
};

/* ===== API Keys ===== */
export const apiKeysApi = {
  list: () => trpcFetch<Array<{ id: number; name: string; keyPrefix: string; scopes: string[]; rateLimit: number; expiresAt: string | null; lastUsedAt: string | null; isActive: boolean; createdAt: string }>>("apiKeys.list", {}),
  create: (input: Record<string, unknown>) => trpcMutate<{ id: number; key: string; keyPrefix: string }>("apiKeys.create", input),
  revoke: (input: Record<string, unknown>) => trpcMutate<{ success: boolean }>("apiKeys.revoke", input),
};
