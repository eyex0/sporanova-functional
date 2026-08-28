import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { organizations, userPreferences, users, workspaces } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { bootstrapWorkspace, listWorkspaceMembers, listWorkspacesForUser, requireDb, writeAuditLog } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const workspaceIdInput = z.object({ workspaceId: z.number().int().positive() });

export const workspacesRouter = router({
  list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),

  bootstrap: protectedProcedure.mutation(async ({ ctx }) => {
    const workspacesForUser = await bootstrapWorkspace(ctx.user);
    return { workspaces: workspacesForUser, created: workspacesForUser.length === 1 };
  }),

  current: workspaceProcedure.input(workspaceIdInput).query(async ({ ctx }) => {
    const items = await listWorkspacesForUser(ctx.user.id);
    return items.find(item => item.workspace.id === ctx.workspaceId) ?? null;
  }),

  members: workspaceProcedure.input(workspaceIdInput).query(({ ctx }) => listWorkspaceMembers(ctx.workspaceId)),

  completeOnboarding: workspaceManagerProcedure
    .input(
      workspaceIdInput.extend({
        organizationName: z.string().trim().min(2).max(160),
        workspaceName: z.string().trim().min(2).max(160).optional(),
        companySize: z.string().trim().max(32).optional(),
        jobTitle: z.string().trim().max(160).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const workspace = (
        await db.select().from(workspaces).where(and(eq(workspaces.id, ctx.workspaceId), isNull(workspaces.deletedAt))).limit(1)
      )[0];
      if (!workspace) return null;
      await db.update(organizations).set({ name: input.organizationName, companySize: input.companySize ?? null }).where(eq(organizations.id, workspace.organizationId));
      await db.update(workspaces).set({ name: input.workspaceName ?? workspace.name }).where(eq(workspaces.id, ctx.workspaceId));
      if (input.jobTitle !== undefined) {
        await db.update(users).set({ jobTitle: input.jobTitle || null }).where(eq(users.id, ctx.user.id));
      }
      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workspace.onboarding_completed",
        resourceType: "workspace",
        resourceId: ctx.workspaceId,
      });
      return { success: true };
    }),

  update: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ name: z.string().trim().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(workspaces).set({ name: input.name }).where(eq(workspaces.id, ctx.workspaceId));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.updated", resourceType: "workspace", resourceId: ctx.workspaceId });
      return { success: true };
    }),
});

export const preferencesRouter = router({
  get: workspaceProcedure.input(workspaceIdInput).query(async ({ ctx }) => {
    const db = await requireDb();
    const profile = (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0] ?? null;
    const preferences = (
      await db
        .select()
        .from(userPreferences)
        .where(and(eq(userPreferences.userId, ctx.user.id), eq(userPreferences.workspaceId, ctx.workspaceId)))
        .limit(1)
    )[0] ?? null;
    return { profile, preferences };
  }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(160), jobTitle: z.string().trim().max(160).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(users).set({ name: input.name, jobTitle: input.jobTitle ?? null }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  update: workspaceProcedure
    .input(
      workspaceIdInput.extend({
        emailNotifications: z.boolean().optional(),
        slackNotifications: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
        agentNotifications: z.boolean().optional(),
        anomalyNotifications: z.boolean().optional(),
        reportNotifications: z.boolean().optional(),
        extendedContextWindow: z.boolean().optional(),
        citeSources: z.boolean().optional(),
        proactiveInsights: z.boolean().optional(),
        responseTone: z.enum(["concise", "professional", "detailed"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { workspaceId: _workspaceId, ...changes } = input;
      await db
        .insert(userPreferences)
        .values({ userId: ctx.user.id, workspaceId: ctx.workspaceId, ...changes })
        .onConflictDoUpdate({ target: [userPreferences.userId, userPreferences.workspaceId], set: changes });
      return { success: true };
    }),
});
