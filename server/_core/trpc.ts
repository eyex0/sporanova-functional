import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const isProd = ENV.isProduction;

function extractPgError(error: unknown): { code?: string; constraint?: string; detail?: string } {
  const candidates: unknown[] = [error];
  let current: unknown = error;
  while (candidates.length < 4 && current && typeof current === "object") {
    const obj = current as Record<string, unknown>;
    if (obj.cause) candidates.push(obj.cause);
    if (obj.errors && Array.isArray(obj.errors) && obj.errors[0]) candidates.push(obj.errors[0]);
    current = obj.cause ?? null;
  }
  for (const cand of candidates) {
    if (cand && typeof cand === "object") {
      const e = cand as Record<string, unknown>;
      if (typeof e.code === "string" || typeof e.constraint === "string") {
        return { code: e.code as string | undefined, constraint: e.constraint as string | undefined, detail: e.detail as string | undefined };
      }
    }
  }
  return {};
}

function scrubError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    if (error.cause) {
      const { code: pgCode, constraint: pgConstraint, detail } = extractPgError(error.cause);
      if (pgCode) return toTRPCFromPg(pgCode, pgConstraint, detail);
    }
    if (isProd) {
      return new TRPCError({ code: error.code, message: scrubMessage(error.message) });
    }
    return error;
  }
  if (error instanceof Error) {
    const { code: pgCode, constraint: pgConstraint, detail } = extractPgError(error);
    if (pgCode) return toTRPCFromPg(pgCode, pgConstraint, detail);
    if (isProd) {
      console.error("[trpc] Unhandled error:", error);
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred. Please try again." });
    }
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: scrubMessage(error.message), cause: error });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." });
}

function scrubMessage(message: string): string {
  if (message.includes("Failed query:") || message.includes("at ") || message.includes("params:")) {
    return "An unexpected error occurred. Please try again.";
  }
  return message;
}

function toTRPCFromPg(pgCode: string, pgConstraint?: string, detail?: string): TRPCError {
  if (pgCode === "23505") {
    const humanConstraint = pgConstraint
      ? pgConstraint.replace(/^(agents|contacts|data_sources|documents|workflows|leads|tickets|users|workspaces|channels|integrations|notifications|oauth_accounts)_/, "").replace(/_unique$/, "").replace(/_/g, " ")
      : null;
    return new TRPCError({
      code: "CONFLICT",
      message: humanConstraint
        ? `A record with this ${humanConstraint} already exists.`
        : (typeof detail === "string" ? `Duplicate value: ${detail}` : "A record with these unique values already exists."),
    });
  }
  if (pgCode === "23503") {
    return new TRPCError({ code: "BAD_REQUEST", message: "This operation references a record that does not exist." });
  }
  if (pgCode === "23502") {
    return new TRPCError({ code: "BAD_REQUEST", message: "A required field is missing." });
  }
  if (pgCode === "23514") {
    return new TRPCError({ code: "BAD_REQUEST", message: "The provided value violates a database constraint." });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "A database error occurred." });
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const leaksInternal = shape.data.code === "INTERNAL_SERVER_ERROR" && shape.message && (
      shape.message.includes("Failed query:") ||
      shape.message.includes("params:") ||
      shape.message.includes("at ")
    );
    const leaksStack = !isProd && shape.data.stack && shape.data.stack.includes("\n    at ");
    if (leaksInternal || leaksStack || isProd) {
      const safeMessage = leaksInternal
        ? "An unexpected error occurred. Please try again."
        : shape.message;
      const data: { code: string; httpStatus: number; stack?: string } = {
        code: shape.data.code,
        httpStatus: shape.data.httpStatus,
      };
      if (!isProd && !leaksInternal) data.stack = shape.data.stack;
      return {
        ...shape,
        message: safeMessage,
        data,
      };
    }
    return shape;
  },
});

export const router = t.router;

const requestLogging = t.middleware(async opts => {
  const startedAt = Date.now();
  try {
    const result = await opts.next();
    if (!result.ok) {
      const scrubbed = scrubError(result.error);
      const cause = (result.error as { cause?: unknown } | null)?.cause as Record<string, unknown> | null;
      const causeCause = (cause?.cause as Record<string, unknown> | null) ?? null;
      console.error(JSON.stringify({
        event: "trpc.request",
        path: opts.path,
        type: opts.type,
        userId: opts.ctx.user?.id ?? null,
        durationMs: Date.now() - startedAt,
        outcome: "error",
        code: scrubbed.code,
        errCode: (cause?.code as string | undefined) ?? null,
        causeConstraint: (cause?.constraint as string | undefined) ?? null,
        causeCauseCode: (causeCause?.code as string | undefined) ?? null,
      }));
      return { ok: false, error: scrubbed };
    }
    console.info(JSON.stringify({
      event: "trpc.request",
      path: opts.path,
      type: opts.type,
      userId: opts.ctx.user?.id ?? null,
      durationMs: Date.now() - startedAt,
      outcome: "success",
    }));
    return result;
  } catch (error) {
    const trpcError = error instanceof TRPCError ? error : null;
    const errAny = error as Record<string, unknown> | null;
    const cause = (errAny?.cause as Record<string, unknown> | null) ?? null;
    const causeCause = (cause?.cause as Record<string, unknown> | null) ?? null;
    console.error(JSON.stringify({
      event: "trpc.request",
      path: opts.path,
      type: opts.type,
      userId: opts.ctx.user?.id ?? null,
      durationMs: Date.now() - startedAt,
      outcome: "error",
      code: trpcError?.code ?? "INTERNAL_SERVER_ERROR",
      errName: (error as { name?: string } | null)?.name,
      errCode: (errAny?.code as string | undefined) ?? null,
      causeName: (cause?.name as string | undefined) ?? null,
      causeCode: (cause?.code as string | undefined) ?? null,
      causeConstraint: (cause?.constraint as string | undefined) ?? null,
      causeHasCause: !!causeCause,
      causeCauseCode: (causeCause?.code as string | undefined) ?? null,
    }));
    throw scrubError(error);
  }
});

export const publicProcedure = t.procedure.use(requestLogging);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
