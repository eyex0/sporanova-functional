-- P0 Step 14: Enforce per-workspace email uniqueness for contacts.
-- Partial index allows multiple NULL emails (anonymous contacts) while
-- still rejecting duplicate email addresses within the same workspace.
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_workspace_email_unique"
  ON "contacts" USING btree ("workspaceId","email")
  WHERE "contacts"."email" IS NOT NULL;
