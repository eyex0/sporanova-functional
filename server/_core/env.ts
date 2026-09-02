function getOptional(name: string) {
  return process.env[name]?.trim() || undefined;
}

export const ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  appUrl: getOptional("APP_URL") ?? "http://localhost:3000",
  appOrigin: getOptional("APP_ORIGIN") ?? "http://localhost:3000",
  databaseUrl: getOptional("DATABASE_URL"),
  sessionSecret: getOptional("SESSION_SECRET") ?? getOptional("JWT_SECRET") ?? "",
  sessionDays: Number(process.env.SESSION_DAYS ?? 14),
  ai: {
    provider: getOptional("AI_PROVIDER") ?? "openai-compatible",
    baseUrl: getOptional("AI_BASE_URL"),
    apiKey: getOptional("AI_API_KEY"),
    model: getOptional("AI_MODEL") ?? "gpt-4o-mini",
  },
  storage: {
    bucket: getOptional("S3_BUCKET"),
    region: getOptional("S3_REGION") ?? "us-east-1",
    endpoint: getOptional("S3_ENDPOINT"),
    accessKeyId: getOptional("S3_ACCESS_KEY_ID"),
    secretAccessKey: getOptional("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  },
  email: {
    provider: getOptional("EMAIL_PROVIDER") ?? "console",
    from: getOptional("EMAIL_FROM"),
    apiKey: getOptional("EMAIL_API_KEY"),
  },
  oauth: {
    googleClientId: getOptional("OAUTH_GOOGLE_CLIENT_ID"),
    googleClientSecret: getOptional("OAUTH_GOOGLE_CLIENT_SECRET"),
  },
};

/** Validate required environment variables at startup. Throws on missing critical vars. */
export function validateEnv(): void {
  const required = ["DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (ENV.isProduction) {
    const prodRequired = ["SESSION_SECRET", "AI_API_KEY"];
    const prodMissing = prodRequired.filter((key) => !process.env[key]?.trim());
    if (prodMissing.length > 0) {
      throw new Error(`Missing required production environment variables: ${prodMissing.join(", ")}`);
    }
  }
}
