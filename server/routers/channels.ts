import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { channels } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { requireDb } from "../db";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const DEFAULT_CHANNELS: Array<{ type: "widget" | "help_page" | "center_stage" | "messenger" | "whatsapp" | "instagram" | "slack" | "email" | "sms" | "voice"; name: string; available: boolean; description: string; }> = [
  { type: "widget", name: "Chat bubble", available: true, description: "Embed a chat bubble on your website." },
  { type: "help_page", name: "Help page", available: true, description: "Public help center with articles and AI search." },
  { type: "center_stage", name: "Center stage", available: true, description: "Full-screen conversational experience inside your product." },
  { type: "messenger", name: "Messenger", available: false, description: "Connect your Facebook Messenger account." },
  { type: "whatsapp", name: "WhatsApp", available: false, description: "Reach customers on WhatsApp Business." },
  { type: "instagram", name: "Instagram", available: false, description: "Reply to Instagram DMs from your agent." },
  { type: "slack", name: "Slack", available: true, description: "Use your agent inside Slack channels." },
  { type: "email", name: "Email", available: true, description: "Auto-respond to inbound support emails." },
];

function buildEmbedCode(workspaceId: number, type: string): string {
  const origin = process.env.APP_URL || process.env.APP_ORIGIN || "https://sopranova-api.onrender.com";
  return `<!-- SOPRANOVA ${type} embed -->\n<script async src="${origin}/embed.js" data-workspace="${workspaceId}" data-channel="${type}"></script>`;
}

export const channelsRouter = router({
  list: workspaceProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const rows = await db.select().from(channels).where(eq(channels.workspaceId, ctx.workspaceId)).orderBy(desc(channels.createdAt));
    const byType = new Map(rows.map(r => [r.type, r]));
    return DEFAULT_CHANNELS.map(def => {
      const existing = byType.get(def.type);
      return {
        type: def.type,
        name: def.name,
        description: def.description,
        available: def.available,
        status: existing?.status ?? "draft",
        id: existing?.id ?? null,
        embedCode: existing?.embedCode ?? (def.available ? buildEmbedCode(ctx.workspaceId, def.type) : null),
        configuration: existing?.configuration ?? {},
        createdAt: existing?.createdAt ?? null,
      };
    });
  }),

  configure: workspaceManagerProcedure.input(workspaceInput.extend({
    type: z.enum(["widget", "help_page", "center_stage", "messenger", "whatsapp", "instagram", "slack", "email", "sms", "voice"]),
    status: z.enum(["active", "draft", "disabled"]).default("draft"),
    name: z.string().trim().max(160).optional(),
    configuration: z.record(z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [existing] = await db.select().from(channels).where(and(eq(channels.workspaceId, ctx.workspaceId), eq(channels.type, input.type)));
    const embedCode = buildEmbedCode(ctx.workspaceId, input.type);
    if (existing) {
      const [row] = await db.update(channels).set({
        status: input.status,
        name: input.name ?? existing.name,
        configuration: input.configuration ?? existing.configuration,
        embedCode,
        updatedAt: new Date(),
      }).where(eq(channels.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(channels).values({
      workspaceId: ctx.workspaceId,
      type: input.type,
      name: input.name ?? DEFAULT_CHANNELS.find(d => d.type === input.type)?.name ?? input.type,
      status: input.status,
      configuration: input.configuration ?? {},
      embedCode,
      createdById: ctx.user.id,
    }).returning();
    return row;
  }),

  disable: workspaceManagerProcedure.input(workspaceInput.extend({ type: z.enum(["widget", "help_page", "center_stage", "messenger", "whatsapp", "instagram", "slack", "email", "sms", "voice"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.update(channels).set({ status: "disabled", updatedAt: new Date() }).where(and(eq(channels.workspaceId, ctx.workspaceId), eq(channels.type, input.type))).returning();
    return row ?? null;
  }),

  getEmbedCode: workspaceProcedure.input(workspaceInput.extend({ type: z.enum(["widget", "help_page", "center_stage", "messenger", "whatsapp", "instagram", "slack", "email", "sms", "voice"]) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.select({ embedCode: channels.embedCode }).from(channels).where(and(eq(channels.workspaceId, ctx.workspaceId), eq(channels.type, input.type)));
    return { embedCode: row?.embedCode ?? buildEmbedCode(ctx.workspaceId, input.type) };
  }),
});

export default undefined;
