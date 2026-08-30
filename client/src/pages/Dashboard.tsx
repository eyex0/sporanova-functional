import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, ArrowUpRight, Bot, Database, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router";

function relativeTime(value: Date | string | null) {
  if (!value) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Dashboard() {
  const { workspaceId, workspace } = useWorkspace();
  const { user } = useAuth();
  const overview = trpc.dashboard.overview.useQuery({ workspaceId: workspaceId ?? 0, range: "1Y" }, { enabled: Boolean(workspaceId) });
  const data = overview.data;
  const cards = [
    { label: "Revenue (YTD)", value: data?.kpis.revenue ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(data.kpis.revenue) : "—", icon: ArrowUpRight },
    { label: "Active Agents", value: data ? String(data.kpis.activeAgents) : "—", icon: Bot },
    { label: "Data Sources", value: data ? String(data.kpis.dataSources) : "—", icon: Database },
    { label: "Insights Today", value: data ? String(data.kpis.insightsToday) : "—", icon: Lightbulb },
  ];

  if (overview.error) return <ErrorPanel onRetry={() => overview.refetch()} />;
  return <div className="space-y-5 animate-in fade-in duration-300">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="sn-label mb-2">Command Center</p><h1 className="text-2xl font-medium">Good morning, {user?.name?.split(" ")[0] || workspace?.workspace.name || "there"}.</h1><p className="mt-1 text-sm text-[#8C887F]">Here's what matters across your business today.</p></div>
      <button onClick={() => overview.refetch()} className="inline-flex items-center gap-2 rounded-xl bg-[#FAFAF8] px-3 py-2 text-xs font-medium text-[#6B6660] ring-1 ring-[#E8E6E2] transition hover:bg-[#F4F3F0]"><RefreshCw size={14} className={overview.isFetching ? "animate-spin" : ""} />Refresh</button>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => <div key={card.label} className="rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-5"><card.icon size={16} className="mb-4 text-[#6B7FBF]" /><p className="sn-label">{card.label}</p><p className="mt-2 text-2xl font-medium">{overview.isLoading ? "…" : card.value}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-6"><div className="flex items-start justify-between"><div><p className="sn-label">Revenue Trend</p><h2 className="mt-1 text-xl font-medium">Workspace revenue</h2></div><span className="rounded-lg bg-[#F0EFF8] px-2.5 py-1 text-xs text-[#5B6FA8]">1Y</span></div>{data?.revenueSeries.length ? <RevenueSpark values={data.revenueSeries.map(item => item.value)} /> : <EmptyState icon={ArrowUpRight} title="No revenue data yet" description="Connect a data source or add business metrics to populate analytics." action={{ href: "/app/data", label: "Manage data" }} />}</section>
      <section className="rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-6"><p className="sn-label mb-4">Intelligence Signals</p>{data?.signals.length ? <div className="space-y-2">{data.signals.map(signal => <Link key={signal.id} to="/app/intelligence" className="block rounded-xl border-l-[3px] bg-[#F4F3F0] p-3 transition hover:bg-[#F0EFF8]" style={{ borderColor: signal.severity === "high" ? "#B8675A" : signal.severity === "medium" ? "#C5974A" : "#4A8B8C" }}><p className="text-sm font-medium">{signal.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#8C887F]">{signal.description}</p></Link>)}</div> : <EmptyState icon={Sparkles} title="No open signals" description="Signals appear here when your agents or intelligence identify actionable patterns." action={{ href: "/app/intelligence", label: "Ask Intelligence" }} />}</section>
    </div>
    <section className="rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-6"><div className="mb-5 flex items-center justify-between"><p className="sn-label">Active Agents</p><Link to="/app/agents" className="text-xs font-medium text-[#6B7FBF] hover:text-[#1A1F3C]">View all →</Link></div>{data?.activeAgents.length ? <div className="grid gap-3 md:grid-cols-2">{data.activeAgents.map(agent => <Link key={agent.id} to="/app/agents" className="flex items-center gap-3 rounded-xl bg-[#F4F3F0] p-4 transition hover:bg-[#F0EFF8]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1A1F3C] text-sm font-semibold text-[#F8F6F2]">{agent.name[0]}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{agent.name}</span><span className="mt-1 block truncate text-xs text-[#8C887F]">{agent.purpose}</span></span><span className="ml-auto h-2 w-2 rounded-full bg-[#4A8B8C]" /></Link>)}</div> : <EmptyState icon={Bot} title="No active agents" description="Deploy an agent to begin capturing operational intelligence." action={{ href: "/app/agents", label: "Deploy agent" }} />}</section>
    <section className="rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-6"><p className="sn-label mb-3">Recent Activity</p>{data?.activity.length ? <div>{data.activity.map(item => <div key={item.id} className="flex gap-4 border-b border-[#F4F3F0] py-3 last:border-0"><span className="w-16 shrink-0 pt-0.5 text-xs text-[#B8B4AC]">{relativeTime(item.createdAt)}</span><span className="text-sm text-[#6B6660]">{item.action.replaceAll("_", " ")}</span></div>)}</div> : <p className="py-4 text-sm text-[#8C887F]">No audit activity exists in this workspace yet.</p>}</section>
  </div>;
}

function RevenueSpark({ values }: { values: number[] }) { const max = Math.max(...values); const min = Math.min(...values); const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - ((value - min) / Math.max(max - min, 1)) * 84 - 8}`).join(" "); return <div className="mt-10"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full overflow-visible"><defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#6B7FBF" stopOpacity=".22" /><stop offset="1" stopColor="#6B7FBF" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#revenueFill)" /><polyline points={points} fill="none" stroke="#5B6FA8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /></svg></div>; }
function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Bot; title: string; description: string; action: { href: string; label: string } }) { return <div className="grid min-h-48 place-items-center text-center"><div><Icon size={22} className="mx-auto mb-3 text-[#B8B4AC]" /><p className="text-sm font-medium">{title}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#8C887F]">{description}</p><Link to={action.href} className="mt-3 inline-block text-xs font-medium text-[#6B7FBF] hover:text-[#1A1F3C]">{action.label} →</Link></div></div>; }
function ErrorPanel({ onRetry }: { onRetry: () => void }) { return <div className="rounded-2xl border border-[#E8E6E2] bg-[#FAFAF8] p-10 text-center"><AlertCircle className="mx-auto mb-3 text-[#B8675A]" /><h1 className="text-lg font-medium">Dashboard data is unavailable</h1><p className="mt-2 text-sm text-[#8C887F]">The request could not be completed. No local fallback data is shown.</p><button onClick={onRetry} className="mt-4 rounded-xl bg-[#1A1F3C] px-4 py-2 text-sm font-medium text-[#F8F6F2]">Retry</button></div>; }
