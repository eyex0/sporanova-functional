import "./SimplePage.css";

export default function Outbound() {
  return (
    <div className="simple-page">
      <header className="simple-page-header">
        <h1>Campaigns</h1>
      </header>

      <div className="simple-page-empty-card" style={{ textAlign: "left", padding: 32, background: "#FAFAF8", border: "1px solid #E5E5E5" }}>
        <h3 style={{ fontSize: 20 }}>Outbound Campaigns</h3>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16, maxWidth: "none" }}>
          Reach your customers proactively with outbound campaigns via WhatsApp and other channels.
        </p>
        <button className="simple-page-btn-primary">Start free trial to unlock</button>
      </div>

      <div style={{ marginTop: 24, padding: 32, background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>How this works</h3>
        <ol style={{ paddingLeft: 20, color: "#6B7280", fontSize: 14, lineHeight: 2 }}>
          <li>Create a campaign and choose your target audience from your contacts.</li>
          <li>Select a WhatsApp message template for your campaign.</li>
          <li>Send your campaign and track delivery, read, and reply rates in real time.</li>
        </ol>
      </div>
    </div>
  );
}
