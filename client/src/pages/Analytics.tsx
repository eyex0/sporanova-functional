import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/trpc";
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Activity, ArrowUpRight } from "lucide-react";
import "./Analytics.css";

type KpiValue = { value: number; priorValue: number; changePercent: number | null };

interface OverviewResponse {
  range: string;
  kpis: { mrr: KpiValue; nrr: KpiValue; cac: KpiValue; acv: KpiValue; revenue: KpiValue };
  series: Array<{ date: string | Date; value: number; segment: string }>;
}

interface Segment {
  segment: string;
  mrr?: number;
  nrr?: number;
  cac?: number;
  acv?: number;
}

interface SegmentsResponse {
  items: Segment[];
  total: number;
  page: number;
  pageSize: number;
}

type SortKey = "segment" | "mrr" | "nrr" | "cac" | "acv";

const formatCurrency = (n: number | undefined): string => `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatChange = (k: KpiValue | undefined): { text: string; positive: boolean } => {
  if (!k || k.changePercent === null) return { text: "—", positive: true };
  const positive = k.changePercent >= 0;
  return { text: `${positive ? "+" : ""}${k.changePercent.toFixed(1)}%`, positive };
};

const monthLabel = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function Analytics() {
  const { workspaceId } = useAuth();
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics.overview", workspaceId, range],
    queryFn: () => analyticsApi.overview({ workspaceId: workspaceId!, range }) as Promise<OverviewResponse>,
    enabled: !!workspaceId,
  });

  const { data: segmentsData } = useQuery({
    queryKey: ["analytics.segments", workspaceId, range],
    queryFn: () => analyticsApi.segments({ workspaceId: workspaceId!, range }) as Promise<SegmentsResponse>,
    enabled: !!workspaceId,
  });

  const segments = useMemo(() => {
    const arr: Segment[] = Array.isArray(segmentsData?.items) ? segmentsData!.items : [];
    return [...arr].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string") return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal ?? 0) - (bVal ?? 0) : (bVal ?? 0) - (aVal ?? 0);
    });
  }, [segmentsData, sortKey, sortAsc]);

  const maxSeriesValue = useMemo(() => {
    const series = overview?.series ?? [];
    if (series.length === 0) return 1;
    return Math.max(...series.map((s) => s.value), 1);
  }, [overview]);

  const revenueSeries = useMemo(() => {
    const series = overview?.series ?? [];
    return [...series].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [overview]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  const kpiCards = [
    { label: "Total Revenue", value: formatCurrency(overview?.kpis?.revenue?.value), change: formatChange(overview?.kpis?.revenue), icon: <DollarSign size={18} />, color: "#10B981" },
    { label: "MRR", value: formatCurrency(overview?.kpis?.mrr?.value), change: formatChange(overview?.kpis?.mrr), icon: <BarChart3 size={18} />, color: "#3B82F6" },
    { label: "NRR", value: overview?.kpis?.nrr?.value ? `${overview.kpis.nrr.value.toFixed(1)}%` : "—", change: formatChange(overview?.kpis?.nrr), icon: <TrendingUp size={18} />, color: "#8B5CF6" },
    { label: "Active Segments", value: segmentsData?.total ?? 0, change: null, icon: <Users size={18} />, color: "#F59E0B" },
  ];

  if (!workspaceId || isLoading) {
    return (
      <div className="analytics-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="page-header">
        <div>
          <h1>Analytics</h1>
        </div>
        <div className="range-selector">
          {(["7D", "30D", "90D", "1Y"] as const).map((r) => (
            <button
              key={r}
              className={`range-btn${range === r ? " active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <section className="kpi-grid">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}14`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-content">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-value">{kpi.value}</span>
              {kpi.change && (
                <span className={`kpi-change ${kpi.change.positive ? "positive" : "negative"}`}>
                  {kpi.change.positive ? "↑" : "↓"} {kpi.change.text}
                </span>
              )}
            </div>
            <ArrowUpRight size={14} className="kpi-arrow" />
          </div>
        ))}
      </section>

      <section className="card revenue-chart-card">
        <h2><Activity size={16} /> Revenue Trend</h2>
        {revenueSeries.length === 0 ? (
          <p className="empty-text">No revenue data available for the selected range.</p>
        ) : (
          <div className="revenue-chart">
            <div className="chart-bars">
              {revenueSeries.map((entry, i) => (
                <div key={`${entry.date}-${i}`} className="chart-bar-wrapper">
                  <div className="chart-bar-value">${(entry.value / 1000).toFixed(1)}k</div>
                  <div
                    className="chart-bar"
                    style={{ height: `${(entry.value / maxSeriesValue) * 100}%` }}
                  />
                  <div className="chart-bar-label">{monthLabel(entry.date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card segments-card">
        <h2>Segment Performance</h2>
        {segments.length === 0 ? (
          <p className="empty-text">No segment data available.</p>
        ) : (
          <div className="segments-table-wrapper">
            <table className="segments-table">
              <thead>
                <tr>
                  {(
                    [
                      ["segment", "Segment"],
                      ["mrr", "MRR"],
                      ["nrr", "NRR"],
                      ["cac", "CAC"],
                      ["acv", "ACV"],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}>
                      {label}
                      <span className="sort-indicator">{sortIndicator(key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => (
                  <tr key={seg.segment}>
                    <td className="segment-name">{seg.segment}</td>
                    <td>{formatCurrency(seg.mrr)}</td>
                    <td className={(seg.nrr ?? 0) >= 100 ? "positive" : "negative"}>
                      {seg.nrr !== undefined ? `${seg.nrr.toFixed(1)}%` : "—"}
                    </td>
                    <td>{formatCurrency(seg.cac)}</td>
                    <td>{formatCurrency(seg.acv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
