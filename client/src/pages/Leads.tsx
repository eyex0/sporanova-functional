import { useState } from "react";
import { Calendar } from "lucide-react";
import "./SimplePage.css";

export default function Leads() {
  const [dateRange] = useState("Jul 29, 2026 - Aug 28, 2026");

  return (
    <div className="simple-page">
      <header className="simple-page-header">
        <h1>Leads</h1>
      </header>
      <p className="simple-page-subtitle">
        Leads your agent collects with the <a href="#" onClick={(e) => e.preventDefault()}>Collect leads</a> action.
      </p>

      <section className="simple-page-section">
        <h2>Filters</h2>
        <div className="simple-page-date-range">
          <Calendar size={16} color="#6B7280" />
          <span>{dateRange}</span>
        </div>
      </section>

      <div className="simple-page-empty-card">
        <h3>Start collecting leads</h3>
        <p>Set up the Collect leads action so your agent can ask visitors for their details.</p>
        <button className="simple-page-btn-primary">Set up Collect leads</button>
      </div>
    </div>
  );
}
