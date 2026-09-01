import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsApi } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";
import "./Analytics.css";

type Topic = {
  name: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  rank: number;
};

export default function Topics() {
  const { workspaceId } = useAuth();
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "1Y">("30D");

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics.topics", workspaceId, range],
    queryFn: () => analyticsApi.topics({ workspaceId: workspaceId!, range }) as Promise<{ items: Topic[] }>,
    enabled: !!workspaceId,
  });

  const topics: Topic[] = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Topics</h1>
          <p className="analytics-subtitle">Most discussed topics from your chatbot conversations</p>
        </div>
        <div className="analytics-range">
          {(["7D", "30D", "90D", "1Y"] as const).map((r) => (
            <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </header>

      <div className="analytics-content">
        {isLoading ? (
          <div className="analytics-empty"><p>Loading topics…</p></div>
        ) : error ? (
          <div className="analytics-empty"><MessageSquare size={40} /><h3>Couldn't load topics</h3><p>Please try again in a moment.</p></div>
        ) : topics.length === 0 ? (
          <div className="analytics-empty">
            <MessageSquare size={40} />
            <h3>No topics yet</h3>
            <p>Topics will be extracted from your chatbot conversations once you start receiving messages.</p>
          </div>
        ) : (
          <div className="topics-list">
            {topics.map((topic) => (
              <div key={topic.name} className="topic-row">
                <div className="topic-rank">#{topic.rank}</div>
                <div className="topic-info">
                  <h3>{topic.name}</h3>
                  <div className="topic-bar">
                    <div className="topic-bar-fill" style={{ width: `${topic.percentage}%` }} />
                  </div>
                </div>
                <div className="topic-stats">
                  <span className="topic-count">{topic.count} chats</span>
                  <span className="topic-pct">{topic.percentage}%</span>
                  {topic.trend === "up" && <TrendingUp size={14} className="topic-trend topic-trend--up" />}
                  {topic.trend === "down" && <TrendingDown size={14} className="topic-trend topic-trend--down" />}
                  {topic.trend === "stable" && <Minus size={14} className="topic-trend topic-trend--stable" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
