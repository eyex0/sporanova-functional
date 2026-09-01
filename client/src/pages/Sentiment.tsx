import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsApi } from "@/lib/trpc";
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
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics.sentiment", workspaceId, range],
    queryFn: () => analyticsApi.sentiment({ workspaceId: workspaceId!, range }) as Promise<SentimentData>,
    enabled: !!workspaceId,
  });

  const sentiment: SentimentData | null = data && typeof data === "object" && "positive" in data ? data : null;

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
        {isLoading ? (
          <div className="analytics-empty"><p>Loading sentiment data...</p></div>
        ) : error || !sentiment ? (
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
                <div><span className="sentiment-value">{sentiment.positive}%</span><span className="sentiment-label">Positive</span></div>
              </div>
              <div className="sentiment-card sentiment-card--neutral">
                <Meh size={24} />
                <div><span className="sentiment-value">{sentiment.neutral}%</span><span className="sentiment-label">Neutral</span></div>
              </div>
              <div className="sentiment-card sentiment-card--negative">
                <Frown size={24} />
                <div><span className="sentiment-value">{sentiment.negative}%</span><span className="sentiment-label">Negative</span></div>
              </div>
            </div>
            <div className="sentiment-bar">
              <div className="sentiment-segment sentiment-segment--positive" style={{ width: `${sentiment.positive}%` }} />
              <div className="sentiment-segment sentiment-segment--neutral" style={{ width: `${sentiment.neutral}%` }} />
              <div className="sentiment-segment sentiment-segment--negative" style={{ width: `${sentiment.negative}%` }} />
            </div>
            <div className="sentiment-summary">
              <p>Based on <strong>{sentiment.total}</strong> messages</p>
              {sentiment.trend === "up" && <span className="sentiment-trend sentiment-trend--up"><TrendingUp size={14} /> Improving</span>}
              {sentiment.trend === "down" && <span className="sentiment-trend sentiment-trend--down"><TrendingDown size={14} /> Declining</span>}
              {sentiment.trend === "stable" && <span className="sentiment-trend sentiment-trend--stable"><Minus size={14} /> Stable</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
