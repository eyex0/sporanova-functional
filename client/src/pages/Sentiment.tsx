import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SmilePlus, Meh, Frown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import "./Analytics.css";

type SentimentData = {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  trend: "up" | "down" | "stable";
  currentScore: number;
  previousScore: number;
};

export default function Sentiment() {
  const { workspaceId } = useAuth();
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/trpc/analytics.sentiment?input=${encodeURIComponent(JSON.stringify({ "0": { json: { workspaceId, range } } }))}`, { credentials: "include" })
      .then(r => r.json())
      .then(json => {
        const payload = json?.result?.data?.json ?? json?.result?.data ?? json;
        setData(payload && typeof payload === "object" && "positive" in payload ? payload : null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspaceId, range]);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Sentiment</h1>
          <p className="analytics-subtitle">Customer sentiment analysis from chatbot conversations</p>
        </div>
        <div className="analytics-range">
          {(["7D", "30D", "90D", "1Y"] as const).map((r) => (
            <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </header>

      <div className="analytics-content">
        {loading ? (
          <div className="analytics-empty"><p>Loading sentiment data...</p></div>
        ) : !data ? (
          <div className="analytics-empty">
            <SmilePlus size={40} />
            <h3>No sentiment data yet</h3>
            <p>Sentiment analysis will appear once you start receiving chatbot conversations.</p>
          </div>
        ) : (
          <>
            <div className="sentiment-cards">
              <div className="sentiment-card sentiment-card--positive">
                <SmilePlus size={24} />
                <div><span className="sentiment-value">{data.positive}%</span><span className="sentiment-label">Positive</span></div>
              </div>
              <div className="sentiment-card sentiment-card--neutral">
                <Meh size={24} />
                <div><span className="sentiment-value">{data.neutral}%</span><span className="sentiment-label">Neutral</span></div>
              </div>
              <div className="sentiment-card sentiment-card--negative">
                <Frown size={24} />
                <div><span className="sentiment-value">{data.negative}%</span><span className="sentiment-label">Negative</span></div>
              </div>
            </div>
            <div className="sentiment-bar">
              <div className="sentiment-segment sentiment-segment--positive" style={{ width: `${data.positive}%` }} />
              <div className="sentiment-segment sentiment-segment--neutral" style={{ width: `${data.neutral}%` }} />
              <div className="sentiment-segment sentiment-segment--negative" style={{ width: `${data.negative}%` }} />
            </div>
            <div className="sentiment-summary">
              <p>Based on <strong>{data.total}</strong> messages</p>
              {data.trend === "up" && <span className="sentiment-trend sentiment-trend--up"><TrendingUp size={14} /> Improving</span>}
              {data.trend === "down" && <span className="sentiment-trend sentiment-trend--down"><TrendingDown size={14} /> Declining</span>}
              {data.trend === "stable" && <span className="sentiment-trend sentiment-trend--stable"><Minus size={14} /> Stable</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
