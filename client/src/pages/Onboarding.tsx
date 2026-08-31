import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { workspacesApi } from "@/lib/trpc";
import Logo from "@/components/Logo";
import {
  Headphones,
  ShoppingCart,
  Calendar,
  HelpCircle,
  Sparkles,
  Headset,
  CreditCard,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import "./Onboarding.css";

type ReferralSource = "google" | "ai" | "friend" | "competitor" | "linkedin" | "x" | "reddit" | "youtube" | "course" | "other" | null;
type AiSource = "chatgpt" | "claude" | "gemini" | "perplexity" | "copilot" | "other" | null;
type CompanySize = "startup" | "small" | "mid" | "enterprise" | null;
type AgentPurpose = "support" | "sales" | "scheduling" | "faq" | "other" | null;
type Plan = "free" | "hobby" | "standard" | "pro" | "enterprise";

const REFERRAL_OPTIONS: Array<{ value: Exclude<ReferralSource, null>; label: string }> = [
  { value: "google", label: "Google search" },
  { value: "ai", label: "ChatGPT / Claude / other AI" },
  { value: "friend", label: "Friend or colleague" },
  { value: "competitor", label: "Another website using SOPRANOVA" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "course", label: "Course or training" },
  { value: "other", label: "Other" },
];

const AI_OPTIONS: Array<{ value: Exclude<AiSource, null>; label: string }> = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" },
  { value: "copilot", label: "Copilot" },
  { value: "other", label: "Other/not sure" },
];

const COMPANY_SIZES: Array<{ value: Exclude<CompanySize, null>; label: string }> = [
  { value: "startup", label: "Startup (1-9)" },
  { value: "small", label: "Small business (10-49)" },
  { value: "mid", label: "Mid-market (50-499)" },
  { value: "enterprise", label: "Enterprise (500+)" },
];

const AGENT_PURPOSES: Array<{ value: Exclude<AgentPurpose, null>; label: string; icon: LucideIcon; defaultPersonality: string }> = [
  {
    value: "support",
    label: "Customer support",
    icon: Headset,
    defaultPersonality:
      "Answer customer questions clearly and concisely. Stay polite and professional. Escalate billing or account issues to a human agent when unsure.",
  },
  {
    value: "sales",
    label: "Sales assistant",
    icon: ShoppingCart,
    defaultPersonality:
      "Help prospects understand our products, qualify leads, and book demos. Be helpful, conversational, and never pushy. Always offer to connect them with a sales rep for pricing.",
  },
  {
    value: "scheduling",
    label: "Appointment scheduling",
    icon: Calendar,
    defaultPersonality:
      "Help visitors book appointments, check availability, and answer scheduling questions. Be efficient and confirm all details before booking.",
  },
  {
    value: "faq",
    label: "FAQ helper",
    icon: HelpCircle,
    defaultPersonality:
      "Answer frequently asked questions using our knowledge base. If you don't know the answer, be honest and direct the visitor to support.",
  },
  {
    value: "other",
    label: "Other",
    icon: Sparkles,
    defaultPersonality:
      "Assist visitors with their questions in a friendly, professional way. Gather context before answering and offer to escalate to a human when needed.",
  },
];

const TECH_STACK_ACTIONS = [
  { value: "stripe", label: "Stripe" },
  { value: "shopify", label: "Shopify" },
  { value: "cal", label: "Cal" },
  { value: "calendly", label: "Calendly" },
  { value: "slack", label: "Slack" },
  { value: "twilio", label: "Twilio" },
];

const TECH_STACK_HELPDESK = [
  { value: "sopranova", label: "SOPRANOVA" },
  { value: "zendesk", label: "Zendesk" },
  { value: "sunshine", label: "Sunshine" },
  { value: "salesforce", label: "Salesforce" },
  { value: "intercom", label: "Intercom" },
  { value: "hubspot", label: "HubSpot" },
  { value: "freshdesk", label: "Freshdesk" },
  { value: "zoho", label: "Zoho Desk" },
  { value: "helpscout", label: "Help Scout" },
  { value: "odoo", label: "Odoo" },
];

