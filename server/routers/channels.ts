import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { channels, agents } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { router } from "../_core/trpc";
import { sendChannelMessage } from "../_core/channelAdapter";
import { getChannelAdapter } from "../_core/channelAdapter";
import { getChannelById, mergeRegistryWithDb, searchChannels, CHANNEL_REGISTRY, type ChannelType } from "../_core/channelRegistry";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const channelTypeEnum = z.enum([
  "widget", "help_page", "center_stage", "messenger",
  "whatsapp", "instagram", "slack", "email", "sms", "voice",
  "api", "shopify", "zendesk", "salesforce", "wordpress", "zapier",
  "android-sdk", "ios-sdk",
]);

export const channelsRouter = router({
  /** List all channels merged with DB state */
  list: workspaceProcedure
    .input(workspaceInput.extend({ search: z.string().trim().max(200).optional() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const dbChannels = await db
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, ctx.workspaceId), isNull(channels.deletedAt)));

      let result = mergeRegistryWithDb(dbChannels);

      // Apply search filter
      if (input.search) {
        const q = input.search.toLowerCase().trim();
        result = result.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }

      return result;
    }),

  /** Get a single channel's full details */
  get: workspaceProcedure
    .input(workspaceInput.extend({ type: channelTypeEnum }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const def = getChannelById(input.type as ChannelType);
      if (!def) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown channel type." });

      const row = (await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.workspaceId, ctx.workspaceId),
            eq(channels.type, input.type),
          ),
        )
        .limit(1))[0];

      // Fetch agent info if agentId exists
      let agentInfo = null;
      const agentId = row?.agentId ?? ((row?.configuration as Record<string, unknown>)?.agentId as number);
      if (agentId) {
        const agent = (await db
          .select({ id: agents.id, name: agents.name, status: agents.status })
          .from(agents)
          .where(eq(agents.id, agentId))
          .limit(1))[0];
        agentInfo = agent ?? null;
      }

      return {
        definition: def,
        configured: !!row,
        config: row?.configuration as Record<string, unknown> ?? null,
        status: row?.status ?? "draft",
        channelDbId: row?.id ?? null,
        agentId: agentId ?? null,
        agent: agentInfo,
      };
    }),

  /** Get channel registry definition (for config fields, etc.) */
  registry: workspaceProcedure
    .input(workspaceInput.extend({ type: channelTypeEnum.optional() }))
    .query(async ({ input }) => {
      if (input.type) {
        const def = getChannelById(input.type as ChannelType);
        return def ?? null;
      }
      return CHANNEL_REGISTRY;
    }),

  /** Configure (create or update) a channel */
  configure: workspaceManagerProcedure
    .input(workspaceInput.extend({
      type: channelTypeEnum,
      name: z.string().trim().min(1).max(160).optional(),
      status: z.enum(["active", "draft", "disabled"]).optional(),
      configuration: z.record(z.string(), z.unknown()).optional(),
      agentId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Validate that channel type is known
      const def = getChannelById(input.type as ChannelType);
      if (!def) throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown channel type: ${input.type}` });

      // Cannot configure coming_soon channels
      if (def.status === "coming_soon") {
        throw new TRPCError({ code: "FORBIDDEN", message: `${def.name} is not yet available.` });
      }

      // Validate config if adapter exists
      if (input.configuration) {
        const adapter = getChannelAdapter(input.type as ChannelType);
        if (adapter && !adapter.validateConfig(input.configuration)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid configuration for ${def.name} channel`,
          });
        }
      }

      // Validate agentId exists if provided
      if (input.agentId) {
        const agent = (await db
          .select({ id: agents.id })
          .from(agents)
          .where(
            and(
              eq(agents.id, input.agentId),
              eq(agents.workspaceId, ctx.workspaceId),
              isNull(agents.deletedAt),
            ),
          )
          .limit(1))[0];
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found in this workspace." });
        }
      }

      const config = { ...(input.configuration ?? {}) };
      if (input.agentId) {
        config.agentId = input.agentId;
      }

      const existing = await db
        .select({ id: channels.id })
        .from(channels)
        .where(
          and(
            eq(channels.workspaceId, ctx.workspaceId),
            eq(channels.type, input.type),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(channels)
          .set({
            name: input.name,
            status: input.status,
            agentId: input.agentId ?? null,
            configuration: config,
            updatedAt: new Date(),
          })
          .where(eq(channels.id, existing[0].id));
      } else {
        await db.insert(channels).values({
          workspaceId: ctx.workspaceId,
          type: input.type as ChannelType,
          name: input.name ?? def.name,
          status: input.status ?? "active",
          agentId: input.agentId ?? null,
          configuration: config,
          createdById: ctx.user.id,
        });
      }

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "channel.configured",
        resourceType: "channel",
        metadata: { type: input.type, status: input.status, agentId: input.agentId },
      });

      return { success: true };
    }),

  /** Disable a channel */
  disable: workspaceManagerProcedure
    .input(workspaceInput.extend({ type: channelTypeEnum }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const def = getChannelById(input.type as ChannelType);
      if (!def) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown channel type." });

      const updated = await db
        .update(channels)
        .set({ status: "disabled", updatedAt: new Date() })
        .where(
          and(
            eq(channels.workspaceId, ctx.workspaceId),
            eq(channels.type, input.type),
          ),
        )
        .returning({ id: channels.id });

      if (updated.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Channel not configured in this workspace." });
      }

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "channel.disabled",
        resourceType: "channel",
        metadata: { type: input.type },
      });

      return { success: true };
    }),

  /** Get embed code for client-side channels */
  getEmbedCode: workspaceProcedure
    .input(workspaceInput.extend({ type: channelTypeEnum }))
    .query(async ({ ctx, input }) => {
      const def = getChannelById(input.type as ChannelType);
      if (!def || !def.isClientSide) return null;

      const db = await requireDb();
      const channel = (await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.workspaceId, ctx.workspaceId),
            eq(channels.type, input.type),
            eq(channels.status, "active"),
          ),
        )
        .limit(1))[0];

      if (!channel) return null;

      const config = (channel.configuration ?? {}) as Record<string, unknown>;

      // Generate real embed code based on channel type
      const origin = "https://sopranova-api.onrender.com";

      if (input.type === "widget") {
        return {
          embedCode: `<script src="${origin}/embed.js" data-workspace="${ctx.workspaceId}" data-channel="widget"></script>`,
          config,
          usage: `Paste this code before the closing </body> tag on your website.`,
        };
      }

      if (input.type === "help_page") {
        const helpUrl = `${origin}/help/${ctx.workspaceId}`;
        return {
          embedCode: `<iframe src="${helpUrl}" width="100%" height="600" frameborder="0" style="border-radius: 12px; border: 1px solid #e5e7eb;"></iframe>`,
          helpUrl,
          config,
          usage: `Embed this iframe on your help page, or share the URL directly.`,
        };
      }

      if (input.type === "center_stage") {
        return {
          embedCode: `<script src="${origin}/embed.js" data-workspace="${ctx.workspaceId}" data-channel="center_stage"></script>`,
          config,
          usage: `Paste this code before the closing </body> tag. The chat will open centered over your page.`,
        };
      }

      if (input.type === "api") {
        const agentId = channel.agentId ?? (config.agentId as number) ?? 1;
        return {
          endpoint: `${origin}/api/v1/agent/${agentId}/chat`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY",
          },
          body: { message: "Hello!", conversationId: "optional" },
          exampleCurl: `curl -X POST ${origin}/api/v1/agent/${agentId}/chat -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_API_KEY" -d '{"message":"Hello!"}'`,
          config,
          usage: `Use this REST endpoint with your API key to send messages to your agent.`,
        };
      }

      return { embedCode: null, config };
    }),

  /** Send outbound message through a channel */
  send: workspaceManagerProcedure
    .input(workspaceInput.extend({
      type: channelTypeEnum,
      recipientId: z.string().trim().min(1),
      content: z.string().trim().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const def = getChannelById(input.type as ChannelType);
      if (!def) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown channel type." });
      if (!def.actions.send) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Sending is not supported for ${def.name}.` });
      }

      return sendChannelMessage(ctx.workspaceId, {
        channelType: input.type as ChannelType,
        workspaceId: ctx.workspaceId,
        recipientId: input.recipientId,
        content: input.content,
        contentType: "text",
      });
    }),

  /** Get config schema for a channel type */
  configSchema: workspaceProcedure
    .input(workspaceInput.extend({ type: channelTypeEnum }))
    .query(async ({ input }) => {
      const def = getChannelById(input.type as ChannelType);
      if (!def) return { schema: [] };
      return { schema: def.configFields };
    }),

  /** Get list of agents in workspace for agent selection */
  agents: workspaceProcedure
    .input(workspaceInput)
    .query(async ({ ctx }) => {
      const db = await requireDb();
      return db
        .select({ id: agents.id, name: agents.name, status: agents.status })
        .from(agents)
        .where(and(eq(agents.workspaceId, ctx.workspaceId), isNull(agents.deletedAt)))
        .orderBy(agents.name);
    }),
});
