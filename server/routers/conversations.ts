import { and, asc, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { conversations, dataSources, documents, messages, messageSources } from "../../drizzle/schema";
import { workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { ENV } from "../_core/env";
import { router } from "../_core/trpc";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((item): item is { type: "text"; text: string } => typeof item === "object" && item !== null && "type" in item && (item as { type?: unknown }).type === "text" && "text" in item && typeof (item as { text?: unknown }).text === "string")
      .map(item => item.text)
      .join("\n");
  }
  return "";
}

async function ensureConversation(workspaceId: number, conversationId: number) {
  const db = await requireDb();
  const conversation = (
    await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.workspaceId, workspaceId), isNull(conversations.deletedAt))).limit(1)
  )[0];
  if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found in this workspace." });
  return conversation;
}

export const conversationsRouter = router({
  list: workspaceProcedure.input(workspaceInput.extend({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const items = await db.select().from(conversations).where(and(eq(conversations.workspaceId, ctx.workspaceId), isNull(conversations.deletedAt))).orderBy(desc(conversations.lastMessageAt)).limit(input.limit + 1).offset(input.offset);
    const hasMore = items.length > input.limit;
    return { items: hasMore ? items.slice(0, input.limit) : items, hasMore };
  }),

  create: workspaceMemberProcedure.input(workspaceInput.extend({ title: z.string().trim().min(2).max(255).default("New conversation") })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(conversations).values({ workspaceId: ctx.workspaceId, title: input.title, createdById: ctx.user.id }).returning({ id: conversations.id });
    const id = row.id;
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "conversation.created", resourceType: "conversation", resourceId: id });
    return ensureConversation(ctx.workspaceId, id);
  }),

  rename: workspaceMemberProcedure.input(workspaceInput.extend({ conversationId: z.number().int().positive(), title: z.string().trim().min(2).max(255) })).mutation(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    await db.update(conversations).set({ title: input.title }).where(and(eq(conversations.id, input.conversationId), eq(conversations.workspaceId, ctx.workspaceId)));
    return { success: true };
  }),

  delete: workspaceMemberProcedure.input(workspaceInput.extend({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const conversation = await ensureConversation(ctx.workspaceId, input.conversationId);
    if (conversation.createdById !== ctx.user.id && !["owner", "admin"].includes(ctx.workspaceRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only the conversation owner or a manager can delete it." });
    }
    const db = await requireDb();
    await db.update(conversations).set({ deletedAt: new Date() }).where(eq(conversations.id, input.conversationId));
    await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "conversation.deleted", resourceType: "conversation", resourceId: input.conversationId });
    return { success: true };
  }),

  messages: workspaceProcedure.input(workspaceInput.extend({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    const messageList = await db.select().from(messages).where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.conversationId, input.conversationId))).orderBy(asc(messages.createdAt));
    if (messageList.length === 0) return [];
    const messageIds = messageList.map((message) => message.id);
    const sourceRows = await db.select().from(messageSources).where(and(eq(messageSources.workspaceId, ctx.workspaceId), inArray(messageSources.messageId, messageIds)));
    const sourcesByMessageId = new Map<number, typeof sourceRows>();
    for (const source of sourceRows) {
      const list = sourcesByMessageId.get(source.messageId);
      if (list) list.push(source);
      else sourcesByMessageId.set(source.messageId, [source]);
    }
    return messageList.map((message) => ({ ...message, sources: sourcesByMessageId.get(message.id) ?? [] }));
  }),

  search: workspaceProcedure.input(workspaceInput.extend({ query: z.string().trim().min(2).max(120), pageSize: z.number().int().min(1).max(30).default(10) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const phrase = `%${input.query}%`;
    return db
      .select({ message: messages, conversation: conversations })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(messages.workspaceId, ctx.workspaceId), isNull(conversations.deletedAt), or(like(messages.content, phrase), like(conversations.title, phrase))))
      .orderBy(desc(messages.createdAt))
      .limit(input.pageSize);
  }),
});

