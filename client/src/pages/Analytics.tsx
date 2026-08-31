import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/trpc";
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight } from "lucide-react";
import "./Analytics.css";

interface Segment {
  name: string;
  mrr: number;
  nrr: number;
  cac: number;
  acv: number;
}

type SortKey = "name" | "mrr" | "nrr" | "cac" | "acv";

export default function Analytics() {
  const { workspaceId } = useAuth();
  const [range, setRange] = useState("30D");
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics.overview", workspaceId, range],
    queryFn: () => analyticsApi.overview({ workspaceId: workspaceId!, range }),
    enabled: !!workspaceId,
  });

  const { data: segmentsData } = useQuery({
    queryKey: ["analytics.segments", workspaceId, range],
    queryFn: () => analyticsApi.segments({ workspaceId: workspaceId!, range }),
    enabled: !!workspaceId,
  });

  const kpis = (overview?.kpis ?? {}) as {
    totalRevenue?: number;
    activeSegments?: number;
    growthRate?: number;
    avgMRR?: number;
  };

  const revenueHistory = (overview?.revenueHistory ?? []) as Array<{
    month: string;
    revenue: number;
  }>;

  const segments = (segmentsData?.segments ?? []) as Segment[];

  const sortedSegments = useMemo(() => {
    const arr = [...segments];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string") return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [segments, sortKey, sortAsc]);

  const maxRevenue = useMemo(() => {
    if (revenueHistory.length === 0) return 1;
    return Math.max(...revenueHistory.map((r) => r.revenue), 1);
  }, [revenueHistory]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  const kpiCards = [
    { label: "Total Revenue", value: `$${(kpis.totalRevenue ?? 0).toLocaleString()}`, icon: <DollarSign size={18} />, color: "#10B981" },
    { label: "Active Segments", value: kpis.activeSegments ?? 0, icon: <Users size={18} />, color: "#3B82F6" },
    {
      label: "Growth Rate",
      value: `${(kpis.growthRate ?? 0).toFixed(1)}%`,
      icon: (kpis.growthRate ?? 0) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
      color: (kpis.growthRate ?? 0) >= 0 ? "#10B981" : "#EF4444",
    },
    { label: "Avg MRR", value: `$${(kpis.avgMRR ?? 0).toLocaleString()}`, icon: <BarChart3 size={18} />, color: "#8B5CF6" },
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
          {["7D", "30D", "90D", "1Y"].map((r) => (
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
            </div>
            <ArrowUpRight size={14} className="kpi-arrow" />
          </div>
        ))}
      </section>

      <section className="card revenue-chart-card">
        <h2>Revenue Overview</h2>
        {revenueHistory.length === 0 ? (
          <p className="empty-text">No revenue data available.</p>
        ) : (
          <div className="revenue-chart">
            <div className="chart-bars">
              {revenueHistory.map((entry) => (
                <div key={entry.month} className="chart-bar-wrapper">
                  <div className="chart-bar-value">${(entry.revenue / 1000).toFixed(1)}k</div>
                  <div
                    className="chart-bar"
                    style={{ height: `${(entry.revenue / maxRevenue) * 100}%` }}
                  />
                  <div className="chart-bar-label">{entry.month}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card segments-card">
        <h2>Segment Performance</h2>
        {sortedSegments.length === 0 ? (
          <p className="empty-text">No segment data available.</p>
        ) : (
          <div className="segments-table-wrapper">
            <table className="segments-table">
              <thead>
                <tr>
                  {(
                    [
                      ["name", "Segment"],
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
                {sortedSegments.map((seg) => (
                  <tr key={seg.name}>
                    <td className="segment-name">{seg.name}</td>
                    <td>${seg.mrr.toLocaleString()}</td>
                    <td className={seg.nrr >= 100 ? "positive" : "negative"}>
                      {seg.nrr.toFixed(1)}%
                    </td>
                    <td>${seg.cac.toLocaleString()}</td>
                    <td>${seg.acv.toLocaleString()}</td>
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
