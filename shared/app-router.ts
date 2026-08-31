/* Standalone AppRouter type definition for the frontend.
   This mirrors the server's AppRouter shape without importing server code.
   Keep in sync with server/routers.ts when adding new procedures. */

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  jobTitle: string | null;
  avatarUrl: string | null;
  loginMethod: string | null;
  authProvider: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type Agent = {
  id: number;
  workspaceId: number;
  name: string;
  purpose: string;
  description: string | null;
  capabilities: string[];
  status: "active" | "idle" | "paused" | "error";
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date | null;
  deletedAt: Date | null;
};

export type Conversation = {
  id: number;
  workspaceId: number;
  title: string;
  createdById: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Message = {
  id: number;
  workspaceId: number;
  conversationId: number;
  authorUserId: number | null;
  role: "user" | "assistant" | "system";
  kind: string;
  content: string;
  createdAt: Date;
  sources?: MessageSource[];
};

export type MessageSource = {
  id: number;
  messageId: number;
  workspaceId: number;
  label: string;
  sourceType: string;
  sourceReference: string;
};

export type AgentRun = {
  id: number;
  workspaceId: number;
  agentId: number;
  status: string;
  triggerType: string;
  progress: number;
  input: unknown;
  output: unknown;
  error: string | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type DashboardOverview = {
  range: string;
  kpis: {
    revenue: number;
    activeAgents: number;
    dataSources: number;
    insightsToday: number;
  };
  revenueSeries: Array<{ date: Date; value: number }>;
  activeAgents: Agent[];
  signals: Array<{
    id: number;
    title: string;
    status: string;
    priority: string | null;
    createdAt: Date;
  }>;
  activity: Array<{
    id: number;
    action: string;
    createdAt: Date;
  }>;
};

/* The AppRouter type mirrors the server router structure.
   Only includes the procedures the frontend actually uses. */
export type AppRouter = {
  system: {
    health: { query: () => unknown };
  };
  auth: {
    me: { query: () => User | null };
    register: {
      mutate: (input: {
        email: string;
        password: string;
        name: string;
        organizationName?: string;
      }) => Promise<User>;
    };
    login: {
      mutate: (input: { email: string; password: string }) => Promise<User>;
    };
    logout: { mutate: () => Promise<{ success: true }> };
    requestPasswordReset: {
      mutate: (input: { email: string }) => Promise<{ accepted: true }>;
    };
    resetPassword: {
      mutate: (input: {
        token: string;
        password: string;
      }) => Promise<unknown>;
    };
  };
  workspaces: Record<string, unknown>;
  preferences: Record<string, unknown>;
  dashboard: {
    overview: {
      query: (input: {
        workspaceId: number;
        range?: "7D" | "30D" | "90D" | "1Y";
      }) => Promise<DashboardOverview>;
    };
    runSummary: {
      query: (input: {
        workspaceId: number;
        limit?: number;
      }) => Promise<AgentRun[]>;
    };
  };
  conversations: {
    list: {
      query: (input: { workspaceId: number }) => Promise<Conversation[]>;
    };
    create: {
      mutate: (input: {
        workspaceId: number;
        title?: string;
      }) => Promise<Conversation>;
    };
    rename: {
      mutate: (input: {
        workspaceId: number;
        conversationId: number;
        title: string;
      }) => Promise<{ success: true }>;
    };
    delete: {
      mutate: (input: {
        workspaceId: number;
        conversationId: number;
      }) => Promise<{ success: true }>;
    };
    messages: {
      query: (input: {
        workspaceId: number;
        conversationId: number;
      }) => Promise<Message[]>;
    };
    search: {
      query: (input: {
        workspaceId: number;
        query: string;
        pageSize?: number;
      }) => Promise<
        Array<{ message: Message; conversation: Conversation }>
      >;
    };
  };
  intelligence: {
    ask: {
      mutate: (input: {
        workspaceId: number;
        conversationId: number;
        question: string;
      }) => Promise<{
        id: number;
        content: string;
        kind: string;
        sources: Array<{
          label: string;
          sourceType: string;
          sourceReference: string;
        }>;
      }>;
    };
  };
  agents: {
    list: {
      query: (input: {
        workspaceId: number;
        status?: "active" | "idle" | "paused" | "error";
      }) => Promise<Agent[]>;
    };
    get: {
      query: (input: {
        workspaceId: number;
        agentId: number;
      }) => Promise<Agent>;
    };
    create: {
      mutate: (input: {
        workspaceId: number;
        name: string;
        purpose: string;
        description?: string;
        capabilities?: string[];
      }) => Promise<Agent>;
    };
    setStatus: {
      mutate: (input: {
        workspaceId: number;
        agentId: number;
        status: "active" | "idle" | "paused";
      }) => Promise<{ success: true }>;
    };
    runs: {
      query: (input: {
        workspaceId: number;
        agentId: number;
        pageSize?: number;
      }) => Promise<AgentRun[]>;
    };
    runNow: {
      mutate: (input: {
        workspaceId: number;
        agentId: number;
        instruction: string;
      }) => Promise<{ id: number; status: string; content: string }>;
    };
  };
  dataSources: Record<string, unknown>;
  documents: Record<string, unknown>;
  memory: Record<string, unknown>;
  analytics: Record<string, unknown>;
  workflows: Record<string, unknown>;
  notifications: Record<string, unknown>;
  audit: Record<string, unknown>;
  contacts: Record<string, unknown>;
  leads: Record<string, unknown>;
  helpdesk: Record<string, unknown>;
  channels: Record<string, unknown>;
  outbound: Record<string, unknown>;
};
