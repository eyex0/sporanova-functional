import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsApi } from "@/lib/trpc";
import { SmilePlus, Meh, Frown, TrendingUp, TrendingDown } from "lucide-react";
import "./Analytics.css";

type SentimentData = {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  trend: "up" | "down" | "stable";
};

export default function Sentiment() {
  const { workspaceId } = useAuth();
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    analyticsApi.overview({ workspaceId })
      .then(() => { setData(null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Sentiment</h1>
          <p className="analytics-subtitle">Customer sentiment analysis from chatbot conversations</p>
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
              <p>Based on <strong>{data.total}</strong> conversations</p>
              {data.trend === "up" && <span className="sentiment-trend sentiment-trend--up"><TrendingUp size={14} /> Improving</span>}
              {data.trend === "down" && <span className="sentiment-trend sentiment-trend--down"><TrendingDown size={14} /> Declining</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
