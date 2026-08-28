import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const client = postgres(url, { prepare: false });
  const email = "founder@sopranova.test";
  const password = "SOPRANOVA-Demo-2026";
  const name = "Montaser";

  const existing = await client`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log("User already exists, skipping creation");
    await client.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await client`
    INSERT INTO users ("openId", name, email, "passwordHash", "loginMethod", "authProvider", role, "lastSignedIn", "createdAt", "updatedAt")
    VALUES (${`smoke-${Date.now()}`}, ${name}, ${email}, ${passwordHash}, 'credentials', 'credentials', 'user', NOW(), NOW(), NOW())
    RETURNING id, email, name
  `;
  console.log("Created user:", user);

  const suffix = Math.random().toString(36).substring(2, 8);
  const [org] = await client`
    INSERT INTO organizations (name, slug, "createdById", "createdAt", "updatedAt")
    VALUES (${`${name}'s Organization`}, ${`smoke-${suffix}`}, ${user.id}, NOW(), NOW())
    RETURNING id
  `;
  const [workspace] = await client`
    INSERT INTO workspaces ("organizationId", name, slug, "isDefault", "createdById", "createdAt", "updatedAt")
    VALUES (${org.id}, 'Main workspace', 'main', true, ${user.id}, NOW(), NOW())
    RETURNING id
  `;
  await client`
    INSERT INTO memberships ("workspaceId", "userId", role, "isActive", "createdAt", "updatedAt")
    VALUES (${workspace.id}, ${user.id}, 'owner', true, NOW(), NOW())
  `;
  await client`
    INSERT INTO user_preferences ("userId", "workspaceId", "emailNotifications", "weeklyDigest", "agentNotifications", "anomalyNotifications", "extendedContextWindow", "citeSources", "responseTone", "createdAt", "updatedAt")
    VALUES (${user.id}, ${workspace.id}, true, true, true, true, true, true, 'professional', NOW(), NOW())
  `;
  console.log("Bootstrapped workspace:", workspace.id);

  const result = await client`
    SELECT u.email, w.name as workspace, m.role
    FROM users u
    JOIN memberships m ON m."userId" = u.id
    JOIN workspaces w ON w.id = m."workspaceId"
    WHERE u.id = ${user.id}
  `;
  console.log("Verified:", result);

  await client.end();
  console.log("\nSmoke test PASSED. Login credentials:");
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});
