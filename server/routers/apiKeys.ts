import { z } from "zod";
import { router } from "../_core/trpc";
import { createApiKey, listApiKeys, revokeApiKey } from "../_core/apiKeys";
import { writeAuditLog } from "../db";
import { workspaceProcedure, workspaceManagerProcedure } from "../authz";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

export const apiKeysRouter = router({
  list: workspaceProcedure.input(workspaceInput).query(async ({ ctx }) => {
    return listApiKeys(ctx.workspaceId);
  }),

  create: workspaceManagerProcedure
    .input(
      workspaceInput.extend({
        name: z.string().min(1).max(120),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        rateLimit: z.number().int().min(1).max(10000).optional(),
        scopes: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createApiKey(
        ctx.workspaceId,
        ctx.user.id,
        input.name,
        input.scopes,
        input.expiresInDays,
        input.rateLimit,
      );

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: String(result.id),
        metadata: { name: input.name, keyPrefix: result.keyPrefix },
      });

      return result;
    }),

  revoke: workspaceManagerProcedure
    .input(workspaceInput.extend({ keyId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const success = await revokeApiKey(input.keyId, ctx.workspaceId);
      if (!success) {
        throw new Error("API key not found");
      }

      await writeAuditLog({
        workspaceId: ctx.workspaceId,
        actorUserId: ctx.user.id,
        action: "api_key.revoked",
        resourceType: "api_key",
        resourceId: String(input.keyId),
      });

      return { success: true };
    }),
});
