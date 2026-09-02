import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { campaigns, contacts } from "../../drizzle/schema";
import { workspaceManagerProcedure, workspaceMemberProcedure, workspaceProcedure } from "../authz";
import { requireDb, writeAuditLog } from "../db";
import { router } from "../_core/trpc";
import { sendEmail } from "../email";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

const listInput = workspaceInput.extend({
  search: z.string().trim().max(120).optional(),
  type: z.enum(["email", "sms", "scheduled", "automated"]).optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

const createInput = workspaceInput.extend({
  name: z.string().trim().min(1).max(160),
  type: z.enum(["email", "sms", "scheduled", "automated"]),
  subject: z.string().trim().max(255).optional(),
  body: z.string().trim().max(20000).optional(),
  recipientCount: z.number().int().nonnegative().default(0),
  scheduledAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInput = workspaceInput.extend({
  campaignId: z.number().int().positive(),
  name: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().max(255).nullable().optional(),
  body: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
  scheduledAt: z.date().nullable().optional(),
});

const idInput = workspaceInput.extend({ campaignId: z.number().int().positive() });

export const outboundRouter = router({
  listCampaigns: workspaceProcedure.input(listInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const where = and(
      eq(campaigns.workspaceId, ctx.workspaceId),
      isNull(campaigns.deletedAt),
      input.type ? eq(campaigns.type, input.type) : undefined,
      input.status ? eq(campaigns.status, input.status) : undefined,
      input.search ? sql`${campaigns.name} ILIKE ${`%${input.search}%`}` : undefined,
    );
    const [rows, [{ count } = { count: 0 }]] = await Promise.all([
      db.select().from(campaigns).where(where).orderBy(desc(campaigns.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(campaigns).where(where),
    ]);
    return { items: rows, total: Number(count), page: input.page, pageSize: input.pageSize };
  }),

  getCampaign: workspaceProcedure.input(idInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(campaigns).where(and(eq(campaigns.workspaceId, ctx.workspaceId), eq(campaigns.id, input.campaignId), isNull(campaigns.deletedAt)));
    return row ?? null;
  }),

  createCampaign: workspaceManagerProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.insert(campaigns).values({
      workspaceId: ctx.workspaceId,
      name: input.name,
      type: input.type,
      subject: input.subject ?? null,
      body: input.body ?? null,
      recipientCount: input.recipientCount,
      status: input.scheduledAt ? "scheduled" : "draft",
      scheduledAt: input.scheduledAt ?? null,
      metadata: input.metadata ?? {},
      createdById: ctx.user.id,
    }).returning();
    return row;
  }),

  updateCampaign: workspaceManagerProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const { campaignId, ...patch } = input;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) updateValues.name = patch.name;
    if (patch.subject !== undefined) updateValues.subject = patch.subject;
    if (patch.body !== undefined) updateValues.body = patch.body;
    if (patch.status !== undefined) updateValues.status = patch.status;
    if (patch.scheduledAt !== undefined) updateValues.scheduledAt = patch.scheduledAt;
    const [row] = await db.update(campaigns).set(updateValues).where(and(eq(campaigns.workspaceId, ctx.workspaceId), eq(campaigns.id, campaignId), isNull(campaigns.deletedAt))).returning();
    return row ?? null;
  }),

  sendCampaign: workspaceMemberProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.workspaceId, ctx.workspaceId), eq(campaigns.id, input.campaignId), isNull(campaigns.deletedAt)))
      .limit(1);

    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error(`Cannot send campaign in "${campaign.status}" status`);
    }

    // Set to sending
    await db.update(campaigns).set({ status: "sending", updatedAt: new Date() }).where(eq(campaigns.id, input.campaignId));

    // Get active contacts with emails
    const recipients = await db
      .select({ id: contacts.id, email: contacts.email, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, ctx.workspaceId), eq(contacts.status, "active"), sql`${contacts.email} IS NOT NULL`));

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of recipients) {
      if (!contact.email) continue;
      try {
        const personalizedBody = (campaign.body ?? "")
          .replace(/\{\{first_name\}\}/gi, contact.firstName ?? "")
          .replace(/\{\{last_name\}\}/gi, contact.lastName ?? "")
          .replace(/\{\{email\}\}/gi, contact.email);

        await sendEmail({
          to: contact.email,
          subject: campaign.subject ?? campaign.name,
          text: personalizedBody,
        });
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    // Update campaign with results
    await db
      .update(campaigns)
      .set({
        status: "sent",
        sentCount,
        deliveredCount: sentCount,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, input.campaignId));

    await writeAuditLog({
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.user.id,
      action: "campaign.sent",
      resourceType: "campaign",
      resourceId: input.campaignId,
      metadata: { sentCount, failedCount, totalRecipients: recipients.length },
    });

    return { campaignId: input.campaignId, sentCount, failedCount, totalRecipients: recipients.length };
  }),

  deleteCampaign: workspaceManagerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [row] = await db.update(campaigns).set({ deletedAt: new Date() }).where(and(eq(campaigns.workspaceId, ctx.workspaceId), eq(campaigns.id, input.campaignId), isNull(campaigns.deletedAt))).returning({ id: campaigns.id });
    return row ?? null;
  }),

  campaignStats: workspaceProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [totals] = await db.select({
      total: sql<number>`count(*)::int`,
      sent: sql<number>`coalesce(sum(${campaigns.sentCount}), 0)::int`,
      delivered: sql<number>`coalesce(sum(${campaigns.deliveredCount}), 0)::int`,
      opened: sql<number>`coalesce(sum(${campaigns.openedCount}), 0)::int`,
      clicked: sql<number>`coalesce(sum(${campaigns.clickedCount}), 0)::int`,
      recipients: sql<number>`coalesce(sum(${campaigns.recipientCount}), 0)::int`,
    }).from(campaigns).where(and(eq(campaigns.workspaceId, ctx.workspaceId), isNull(campaigns.deletedAt)));
    return {
      totalCampaigns: Number(totals?.total ?? 0),
      totalRecipients: Number(totals?.recipients ?? 0),
      totalSent: Number(totals?.sent ?? 0),
      totalDelivered: Number(totals?.delivered ?? 0),
      totalOpened: Number(totals?.opened ?? 0),
      totalClicked: Number(totals?.clicked ?? 0),
    };
  }),
});