const DEPLOYMENT_CHANNELS = [
  { value: "chat_bubble", label: "Chat bubble", icon: Headphones },
  { value: "agent_page", label: "Agent page", icon: Briefcase },
  { value: "center_stage", label: "Center stage", icon: Sparkles },
  { value: "whatsapp", label: "WhatsApp", icon: Headphones },
  { value: "messenger", label: "Messenger", icon: Headphones },
  { value: "instagram", label: "Instagram", icon: Headphones },
  { value: "shopify", label: "Shopify", icon: ShoppingCart },
  { value: "email", label: "Email", icon: Headphones },
  { value: "slack", label: "Slack", icon: Headphones },
  { value: "zendesk", label: "Zendesk", icon: Headphones },
  { value: "salesforce", label: "Salesforce", icon: Briefcase },
  { value: "phone", label: "Phone", icon: Headphones },
];

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, workspaceId } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [referral, setReferral] = useState<ReferralSource>(null);
  const [aiSource, setAiSource] = useState<AiSource>(null);
  const [companySize, setCompanySize] = useState<CompanySize>(null);
  const [agentName, setAgentName] = useState("SOPRANOVA");
  const [agentPersonality, setAgentPersonality] = useState(
    "Answer customer questions clearly and concisely. Stay polite and professional. Escalate billing or account issues to a human agent when unsure."
  );
  const [agentPurpose, setAgentPurpose] = useState<AgentPurpose>("support");
  const [techStackActions, setTechStackActions] = useState<string[]>([]);
  const [techStackHelpdesk, setTechStackHelpdesk] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>(["chat_bubble"]);
  const [plan, setPlan] = useState<Plan>("free");
  const [yearly, setYearly] = useState(false);

  const canContinue = (() => {
    if (step === 0) return referral !== null && (referral !== "ai" || aiSource !== null);
    if (step === 1) return companySize !== null;
    if (step === 2) return agentName.trim().length >= 2 && agentPersonality.trim().length >= 10 && agentPurpose !== null;
    if (step === 3) return true;
    if (step === 4) return channels.length > 0;
    if (step === 5) return true;
    return false;
  })();

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  const finish = async () => {
    if (!workspaceId) return;
    setSubmitting(true);
    try {
      const allTechStack = [...techStackActions, ...techStackHelpdesk];
      const finalChannels = plan === "free" ? ["chat_bubble"] : channels;
      await workspacesApi.completeOnboarding({
        workspaceId,
        organizationName: user?.email?.split("@")[1] ?? "My Organization",
        companySize: companySize ?? undefined,
        jobTitle: undefined,
        agentName: agentName.trim(),
        agentPersonality: agentPersonality.trim(),
        deploymentChannels: finalChannels,
        techStack: allTechStack,
        referralSource: referral
          ? referral === "ai"
            ? `ai:${aiSource ?? "unspecified"}`
            : referral
          : undefined,
        plan,
      });
      setLocation("/dashboard");
    } catch (err) {
      console.error("Onboarding failed:", err);
      setSubmitting(false);
    }
  };

  const toggleSetItem = (
    set: string[],
    item: string,
    setter: (next: string[]) => void
  ) => {
    if (set.includes(item)) setter(set.filter((x) => x !== item));
    else setter([...set, item]);
  };

  return (
    <div className="onboarding">
      <div className="onboarding-pane">
        <header className="onboarding-header">
          <Logo size={22} color="#0A0A0A" />
          <div className="onboarding-dots">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`onboarding-dot ${i <= step ? "onboarding-dot--filled" : ""}`}
              />
            ))}
          </div>
        </header>

        <div className="onboarding-body">
          {step === 0 && (
            <div className="onboarding-step">
              <h1>How did you hear about us?</h1>
              <div className="onboarding-options">
                {REFERRAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`onboarding-option ${referral === opt.value ? "onboarding-option--selected" : ""}`}
                    onClick={() => {
                      setReferral(opt.value);
                      if (opt.value !== "ai") setAiSource(null);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {referral === "ai" && (
                <>
                  <p className="onboarding-section-title">Which one?</p>
                  <div className="onboarding-options">
                    {AI_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`onboarding-option ${aiSource === opt.value ? "onboarding-option--selected" : ""}`}
                        onClick={() => setAiSource(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-step">
              <h1>What's your company size?</h1>
              <div className="onboarding-options">
                {COMPANY_SIZES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`onboarding-option ${companySize === opt.value ? "onboarding-option--selected" : ""}`}
                    onClick={() => setCompanySize(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <h1 className="onboarding-body h1--small">Customize your agent's personality</h1>
              <label className="step-label" style={{ marginBottom: 8 }}>What will your agent do?</label>
              <textarea
                className="onboarding-textarea"
                value={agentPersonality}
                onChange={(e) => setAgentPersonality(e.target.value)}
                placeholder="Describe what your agent should do..."
              />
              <div style={{ marginTop: 16, position: "relative" }}>
                <select
                  className="onboarding-select"
                  value={agentPurpose ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as Exclude<AgentPurpose, null>;
                    setAgentPurpose(v);
                    const preset = AGENT_PURPOSES.find((p) => p.value === v);
                    if (preset) setAgentPersonality(preset.defaultPersonality);
                  }}
                  style={{ appearance: "none", paddingRight: 40 }}
                >
                  {AGENT_PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6B7280" }} size={18} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <h1 className="onboarding-body h1--small">Select the tools in your tech stack</h1>
              <p className="step-label" style={{ marginBottom: 20 }}>
                We'll note it down and walk you through how to integrate them later.
              </p>
              <p className="onboarding-section-title">Actions</p>
              <div className="onboarding-options">
                {TECH_STACK_ACTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`onboarding-option ${techStackActions.includes(opt.value) ? "onboarding-option--selected" : ""}`}
                    onClick={() => toggleSetItem(techStackActions, opt.value, setTechStackActions)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="onboarding-section-title">Helpdesk tools</p>
              <div className="onboarding-options">
                {TECH_STACK_HELPDESK.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`onboarding-option ${techStackHelpdesk.includes(opt.value) ? "onboarding-option--selected" : ""}`}
                    onClick={() => toggleSetItem(techStackHelpdesk, opt.value, setTechStackHelpdesk)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step">
              <h1 className="onboarding-body h1--small">Where will you be deploying your AI agents?</h1>
              <p className="step-label" style={{ marginBottom: 20 }}>
                Select all that apply.
              </p>
              <div className="onboarding-options">
                {DEPLOYMENT_CHANNELS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`onboarding-option ${channels.includes(opt.value) ? "onboarding-option--selected" : ""}`}
                      onClick={() => toggleSetItem(channels, opt.value, setChannels)}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="onboarding-step">
              <h1 className="onboarding-body h1--small">Choose your plan</h1>
              <div className="onboarding-billing-toggle">
                <span style={{ color: yearly ? "#6B7280" : "#0A0A0A", fontWeight: 600 }}>Monthly</span>
                <button
                  type="button"
                  className={`onboarding-toggle ${yearly ? "onboarding-toggle--on" : ""}`}
                  onClick={() => setYearly((y) => !y)}
                  aria-label="Toggle yearly billing"
                >
                  <span className="onboarding-toggle-handle" />
                </button>
                <span style={{ color: yearly ? "#0A0A0A" : "#6B7280", fontWeight: 600 }}>Yearly</span>
                <span className="onboarding-discount">20% off</span>
              </div>
              <div className="onboarding-plans">
                {[
                  { value: "hobby" as Plan, name: "Hobby", price: 40, credits: "700 msg credits /m", accent: "hobby" },
                  { value: "standard" as Plan, name: "Standard", price: 150, credits: "4000 msg credits /m", accent: "standard", popular: true },
                  { value: "pro" as Plan, name: "Pro", price: 500, credits: "15,000 msg credits /m", accent: "pro" },
                  { value: "enterprise" as Plan, name: "Enterprise", price: null, credits: "Power at your pace with custom solutions.", accent: "enterprise" },
                ].map((p) => (
                  <div
                    key={p.value}
                    className={`onboarding-plan onboarding-plan--${p.accent} ${plan === p.value ? "onboarding-plan--selected" : ""}`}
                    onClick={() => setPlan(p.value)}
                  >
                    {p.popular && <span className="onboarding-plan-popular">Popular</span>}
                    <div className="onboarding-plan-accent" />
                    <h3 className="onboarding-plan-name">{p.name}</h3>
                    {p.price !== null ? (
                      <>
                        <div className="onboarding-plan-price">
                          ${yearly ? Math.round(p.price * 0.8) : p.price}
                          <small> /m</small>
                        </div>
                        <p className="onboarding-plan-credits">{yearly ? "billed yearly" : "billed monthly"}</p>
                      </>
                    ) : (
                      <>
                        <div className="onboarding-plan-price">Let's talk</div>
                        <p className="onboarding-plan-credits">{p.credits}</p>
                      </>
                    )}
                    <button
                      type="button"
                      className="onboarding-plan-cta"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlan(p.value);
                      }}
                    >
                      {p.value === "enterprise" ? "Contact us" : "Start 7-day trial"}
                    </button>
                    {p.value !== "enterprise" && <p className="onboarding-plan-or">or <a href="#" onClick={(e) => { e.preventDefault(); setPlan("free"); }}>buy now</a></p>}
                    <p className="onboarding-plan-features-header">
                      {p.value === "hobby" ? "" : p.value === "standard" ? "Everything in Hobby, plus" : p.value === "pro" ? "Everything in Standard, plus" : "Everything in Pro, plus"}
                    </p>
                    <ul className="onboarding-plan-features">
                      {(p.value === "hobby"
                        ? [
                            { label: "Access to advanced models", bold: true },
                            { label: "2 members" },
                            { label: "Integrations", underline: true },
                            { label: "Basic analytics" },
                            { label: "Attachments" },
                          ]
                        : p.value === "standard"
                        ? [
                            { label: "3 members" },
                            { label: "Advanced integrations", underline: true },
                            { label: "API access" },
                            { label: "Personalization", underline: true },
                            { label: "Auto retrain agents", underline: true },
                            { label: "Helpdesk", underline: true },
                          ]
                        : p.value === "pro"
                        ? [
                            { label: "5 members" },
                            { label: "Advanced analytics", underline: true },
                            { label: "Sources suggestions", underline: true },
                            { label: "Tickets as a source", underline: true },
                          ]
                        : [
                            { label: "Higher limits" },
                            { label: "Flexible billing", underline: true },
                            { label: "Custom roles & permissions" },
                            { label: "SSO" },
                            { label: "White-labeling" },
                            { label: "Audit logs" },
                          ]
                      ).map((f, idx) => (
                        <li key={idx} className={`onboarding-plan-feature ${f.dim ? "dim" : ""}`}>
                          {f.underline ? <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "inherit", textDecoration: "underline" }}>{f.label}</a> : <>{f.label}</>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="onboarding-actions">
            {step > 0 && (
              <button type="button" className="onboarding-btn-secondary" onClick={goBack}>
                Back
              </button>
            )}
            {step === 5 && (
              <button
                type="button"
                className="onboarding-continue-free"
                onClick={() => {
                  setPlan("free");
                  finish();
                }}
                disabled={submitting}
              >
                Continue for free
              </button>
            )}
            <button
              type="button"
              className="onboarding-btn-primary"
              onClick={goNext}
              disabled={!canContinue || submitting}
            >
              {submitting ? "Setting up..." : step === TOTAL_STEPS - 1 ? (plan === "free" ? "Continue for free" : "Start 7-day trial") : "Continue"}
            </button>
          </div>
        </div>

        <footer className="onboarding-footer">
          <span>© {new Date().getFullYear()} SOPRANOVA Inc.</span>
          <div>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
          </div>
        </footer>
      </div>

      <aside className="onboarding-testimonial">
        <div className="onboarding-testimonial-card">
          <div className="onboarding-testimonial-logo">
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "#0A0A0A", color: "#FFFFFF", fontSize: 16, fontWeight: 800 }}>★</span>
            S<span style={{ color: "#6366F1" }}>o</span>pranova
          </div>
          <p className="onboarding-testimonial-quote">
            "We went from agents waiting in a human support queue to getting instant answers on every channel, and half our inbound inquiries now never reach our team at all. For a program running across 8 markets, that kind of scale without added headcount is exactly what we needed."
          </p>
          <p className="onboarding-testimonial-author">
            <strong>LT Jacquin</strong>, Group Head of Operations, SOPRANOVA
          </p>
        </div>
        <div className="onboarding-testimonial-logos">
          <div className="onboarding-testimonial-logo-item">ORION</div>
          <div className="onboarding-testimonial-logo-item">Miele</div>
          <div className="onboarding-testimonial-logo-item">Opal</div>
          <div className="onboarding-testimonial-logo-item">Dolby</div>
          <div className="onboarding-testimonial-logo-item">SOPRANOVA</div>
          <div className="onboarding-testimonial-logo-item">nationalgrid</div>
          <div className="onboarding-testimonial-logo-item">Sage</div>
          <div className="onboarding-testimonial-logo-item">IHG</div>
          <div className="onboarding-testimonial-logo-item">F45</div>
          <div className="onboarding-testimonial-logo-item">noon</div>
        </div>
      </aside>
    </div>
  );
}

function ChevronDown({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}
