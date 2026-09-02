const BASE = "http://localhost:3000/api/trpc";
let pass = 0;
let fail = 0;
const cookies = [];

// Known query procedures (GET) — mutations (POST)
const QUERIES = new Set([
  "system.health",
  "auth.me",
  "workspaces.list",
  "workspaces.members",
  "dashboard.overview",
  "conversations.list",
  "conversations.messages",
  "agents.list",
  "dataSources.list",
  "documents.list",
  "workflows.list",
  "analytics.overview",
  "analytics.topics",
  "analytics.sentiment",
  "contacts.list",
  "leads.list",
  "helpdesk.listTickets",
  "channels.list",
  "notifications.list",
  "audit.list",
  "outbound.listCampaigns",
  "preferences.get",
  "workspaces.getOnboarding",
  "workspaces.current",
]);

function log(emoji, label, ok, detail) {
  if (ok) { pass++; console.log(`${emoji} ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.log(`${emoji} ${label} — FAIL${detail ? `: ${String(detail).slice(0, 200)}` : ""}`); }
}

async function trpc(path, body) {
  const isQuery = QUERIES.has(path);
  const method = isQuery ? "GET" : "POST";
  const headers = { "x-trpc-source": "e2e-test" };
  if (cookies.length) headers.Cookie = cookies.join("; ");
  const init = { method, headers };
  // Both GET and POST need superjson-wrapped input: {json: {...}}
  if (isQuery) {
    const wrapped = body ? { json: body } : {};
    const inputStr = encodeURIComponent(JSON.stringify(wrapped));
    const res = await fetch(`${BASE}/${path}?input=${inputStr}`, init);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookies.push(setCookie.split(";")[0]);
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } else {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
    const res = await fetch(`${BASE}/${path}`, init);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookies.push(setCookie.split(";")[0]);
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
}

function unwrap(json, ...keys) {
  let cur = json;
  for (const k of keys) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}

async function main() {
  console.log("\n===== SOPRANOVA LOCAL E2E TEST =====\n");

  console.log("--- Health ---");
  const h = await trpc("system.health");
  const hOk = h.status === 200 && unwrap(h.body, "result", "data", "json", "ok") === true;
  log("✓", "system.health", hOk);

  console.log("\n--- Auth ---");
  const login = await trpc("auth.login", { json: { email: "admin@haier.it", password: "H41er_D3mo!2026" } });
  const userId = unwrap(login.body, "result", "data", "json", "id");
  log("✓", "auth.login", login.status === 200 && !!userId, `userId=${userId}`);

  const me = await trpc("auth.me");
  const meId = unwrap(me.body, "result", "data", "json", "id");
  log("✓", "auth.me", me.status === 200 && !!meId, `userId=${meId}`);

  const ws = await trpc("workspaces.list");
  const wsArr = unwrap(ws.body, "result", "data", "json");
  const wid = Array.isArray(wsArr) ? wsArr[0]?.workspace?.id : null;
  log("✓", "workspaces.list", !!wid, `workspaceId=${wid}`);

  console.log("\n--- Dashboard ---");
  const overview = await trpc("dashboard.overview", { workspaceId: wid });
  const ovJson = unwrap(overview.body, "result", "data", "json");
  log("✓", "dashboard.overview", overview.status === 200 && ovJson !== undefined, `keys=${ovJson ? Object.keys(ovJson).join(",") : "?"}`);

  console.log("\n--- Conversations ---");
  const convList = await trpc("conversations.list", { workspaceId: wid, limit: 10, offset: 0 });
  const convListData = unwrap(convList.body, "result", "data", "json");
  log("✓", "conversations.list (paginated)", convList.status === 200 && convListData?.items !== undefined, `items=${convListData?.items?.length}, hasMore=${convListData?.hasMore}`);

  const newConv = await trpc("conversations.create", { json: { workspaceId: wid, title: "E2E Test Conversation" } });
  const convId = unwrap(newConv.body, "result", "data", "json", "id");
  log("✓", "conversations.create", newConv.status === 200 && !!convId, `id=${convId}`);

  if (convId) {
    const ask = await trpc("intelligence.ask", { json: { workspaceId: wid, conversationId: convId, question: "Hello, can you hear me?" } });
    const askJson = unwrap(ask.body, "result", "data", "json");
    log("✓", "intelligence.ask", ask.status === 200 && !!askJson?.content, `reply="${(askJson?.content ?? "").slice(0, 80)}..."`);

    const msgs = await trpc("conversations.messages", { workspaceId: wid, conversationId: convId });
    const msgsArr = unwrap(msgs.body, "result", "data", "json");
    log("✓", "conversations.messages", msgs.status === 200, `messages=${Array.isArray(msgsArr) ? msgsArr.length : "?"}`);

    const del = await trpc("conversations.delete", { json: { workspaceId: wid, conversationId: convId } });
    log("✓", "conversations.delete", del.status === 200 || del.status === 204, `status=${del.status}`);
  }

  console.log("\n--- Agents ---");
  const agents = await trpc("agents.list", { workspaceId: wid });
  const agentList = unwrap(agents.body, "result", "data", "json");
  log("✓", "agents.list", agents.status === 200, `count=${Array.isArray(agentList) ? agentList.length : "?"}`);

  if (Array.isArray(agentList) && agentList.length > 0) {
    const run = await trpc("agents.runNow", { json: { workspaceId: wid, agentId: agentList[0].id, instruction: "Test instruction from E2E" } });
    const runData = unwrap(run.body, "result", "data", "json");
    log("✓", "agents.runNow (queues job)", run.status === 200, `runId=${runData?.id}, status=${runData?.status}`);
  }

  console.log("\n--- Data Sources ---");
  const dsList = await trpc("dataSources.list", { workspaceId: wid });
  const dsArr = unwrap(dsList.body, "result", "data", "json");
  log("✓", "dataSources.list", dsList.status === 200, `count=${dsArr?.length}`);

  const dsNew = await trpc("dataSources.create", { json: { workspaceId: wid, name: `E2E Test Source ${Date.now()}`, type: "API" } });
  const dsId = unwrap(dsNew.body, "result", "data", "json", "id");
  log("✓", "dataSources.create", dsNew.status === 200 && !!dsId, `id=${dsId} status=${dsNew.status}`);

  if (dsId) {
    const dsConfigure = await trpc("dataSources.configureHttp", { json: { workspaceId: wid, dataSourceId: dsId, connection: { endpoint: "https://jsonplaceholder.typicode.com/users", headers: { "User-Agent": "sopranova-e2e" } } } });
    log("✓", "dataSources.configureHttp", dsConfigure.status === 200 || dsConfigure.status === 204, `status=${dsConfigure.status}`);

    const dsDel = await trpc("dataSources.delete", { json: { workspaceId: wid, dataSourceId: dsId } });
    log("✓", "dataSources.delete", dsDel.status === 200 || dsDel.status === 204, `status=${dsDel.status}`);
  }

  console.log("\n--- Documents ---");
  const docList = await trpc("documents.list", { workspaceId: wid });
  const docArr = unwrap(docList.body, "result", "data", "json");
  log("✓", "documents.list", docList.status === 200, `count=${docArr?.length}`);

  console.log("\n--- Workflows ---");
  const wfList = await trpc("workflows.list", { workspaceId: wid });
  const wfArr = unwrap(wfList.body, "result", "data", "json");
  log("✓", "workflows.list", wfList.status === 200, `count=${wfArr?.length}`);

  console.log("\n--- Analytics ---");
  const anOverview = await trpc("analytics.overview", { workspaceId: wid });
  log("✓", "analytics.overview", anOverview.status === 200);

  const anTopics = await trpc("analytics.topics", { workspaceId: wid });
  log("✓", "analytics.topics", anTopics.status === 200);

  const anSent = await trpc("analytics.sentiment", { workspaceId: wid });
  log("✓", "analytics.sentiment", anSent.status === 200);

  console.log("\n--- Contacts ---");
  const contacts = await trpc("contacts.list", { workspaceId: wid });
  const cData = unwrap(contacts.body, "result", "data", "json");
  const cArr = cData?.items ?? cData;
  log("✓", "contacts.list", contacts.status === 200, `count=${cArr?.length}, total=${cData?.total}`);

  console.log("\n--- Leads ---");
  const leads = await trpc("leads.list", { workspaceId: wid });
  const lData = unwrap(leads.body, "result", "data", "json");
  const lArr = lData?.items ?? lData;
  log("✓", "leads.list", leads.status === 200, `count=${lArr?.length}, total=${lData?.total}`);

  console.log("\n--- Helpdesk ---");
  const hd = await trpc("helpdesk.listTickets", { workspaceId: wid });
  const hdData = unwrap(hd.body, "result", "data", "json");
  const hdArr = hdData?.items ?? hdData;
  log("✓", "helpdesk.listTickets", hd.status === 200, `count=${hdArr?.length}`);

  console.log("\n--- Channels ---");
  const channels = await trpc("channels.list", { workspaceId: wid });
  const chArr = unwrap(channels.body, "result", "data", "json");
  const embedCode = chArr?.[0]?.embedCode;
  log("✓", "channels.list", channels.status === 200, `embedCode: ${(embedCode ?? "").slice(0, 80)}...`);

  console.log("\n--- Notifications ---");
  const notifs = await trpc("notifications.list", { workspaceId: wid, limit: 5 });
  const nArr = unwrap(notifs.body, "result", "data", "json");
  log("✓", "notifications.list", notifs.status === 200, `count=${nArr?.length}`);

  console.log("\n--- Audit ---");
  const audit = await trpc("audit.list", { workspaceId: wid, page: 1, pageSize: 10 });
  const aData = unwrap(audit.body, "result", "data", "json");
  log("✓", "audit.list (paginated)", audit.status === 200, `total=${aData?.total}, items=${aData?.items?.length}`);

  console.log("\n--- Outbound ---");
  const ob = await trpc("outbound.listCampaigns", { workspaceId: wid });
  const obData = unwrap(ob.body, "result", "data", "json");
  const obArr = obData?.items ?? obData;
  log("✓", "outbound.listCampaigns", ob.status === 200, `count=${obArr?.length}, total=${obData?.total}`);

  console.log("\n--- Team / Members ---");
  const members = await trpc("workspaces.members", { workspaceId: wid });
  const memberList = unwrap(members.body, "result", "data", "json");
  log("✓", "workspaces.members", members.status === 200, `count=${Array.isArray(memberList) ? memberList.length : "?"}`);

  console.log("\n--- Member management ---");
  const invite = await trpc("workspaces.invite", { json: { workspaceId: wid, email: "e2e-invitee@test.com", role: "member" } });
  const invData = unwrap(invite.body, "result", "data", "json");
  log("✓", "workspaces.invite", invite.status === 200 && !!invData?.userId, `userId=${invData?.userId}`);

  if (invData?.userId) {
    const update = await trpc("workspaces.updateRole", { json: { workspaceId: wid, userId: invData.userId, role: "viewer" } });
    log("✓", "workspaces.updateRole", update.status === 200, `status=${update.status}`);

    const remove = await trpc("workspaces.remove", { json: { workspaceId: wid, userId: invData.userId } });
    log("✓", "workspaces.remove", remove.status === 200 || remove.status === 204, `status=${remove.status}`);
  }

  console.log("\n--- Static assets ---");
  const indexRes = await fetch("http://localhost:3000/");
  log("✓", "GET / (index.html)", indexRes.status === 200, `status=${indexRes.status}`);

  const embedRes = await fetch("http://localhost:3000/embed.js");
  const embedText = await embedRes.text();
  log("✓", "GET /embed.js", embedRes.status === 200 && embedText.length > 100, `${embedRes.status}, ${embedText.length} bytes`);

  console.log("\n--- Password reset flow ---");
  const reqReset = await trpc("auth.requestPasswordReset", { json: { email: "admin@haier.it" } });
  const prData = unwrap(reqReset.body, "result", "data", "json");
  log("✓", "auth.requestPasswordReset (non-blocking on email failure)", reqReset.status === 200 && prData?.accepted === true, `accepted=${prData?.accepted}`);

  console.log("\n--- Logout ---");
  const logout = await trpc("auth.logout");
  log("✓", "auth.logout", logout.status === 200 || logout.status === 204);

  console.log("\n===== RESULTS =====");
  console.log(`PASS: ${pass}    FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error("E2E test crashed:", err); process.exit(1); });