export const intelligenceRouter = router({
  ask: workspaceMemberProcedure.input(workspaceInput.extend({ conversationId: z.number().int().positive(), question: z.string().trim().min(3).max(4000) })).mutation(async ({ ctx, input }) => {
    await ensureConversation(ctx.workspaceId, input.conversationId);
    const db = await requireDb();
    const questionInsert = await db.insert(messages).values({ workspaceId: ctx.workspaceId, conversationId: input.conversationId, authorUserId: ctx.user.id, role: "user", kind: "question", content: input.question }).returning({ id: messages.id });
    const questionId = questionInsert[0].id;
    const [sourceRows, documentRows, history] = await Promise.all([
      db.select({ id: dataSources.id, name: dataSources.name, type: dataSources.type }).from(dataSources).where(and(eq(dataSources.workspaceId, ctx.workspaceId), eq(dataSources.status, "connected"), isNull(dataSources.deletedAt))).limit(8),
      db.select({ id: documents.id, name: documents.originalName }).from(documents).where(and(eq(documents.workspaceId, ctx.workspaceId), eq(documents.status, "ready"), isNull(documents.deletedAt))).limit(8),
      db.select().from(messages).where(and(eq(messages.workspaceId, ctx.workspaceId), eq(messages.conversationId, input.conversationId))).orderBy(desc(messages.createdAt)).limit(12),
    ]);
    const sourceNames = [...sourceRows.map(source => `${source.name} (${source.type})`), ...documentRows.map(document => document.name)];
    try {
      const configuredModel = ENV.ai.model;
      let model = configuredModel;
      if (configuredModel) {
        try {
          const catalog = await listLLMModels();
          const available = catalog.data.some((item) => item.id === configuredModel);
          if (!available) {
            console.warn(
              `[intelligence.ask] Configured model "${configuredModel}" not found in provider catalog. ` +
              `Available models sample: ${catalog.data.slice(0, 5).map((m) => m.id).join(", ")}...`,
            );
          }
        } catch (catalogError) {
          console.warn("[intelligence.ask] Could not fetch model catalog, falling back to configured model", catalogError);
        }
      }
      if (!model) {
        throw new TRPCError({
          code: "FAILED_PRECONDITION",
          message: "AI model is not configured. Set AI_MODEL in your environment.",
        });
      }
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: `You are SOPRANOVA Intelligence. Answer only from the conversation and source inventory provided. Do not claim to have inspected source contents that are not included. If evidence is insufficient, say what data is needed. Available workspace source inventory: ${sourceNames.length ? sourceNames.join(", ") : "none"}.` },
          ...history.reverse().map(message => ({ role: message.role === "assistant" ? "assistant" as const : "user" as const, content: message.content })),
        ],
        maxTokens: 1400,
      });
      const content = responseText(response.choices[0]?.message?.content) || "I could not produce a response.";
      const answerInsert = await db.insert(messages).values({ workspaceId: ctx.workspaceId, conversationId: input.conversationId, role: "assistant", kind: "insight", content }).returning({ id: messages.id });
      const answerId = answerInsert[0].id;
      const sourceValues = [
        ...sourceRows.map(source => ({ messageId: answerId, workspaceId: ctx.workspaceId, label: source.name, sourceType: "data_source" as const, sourceReference: String(source.id) })),
        ...documentRows.map(document => ({ messageId: answerId, workspaceId: ctx.workspaceId, label: document.name, sourceType: "document" as const, sourceReference: String(document.id) })),
      ];
      if (sourceValues.length) await db.insert(messageSources).values(sourceValues);
      await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, input.conversationId));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "intelligence.asked", resourceType: "conversation", resourceId: input.conversationId, metadata: { questionId, answerId } });
      return { id: answerId, content, kind: "insight" as const, sources: sourceValues.map(source => ({ label: source.label, sourceType: source.sourceType, sourceReference: source.sourceReference })) };
    } catch (error) {
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "intelligence.failed", resourceType: "conversation", resourceId: input.conversationId, metadata: { questionId } });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Intelligence could not answer this query. Please retry.", cause: error });
    }
  }),
});
