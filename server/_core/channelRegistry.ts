import type { ChannelType } from "./channelAdapter";

/* ───────────── Channel Registry ───────────── */

export interface ChannelConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "textarea" | "toggle";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface ChannelDefinition {
  id: ChannelType;
  name: string;
  description: string;
  category: "featured" | "messaging" | "support" | "integration" | "development" | "ecommerce";
  icon: string;
  accent: string;
  /** Whether the channel has a real backend adapter */
  available: boolean;
  /** Whether the channel requires external provider credentials */
  requiresConnection: boolean;
  /** Whether the channel is a client-side embed (no server adapter needed) */
  isClientSide: boolean;
  /** Config fields for this channel */
  configFields: ChannelConfigField[];
  /** Supported actions */
  actions: {
    connect?: boolean;
    disconnect?: boolean;
    configure?: boolean;
    send?: boolean;
    test?: boolean;
  };
  /** Status: available, coming_soon, beta */
  status: "available" | "coming_soon" | "beta";
  /** Badge text (e.g., "Beta", "New") */
  badge?: string;
  /** Documentation URL if exists */
  docsUrl?: string;
}

/* ───────────── Registry Definition ───────────── */

export const CHANNEL_REGISTRY: ChannelDefinition[] = [
  // ─── Featured (Client-side embeds) ───
  {
    id: "widget",
    name: "Chat Bubble",
    description: "Add a chat bubble to your website and let your AI Agent chat with visitors in real-time.",
    category: "featured",
    icon: "MessageCircle",
    accent: "#3446df",
    available: true,
    requiresConnection: false,
    isClientSide: true,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true, description: "Select the agent for this channel" },
      { key: "widgetName", label: "Widget name", type: "text", placeholder: "Support Chat", description: "Display name in the widget header" },
      { key: "welcomeMessage", label: "Welcome message", type: "text", placeholder: "Hi! How can I help you today?", description: "First message shown to visitors" },
      { key: "placeholder", label: "Input placeholder", type: "text", placeholder: "Type your message...", description: "Text shown in the input field" },
      { key: "position", label: "Position", type: "select", options: [
        { label: "Bottom right", value: "bottom-right" },
        { label: "Bottom left", value: "bottom-left" },
      ]},
      { key: "primaryColor", label: "Primary color", type: "text", placeholder: "#3446df" },
      { key: "theme", label: "Theme", type: "select", options: [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ]},
      { key: "language", label: "Language", type: "select", options: [
        { label: "English", value: "en" },
        { label: "Italian", value: "it" },
        { label: "Spanish", value: "es" },
        { label: "French", value: "fr" },
        { label: "German", value: "de" },
      ]},
      { key: "suggestedQuestions", label: "Suggested questions (comma-separated)", type: "text", placeholder: "What are your pricing plans?, How do I get started?" },
    ],
    actions: { configure: true, send: true, test: true },
    status: "available",
  },
  {
    id: "help_page",
    name: "Help Page",
    description: "Host your own help page and let users chat directly from it with your AI Agent.",
    category: "featured",
    icon: "FileText",
    accent: "#6366f1",
    available: true,
    requiresConnection: false,
    isClientSide: true,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "pageTitle", label: "Page title", type: "text", placeholder: "Help Center" },
      { key: "description", label: "Description", type: "textarea", placeholder: "How can we help you?" },
      { key: "welcomeMessage", label: "Welcome message", type: "text", placeholder: "Welcome! Ask me anything." },
      { key: "suggestedPrompts", label: "Suggested prompts (comma-separated)", type: "text", placeholder: "Getting started, Account setup" },
      { key: "theme", label: "Theme", type: "select", options: [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ]},
    ],
    actions: { configure: true },
    status: "available",
  },
  {
    id: "center_stage",
    name: "Center Stage",
    description: "Open a full-focus chat that opens centered over your product, perfect for in-context help.",
    category: "featured",
    icon: "MonitorPlay",
    accent: "#059669",
    available: true,
    requiresConnection: false,
    isClientSide: true,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "welcomeMessage", label: "Welcome message", type: "text", placeholder: "How can I help you?" },
      { key: "trigger", label: "Trigger behavior", type: "select", options: [
        { label: "Button click", value: "button" },
        { label: "Auto-open after 5 seconds", value: "auto" },
      ]},
      { key: "primaryColor", label: "Primary color", type: "text", placeholder: "#059669" },
      { key: "position", label: "Position", type: "select", options: [
        { label: "Center", value: "center" },
        { label: "Bottom right", value: "bottom-right" },
        { label: "Bottom left", value: "bottom-left" },
      ]},
    ],
    actions: { configure: true },
    status: "available",
  },

  // ─── Messaging (Real adapters) ───
  {
    id: "email",
    name: "Email",
    description: "Connect your agent to an email address and let it auto-respond to customer emails via Resend.",
    category: "messaging",
    icon: "Mail",
    accent: "#3b82f6",
    available: true,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "resendApiKey", label: "Resend API Key", type: "password", required: true, placeholder: "re_..." },
      { key: "inboundDomain", label: "Inbound Domain", type: "text", required: true, placeholder: "reply.yourdomain.com" },
      { key: "fromAddress", label: "From Address", type: "text", placeholder: "support@yourdomain.com" },
    ],
    actions: { connect: true, disconnect: true, configure: true, send: true, test: true },
    status: "available",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect your agent to a WhatsApp Business number and let it respond to customers via the Cloud API.",
    category: "messaging",
    icon: "MessageSquare",
    accent: "#25d366",
    available: true,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", required: true, placeholder: "1234567890" },
      { key: "accessToken", label: "Access Token", type: "password", required: true, placeholder: "EAA..." },
      { key: "verifyToken", label: "Verify Token", type: "text", required: true, placeholder: "your-verify-token" },
    ],
    actions: { connect: true, disconnect: true, configure: true, send: true, test: true },
    status: "available",
  },
  {
    id: "sms",
    name: "SMS",
    description: "Send and receive text messages via Twilio. Your agent handles inbound SMS automatically.",
    category: "messaging",
    icon: "Smartphone",
    accent: "#f97316",
    available: true,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "twilioAccountSid", label: "Twilio Account SID", type: "text", required: true, placeholder: "AC..." },
      { key: "twilioAuthToken", label: "Twilio Auth Token", type: "password", required: true },
      { key: "twilioPhoneNumber", label: "Twilio Phone Number", type: "text", required: true, placeholder: "+1234567890" },
    ],
    actions: { connect: true, disconnect: true, configure: true, send: true, test: true },
    status: "available",
  },

  // ─── Coming Soon (No backend yet) ───
  {
    id: "messenger",
    name: "Messenger",
    description: "Connect your agent to a Facebook page and let it respond to Messenger conversations.",
    category: "messaging",
    icon: "MessageCircle",
    accent: "#0084ff",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "pageId", label: "Facebook Page ID", type: "text", required: true, placeholder: "123456789" },
      { key: "accessToken", label: "Page Access Token", type: "password", required: true, placeholder: "EAA..." },
    ],
    actions: {},
    status: "coming_soon",
    docsUrl: "https://developers.facebook.com/docs/messenger-platform",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Reply to Instagram DMs from your agent. Requires Instagram Business account.",
    category: "messaging",
    icon: "Instagram",
    accent: "#e1306c",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "igBusinessId", label: "Instagram Business Account ID", type: "text", required: true },
      { key: "accessToken", label: "Access Token", type: "password", required: true },
    ],
    actions: {},
    status: "coming_soon",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect your agent to Slack channels. Mention the bot and it replies to any message.",
    category: "integration",
    icon: "Hash",
    accent: "#4a154b",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "xoxb-..." },
      { key: "signingSecret", label: "Signing Secret", type: "password", required: true },
    ],
    actions: {},
    status: "coming_soon",
    docsUrl: "https://api.slack.com/apis",
  },
  {
    id: "voice",
    name: "Voice",
    description: "Voice calls via Twilio/Vonage. Let your agent handle phone conversations.",
    category: "messaging",
    icon: "Phone",
    accent: "#8b5cf6",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "provider", label: "Telephony provider", type: "select", options: [
        { label: "Twilio", value: "twilio" },
        { label: "Vonage", value: "vonage" },
      ]},
      { key: "accountSid", label: "Account SID", type: "text", placeholder: "AC..." },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "phoneNumber", label: "Phone number", type: "text", placeholder: "+1234567890" },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect your agent to Shopify and let it respond to customer messages.",
    category: "ecommerce",
    icon: "ShoppingBag",
    accent: "#96bf48",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "shopDomain", label: "Shop Domain", type: "text", required: true, placeholder: "your-store.myshopify.com" },
      { key: "accessToken", label: "Access Token", type: "password", required: true },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Let your AI Agent draft suggestions or auto-reply to Zendesk tickets.",
    category: "support",
    icon: "LifeBuoy",
    accent: "#03363d",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "subdomain", label: "Subdomain", type: "text", required: true, placeholder: "yourcompany" },
      { key: "apiToken", label: "API Token", type: "password", required: true },
      { key: "email", label: "Agent email", type: "text", required: true, placeholder: "agent@yourcompany.com" },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Let your AI Agent draft suggestions or auto-reply to Salesforce cases.",
    category: "support",
    icon: "Cloud",
    accent: "#00a1e0",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "instanceUrl", label: "Instance URL", type: "text", required: true, placeholder: "https://yourcompany.salesforce.com" },
      { key: "accessToken", label: "Access Token", type: "password", required: true },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Use the official SOPRANOVA plugin for WordPress to add the chat bubble to your website.",
    category: "integration",
    icon: "Globe",
    accent: "#21759b",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "siteUrl", label: "WordPress site URL", type: "text", required: true, placeholder: "https://yourdomain.com" },
      { key: "apiKey", label: "Plugin API key", type: "password", required: true },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect your agent with thousands of apps using Zapier webhooks.",
    category: "integration",
    icon: "Zap",
    accent: "#ff4a00",
    available: false,
    requiresConnection: true,
    isClientSide: false,
    configFields: [
      { key: "webhookUrl", label: "Zapier webhook URL", type: "text", required: true, placeholder: "https://hooks.zapier.com/..." },
    ],
    actions: {},
    status: "coming_soon",
  },

  // ─── Development ───
  {
    id: "api",
    name: "API",
    description: "Integrate your agent directly with your applications using our REST API.",
    category: "development",
    icon: "Code",
    accent: "#6366f1",
    available: true,
    requiresConnection: false,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
    ],
    actions: { configure: true, send: true },
    status: "available",
  },
  {
    id: "android-sdk",
    name: "Android SDK",
    description: "Integrate your AI agent into Android apps using the SOPRANOVA SDK.",
    category: "development",
    icon: "Smartphone",
    accent: "#3ddc84",
    available: false,
    requiresConnection: false,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "packageName", label: "Package name", type: "text", required: true, placeholder: "com.yourcompany.app" },
    ],
    actions: {},
    status: "coming_soon",
  },
  {
    id: "ios-sdk",
    name: "iOS SDK",
    description: "Integrate your AI agent into iOS apps using the SOPRANOVA SDK.",
    category: "development",
    icon: "Smartphone",
    accent: "#007aff",
    available: false,
    requiresConnection: false,
    isClientSide: false,
    configFields: [
      { key: "agentId", label: "Agent", type: "select", required: true },
      { key: "bundleId", label: "Bundle ID", type: "text", required: true, placeholder: "com.yourcompany.app" },
    ],
    actions: {},
    status: "coming_soon",
  },
];

