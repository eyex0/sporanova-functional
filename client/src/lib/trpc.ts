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
  const body = input !== undefined ? superjson.serialize(input) : undefined;
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
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
  runNow: (input: Record<string, unknown>) => trpcMutate("workflows.runNow", input),
  runs: (input: Record<string, unknown>) => trpcFetch("workflows.runs", input),
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
  configure: (input: Record<string, unknown>) => trpcMutate("channels.configure", input),
  disable: (input: Record<string, unknown>) => trpcMutate("channels.disable", input),
  getEmbedCode: (input: Record<string, unknown>) => trpcFetch<{ embedCode: string }>("channels.getEmbedCode", input),
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
