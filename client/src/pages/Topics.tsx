import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsApi } from "@/lib/trpc";
import { TrendingUp, MessageSquare } from "lucide-react";
import "./Analytics.css";

type Topic = {
  name: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
};

export default function Topics() {
  const { workspaceId } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    analyticsApi.overview({ workspaceId })
      .then(() => { setTopics([]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>Topics</h1>
          <p className="analytics-subtitle">Most discussed topics from your chatbot conversations</p>
        </div>
      </header>

      <div className="analytics-content">
        {loading ? (
          <div className="analytics-empty"><p>Loading topics...</p></div>
        ) : topics.length === 0 ? (
          <div className="analytics-empty">
            <MessageSquare size={40} />
            <h3>No topics yet</h3>
            <p>Topics will be extracted from your chatbot conversations once you start receiving messages.</p>
          </div>
        ) : (
          <div className="topics-list">
            {topics.map((topic, i) => (
              <div key={i} className="topic-row">
                <div className="topic-rank">#{i + 1}</div>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