/* ───────────── Registry Helpers ───────────── */

export function getChannelById(id: ChannelType): ChannelDefinition | undefined {
  return CHANNEL_REGISTRY.find(c => c.id === id);
}

export function getChannelsByCategory(category: ChannelDefinition["category"]): ChannelDefinition[] {
  return CHANNEL_REGISTRY.filter(c => c.category === category);
}

export function getAvailableChannels(): ChannelDefinition[] {
  return CHANNEL_REGISTRY.filter(c => c.status === "available");
}

export function searchChannels(query: string): ChannelDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return CHANNEL_REGISTRY;
  return CHANNEL_REGISTRY.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q)
  );
}

/** Merge registry definitions with DB state for the list response */
export function mergeRegistryWithDb(
  dbChannels: Array<{
    type: string;
    status: string;
    configuration?: Record<string, unknown> | null;
    id: number;
    agentId?: number | null;
  }>,
): Array<ChannelDefinition & {
  configured: boolean;
  config: Record<string, unknown> | null;
  channelStatus: string;
  channelDbId: number | null;
  agentId: number | null;
}> {
  const dbByType = new Map(dbChannels.map(c => [c.type, c]));

  return CHANNEL_REGISTRY.map(def => {
    const dbRow = dbByType.get(def.id);
    const config = (dbRow?.configuration ?? {}) as Record<string, unknown>;
    return {
      ...def,
      configured: !!dbRow,
      config: dbRow?.configuration as Record<string, unknown> ?? null,
      channelStatus: dbRow?.status ?? "draft",
      channelDbId: dbRow?.id ?? null,
      agentId: dbRow?.agentId ?? (config.agentId as number) ?? null,
    };
  });
}
