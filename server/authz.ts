import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getActiveMembership } from "./db";
import { protectedProcedure } from "./_core/trpc";

export const workspaceRoles = ["owner", "admin", "member", "viewer"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });

function unwrapSuperjson(rawInput: unknown): unknown {
  if (rawInput && typeof rawInput === "object" && "json" in rawInput) {
    return (rawInput as { json: unknown }).json;
  }
  return rawInput;
}

export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput();
  const unwrapped = unwrapSuperjson(rawInput);
  const parsed = workspaceInput.safeParse(unwrapped);
  if (!parsed.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A valid workspace is required." });
  }
  const membership = await getActiveMembership(parsed.data.workspaceId, ctx.user.id);
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this workspace." });
  }
  return next({
    ctx: { ...ctx, workspaceId: parsed.data.workspaceId, workspaceRole: membership.role },
  });
});

export function workspaceRoleProcedure(allowed: readonly WorkspaceRole[]) {
  return workspaceProcedure.use(async ({ ctx, next }) => {
    if (!allowed.includes(ctx.workspaceRole as WorkspaceRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Your workspace role cannot perform this action." });
    }
    return next({ ctx });
  });
}

export const workspaceMemberProcedure = workspaceRoleProcedure(["owner", "admin", "member"]);
export const workspaceManagerProcedure = workspaceRoleProcedure(["owner", "admin"]);
export const workspaceOwnerProcedure = workspaceRoleProcedure(["owner"]);
