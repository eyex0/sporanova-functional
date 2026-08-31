import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import "./SimplePage.css";

const steps = [
  {
    title: "Customize your agent",
    description: "Set your agent's name, personality, and instructions.",
    done: true,
    action: "/dashboard/playground",
  },
  {
    title: "Add a data source",
    description: "Connect your knowledge base so your agent can answer questions accurately.",
    done: false,
    action: "/dashboard/data-sources",
  },
  {
    title: "Deploy your agent",
    description: "Add the chat widget to your website or share the help page link.",
    done: false,
    action: "/dashboard/channels",
  },
];

export default function GettingStarted() {
  const completed = steps.filter((s) => s.done).length;
  return (
    <div className="simple-page">
      <header className="simple-page-header">
        <h1>Getting started</h1>
      </header>
      <p className="simple-page-subtitle">
        {completed} of {steps.length} steps completed — let's get your agent ready to chat.
      </p>

      <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 24, marginTop: 24 }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: idx < steps.length - 1 ? "1px solid #F0F0F0" : "none" }}>
            {step.done ? (
              <CheckCircle2 size={24} color="#16A34A" />
            ) : (
              <Circle size={24} color="#9CA3AF" />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: step.done ? "#6B7280" : "#0A0A0A", textDecoration: step.done ? "line-through" : "none" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>{step.description}</p>
            </div>
            {!step.done && (
              <a href={step.action} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0A0A0A", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Start <ArrowRight size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
