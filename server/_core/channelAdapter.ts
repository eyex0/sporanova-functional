import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { channels, conversations, messages, agents } from "../../drizzle/schema";
import { requireDb, writeAuditLog } from "../db";
import { AgentRuntime } from "./agentRuntime";
import { createTrace } from "./traceRecorder";

/* ───────────── Types ───────────── */

export type ChannelType =
  | "widget" | "help_page" | "center_stage" | "messenger"
  | "whatsapp" | "instagram" | "slack" | "email" | "sms" | "voice";

export interface InboundMessage {
  channelType: ChannelType;
  workspaceId: number;
  senderId: string;          // phone number, email, WhatsApp ID, etc.
  senderName?: string;
  content: string;
  contentType: "text" | "image" | "audio" | "file" | "video";
  channelMessageId?: string; // original message ID from provider
  metadata?: Record<string, unknown>;
  replyToId?: string;        // for threaded replies
}

export interface OutboundMessage {
  channelType: ChannelType;
  workspaceId: number;
  recipientId: string;       // phone, email, etc.
  content: string;
  contentType: "text" | "image" | "file";
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
  type: ChannelType;
  name: string;

  /** Validate channel configuration */
  validateConfig(config: Record<string, unknown>): boolean;

  /** Handle inbound webhook (returns response to send back, or null) */
  handleInbound(
    payload: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<InboundMessage | null>;

  /** Send outbound message */
  sendOutbound(
    message: OutboundMessage,
    config: Record<string, unknown>,
  ): Promise<{ success: boolean; channelMessageId?: string; error?: string }>;

  /** Get webhook verification response (for providers that require it) */
  verifyWebhook?(
    query: Record<string, string>,
    config: Record<string, unknown>,
  ): Promise<string | null>;
}

/* ───────────── Adapter Registry ───────────── */

const adapters = new Map<ChannelType, ChannelAdapter>();

export function registerChannelAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function getChannelAdapter(type: ChannelType): ChannelAdapter | undefined {
  return adapters.get(type);
}

/* ───────────── Message Processing ───────────── */

/** Find or create a conversation for a channel + sender */
async function findOrCreateConversation(
  workspaceId: number,
  channelType: ChannelType,
  senderId: string,
): Promise<number> {
  const db = await requireDb();

  // Find existing conversation for this workspace with a title matching this sender
  const titlePattern = `${channelType}:${senderId}`;
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.title, titlePattern),
      ),
    )
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  // Create new conversation
  const [conv] = await db.insert(conversations).values({
    workspaceId,
    title: titlePattern,
    createdById: 1, // system
  }).returning({ id: conversations.id });

  return conv.id;
}

/** Process an inbound channel message */
export async function processInboundMessage(
  workspaceId: number,
  message: InboundMessage,
): Promise<{
  conversationId: number;
  agentResponse: string;
  traceId: string;
}> {
  const db = await requireDb();
  const traceId = randomUUID();

  // Find active channel config
  const channel = (await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, message.channelType),
        eq(channels.status, "active"),
      ),
    )
    .limit(1))[0];

  if (!channel) {
    throw new Error(`Channel ${message.channelType} is not active in workspace ${workspaceId}`);
  }

  // Get agent ID from channel's agentId column, falling back to config
  const config = (channel.configuration ?? {}) as Record<string, unknown>;
  const agentId = channel.agentId ?? (config.agentId as number) ?? 1;

  // Find or create conversation
  const conversationId = await findOrCreateConversation(
    workspaceId,
    message.channelType,
    message.senderId,
  );

  // Save inbound message
  await db.insert(messages).values({
    conversationId,
    workspaceId,
    role: "user",
    kind: "question",
    content: message.content,
    metadata: {
      channelType: message.channelType,
      senderId: message.senderId,
      senderName: message.senderName,
      channelMessageId: message.channelMessageId,
      contentType: message.contentType,
      ...message.metadata,
    },
  });

  // Run agent
  const runtime = new AgentRuntime({ maxTokens: 2048 });
  const result = await runtime.execute({
    workspaceId,
    agentId,
    conversationId,
    userId: 0, // system
    message: message.content,
  });

  // Save assistant response
  await db.insert(messages).values({
    conversationId,
    workspaceId,
    role: "assistant",
    kind: "answer",
    content: result.response,
    metadata: {
      channelType: message.channelType,
      model: result.model,
      provider: result.provider,
      latencyMs: result.latencyMs,
    },
  });

  // Send outbound response through channel adapter
  const adapter = getChannelAdapter(message.channelType);
  if (adapter) {
    try {
      await adapter.sendOutbound(
        {
          channelType: message.channelType,
          workspaceId,
          recipientId: message.senderId,
          content: result.response,
          contentType: "text",
        },
        config,
      );
    } catch (err) {
      // Log but don't fail — response is already saved
      console.error(`Failed to send outbound via ${message.channelType}:`, err);
    }
  }

  await writeAuditLog({
    workspaceId,
    actorUserId: 0,
    action: "channel.message_processed",
    resourceType: "channel",
    resourceId: channel.id,
    metadata: {
      channelType: message.channelType,
      conversationId,
      senderId: message.senderId,
      traceId,
    },
  });

  return { conversationId, agentResponse: result.response, traceId };
}

/** Send an outbound message through a channel */
export async function sendChannelMessage(
  workspaceId: number,
  message: OutboundMessage,
): Promise<{ success: boolean; channelMessageId?: string; error?: string }> {
  const db = await requireDb();

  const channel = (await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, message.channelType),
        eq(channels.status, "active"),
      ),
    )
    .limit(1))[0];

  if (!channel) {
    return { success: false, error: `Channel ${message.channelType} is not active` };
  }

  const adapter = getChannelAdapter(message.channelType);
  if (!adapter) {
    return { success: false, error: `No adapter registered for ${message.channelType}` };
  }

  const config = (channel.configuration ?? {}) as Record<string, unknown>;
  return adapter.sendOutbound(message, config);
}

/** Handle an inbound webhook from a channel provider */
export async function handleChannelWebhook(
  channelType: ChannelType,
  workspaceId: number,
  payload: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const adapter = getChannelAdapter(channelType);
  if (!adapter) {
    return { status: 404, body: "Channel adapter not found" };
  }

  const db = await requireDb();
  const channel = (await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.workspaceId, workspaceId),
        eq(channels.type, channelType),
        eq(channels.status, "active"),
      ),
    )
    .limit(1))[0];

  if (!channel) {
    return { status: 404, body: "Channel not active" };
  }

  const config = (channel.configuration ?? {}) as Record<string, unknown>;

  // Verify webhook if adapter supports it
  if (adapter.verifyWebhook) {
    const verifyResult = await adapter.verifyWebhook(payload, config);
    if (verifyResult !== null) {
      return { status: 200, body: verifyResult };
    }
  }

  // Process inbound
  const message = await adapter.handleInbound(payload, config);
  if (!message) {
    return { status: 200, body: "OK" };
  }

  try {
    const result = await processInboundMessage(workspaceId, message);
    return { status: 200, body: result.agentResponse };
  } catch (err) {
    return { status: 500, body: String(err) };
  }
}
