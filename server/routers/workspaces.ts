import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { agents, memberships, organizations, userPreferences, users, workspaces } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceProcedure } from "../authz";
import { bootstrapWorkspace, listWorkspaceMembers, listWorkspacesForUser, requireDb, writeAuditLog } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const workspaceIdInput = z.object({ workspaceId: z.number().int().positive() });

export const workspacesRouter = router({
  list: protectedProcedure.query(({ ctx }) => listWorkspacesForUser(ctx.user.id)),

  bootstrap: protectedProcedure.mutation(async ({ ctx }) => {
    const workspacesForUser = await bootstrapWorkspace(ctx.user);
    return {
      workspaces: workspacesForUser,
      created: workspacesForUser.length === 1,
    };
  }),

  current: workspaceProcedure.input(workspaceIdInput).query(async ({ ctx }) => {
    const items = await listWorkspacesForUser(ctx.user.id);
    return items.find(item => item.workspace.id === ctx.workspaceId) ?? null;
  }),

  members: workspaceProcedure.input(workspaceIdInput).query(({ ctx }) => listWorkspaceMembers(ctx.workspaceId)),

  invite: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ email: z.string().trim().email().max(320), role: z.enum(["admin", "member", "viewer"]).default("member") }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      let targetUser = (await db.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
      if (!targetUser) {
        const openId = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const created = await db.insert(users).values({ openId, email: input.email, name: input.email.split("@")[0], loginMethod: "invited", authProvider: "invited" }).returning();
        targetUser = created[0];
      }
      const existing = (await db.select().from(memberships).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, targetUser.id))).limit(1))[0];
      if (existing) {
        if (existing.isActive) throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this workspace." });
        await db.update(memberships).set({ isActive: true, role: input.role, updatedAt: new Date() }).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, targetUser.id)));
      } else {
        await db.insert(memberships).values({ workspaceId: ctx.workspaceId, userId: targetUser.id, role: input.role });
      }
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.member_invited", resourceType: "membership", resourceId: targetUser.id, metadata: { email: input.email, role: input.role } });
      return { success: true, userId: targetUser.id };
    }),

  updateRole: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ userId: z.number().int().positive(), role: z.enum(["owner", "admin", "member", "viewer"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own role." });
      const db = await requireDb();
      const member = (await db.select().from(memberships).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, input.userId), eq(memberships.isActive, true))).limit(1))[0];
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      if (member.role === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner role." });
      await db.update(memberships).set({ role: input.role, updatedAt: new Date() }).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, input.userId)));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.member_role_changed", resourceType: "membership", resourceId: input.userId, metadata: { role: input.role } });
      return { success: true };
    }),

  remove: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself." });
      const db = await requireDb();
      const member = (await db.select().from(memberships).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, input.userId), eq(memberships.isActive, true))).limit(1))[0];
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      if (member.role === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the workspace owner." });
      await db.update(memberships).set({ isActive: false, updatedAt: new Date() }).where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(memberships.userId, input.userId)));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.member_removed", resourceType: "membership", resourceId: input.userId });
      return { success: true };
    }),

  completeOnboarding: workspaceManagerProcedure
    .input(
      workspaceIdInput.extend({
        organizationName: z.string().trim().min(2).max(160),
        workspaceName: z.string().trim().min(2).max(160).optional(),
        companySize: z.string().trim().max(32).optional(),
        jobTitle: z.string().trim().max(160).optional(),
        agentName: z.string().trim().min(2).max(160).optional(),
        agentPersonality: z.string().trim().max(8000).optional(),
        deploymentChannels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        techStack: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
        referralSource: z.string().trim().max(120).optional(),
        plan: z.string().trim().max(60).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[completeOnboarding] userId:", ctx.user.id, "workspaceId:", ctx.workspaceId, "input:", JSON.stringify(input).substring(0, 200));
      const db = await requireDb();
      const workspace = (
        await db.select().from(workspaces).where(and(eq(workspaces.id, ctx.workspaceId), isNull(workspaces.deletedAt))).limit(1)
      )[0];
      if (!workspace) { console.log("[completeOnboarding] workspace not found!"); return null; }
      await db.update(organizations).set({ name: input.organizationName, companySize: input.companySize ?? null }).where(eq(organizations.id, workspace.organizationId));
      await db.update(workspaces).set({
        name: input.workspaceName ?? workspace.name,
        onboardingCompleted: true,
        onboardingStep: 6,
        onboardingData: {
          agentName: input.agentName ?? null,
          agentPersonality: input.agentPersonality ?? null,
          deploymentChannels: input.deploymentChannels ?? [],
          techStack: input.techStack ?? [],
          referralSource: input.referralSource ?? null,
          plan: input.plan ?? "free",
          completedAt: new Date().toISOString(),
        },
      }).where(eq(workspaces.id, ctx.workspaceId));
      if (input.jobTitle !== undefined) {
        await db.update(users).set({ jobTitle: input.jobTitle || null }).where(eq(users.id, ctx.user.id));
      }
      let createdAgentId: number | null = null;
      const agentName = input.agentName?.trim() || "SOPRANOVA";
      const purpose = input.agentPersonality?.trim() || "Answer customer questions clearly and concisely. Stay polite and professional. Escalate billing or account issues to a human agent when unsure.";
      const capabilities = input.deploymentChannels?.length ? input.deploymentChannels : ["chat"];
      const existingAgent = (await db.select().from(agents).where(and(eq(agents.workspaceId, ctx.workspaceId), eq(agents.name, agentName), isNull(agents.deletedAt))).limit(1))[0];
      if (!existingAgent) {
        const created = await db.insert(agents).values({
          workspaceId: ctx.workspaceId,
          name: agentName,
          purpose,
          description: purpose.length > 240 ? purpose.slice(0, 240) : purpose,
          capabilities,
          status: "idle",
          createdById: ctx.user.id,
        }).returning({ id: agents.id });
        createdAgentId = created[0].id;
      } else {
        createdAgentId = existingAgent.id;
      }
      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "workspace.onboarding_completed",
        resourceType: "workspace",
        resourceId: ctx.workspaceId,
        metadata: {
          agentName,
          plan: input.plan ?? "free",
          channels: input.deploymentChannels ?? [],
          techStack: input.techStack ?? [],
        },
      });
      return { success: true, agentId: createdAgentId };
    }),

  update: workspaceManagerProcedure
    .input(workspaceIdInput.extend({ name: z.string().trim().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(workspaces).set({ name: input.name }).where(eq(workspaces.id, ctx.workspaceId));
      await writeAuditLog({ workspaceId: ctx.workspaceId, actorUserId: ctx.user.id, action: "workspace.updated", resourceType: "workspace", resourceId: ctx.workspaceId });
      return { success: true };
    }),

  getOnboarding: workspaceProcedure.input(workspaceIdInput).query(async ({ ctx }) => {
    const db = await requireDb();
    const workspace = (
      await db.select().from(workspaces).where(and(eq(workspaces.id, ctx.workspaceId), isNull(workspaces.deletedAt))).limit(1)
    )[0];
    if (!workspace) return null;
    return {
      completed: workspace.onboardingCompleted,
      step: workspace.onboardingStep,
      data: workspace.onboardingData ?? {},
    };
  }),

  saveOnboardingStep: workspaceProcedure
    .input(
      workspaceIdInput.extend({
        step: z.number().int().min(0).max(10),
        data: z.record(z.string(), z.unknown()).optional(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const update: Record<string, unknown> = { onboardingStep: input.step };
      if (input.data !== undefined) update.onboardingData = input.data;
      if (input.completed !== undefined) update.onboardingCompleted = input.completed;
      await db.update(workspaces).set(update).where(eq(workspaces.id, ctx.workspaceId));
      if (input.completed) {
        await writeAuditLog({
          workspaceId: ctx.workspaceId,
          actorUserId: ctx.user.id,
          action: "workspace.onboarding_completed",
          resourceType: "workspace",
          resourceId: ctx.workspaceId,
          metadata: input.data ?? {},
        });
      }
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
