// @ts-nocheck
/** Reference style: faithful SOPRANOVA solution routes. Geist product hierarchy, Proza Display-like emphasis, restrained 150ms interactions and framed product surfaces. */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, ChevronDown, CircleCheck, Clock3, Code2, Headphones, Layers3, MessageCircle, PanelsTopLeft, ShoppingBag, Sparkles, TicketCheck, UserRoundCheck, Zap } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import "./reference-solutions.css";

const solutionPages = {
  "/use-cases/customer-support": {
    eyebrow: "Customer Support",
    title: <>AI Customer Support That <em>Resolves 80% of Tickets</em></>,
    description: "Your customers want answers, not queue numbers. SOPRANOVA trains on your data and resolves tickets automatically, 24 hours a day.",
    question: "My order arrived damaged — can you help?",
    answer: "I can help with that. I found your order and can guide the next step.",
    problemTitle: "Support volume grows. Your team doesn't.",
    problem: [["Volume overload", "Repeating the same questions across chat and email burns time and increases wait times."], ["Inconsistency", "Different shifts and sources lead to conflicting answers and frustrated customers."], ["Fallout", "Slow resolution increases refunds, chargebacks and churn."], ["Late responses", "When support is backlogged, issues pile up and every conversation starts from scratch."]],
    solutionTitle: "Trusted resolution at scale",
    benefits: [["Instant answers", "Handle repetitive questions immediately, 24/7, without adding headcount."], ["Always on policy", "Keep responses consistent by grounding answers in your help center and rules."], ["Smart responses", "Resolve issues without opening tickets, reducing volume across channels."], ["Faster escalations", "Hand off complex cases with full conversation context and clear summaries."], ["Lower handle time", "Reduce time spent searching docs and rewriting the same responses."], ["Better experience", "Give customers fast, confident help at every touchpoint."]],
    steps: [["Connect sources", "Add your help center, policies and FAQs."], ["Customize behavior", "Define tone, escalation rules and what the agent should avoid."], ["Deploy anywhere", "Embed it where customers ask questions most."], ["Improve weekly", "Review conversations and tighten answers over time."]],
  },
  "/use-cases/sales-agent": {
    eyebrow: "Sales",
    title: <>AI Sales Agent That <em>Qualifies & Converts Visitors</em></>,
    description: "Turn every website visit into a sales conversation. Answer product questions instantly, qualify buyer intent and route ready prospects to your team.",
    question: "Is Pro worth it for my team?",
    answer: "It could be. I can compare the plan against your team size and goals.",
    problemTitle: "Most Sales Teams Lose Leads Before a Rep Responds",
    problem: [["Slow Sales Response", "When a prospect waits hours for an answer, they move on."], ["Repetitive Sales Questions", "Reps answer the same pricing and feature questions instead of closing deals."], ["Poor Lead Qualification", "Calendars fill with prospects who were never a fit."], ["Leaking Sales Pipeline", "High-intent visitors leave quietly when no one addresses what they need."]],
    solutionTitle: "Your AI Sales Agent Always Working",
    benefits: [["Instant Sales Answers", "Respond to pricing, feature and integration questions before competitors do."], ["Sales Lead Capture", "Turn anonymous website visitors into known contacts naturally."], ["Smart Lead Routing", "Send qualified prospects to the right rep based on use case and urgency."], ["Sales Qualification", "Ask about budget, timeline and requirements upfront."], ["Automated Demo Booking", "Guide qualified leads straight to a calendar without back and forth."], ["Higher Sales Conversion", "Remove buying friction during evaluation."]],
    steps: [["Train on Your Sales Content", "Upload product pages, pricing docs, comparisons and FAQs."], ["Define Sales Qualification", "Set the questions that matter to your pipeline."], ["Deploy on High Intent Pages", "Embed on pricing, product and integration pages."], ["Optimize Sales Performance", "Review objections, drop-offs and the conversations that convert."]],
  },
  "/industries/ecommerce-retail": {
    eyebrow: "Ecommerce & Retail",
    title: <>Support your customers and <em>grow your revenue</em></>,
    description: "From product recommendations to order support and returns, deliver instant, on-brand answers across chat, email and voice.",
    question: "I’m 178cm, usually a M. Will the Lyon Trench fit?",
    answer: "You’ll want size M. It runs true to size, and standard delivery is 4–6 business days.",
    problemTitle: "One agent that works on both sides of checkout",
    problem: [["Sell before checkout", "Answer the product question that decides the sale while customers are still deciding."], ["Resolve after it", "Handle order changes, returns and refunds end to end."], ["Earn the next order", "Turn a return and a subscription change into a confident next purchase."]],
    solutionTitle: "Trained on your catalog and policies, not generic templates",
    benefits: [["Discovery and recommendations", "Narrow by budget, use case and fit, then link to the right variant."], ["Order status and tracking", "Quote the real delivery date and pull live tracking."], ["Returns, exchanges and refunds", "Check eligibility and follow policy-aware paths."], ["Subscriptions and billing", "Pause, swap, update or cancel inside the billing system."], ["Every channel", "Use the same context on chat, email, voice and messaging."], ["Multi-lingual", "Reply in the same language each customer uses."]],
    steps: [["Train on your catalog", "Bring product, stock, shipping and returns knowledge together."], ["Define governed actions", "Connect lookups and service workflows with clear policy boundaries."], ["Deploy at decision points", "Meet customers on product, checkout and post-purchase pages."], ["Improve every week", "Use questions and handoffs to strengthen your source of truth."]],
  },
  "/industries/education-training": {
    eyebrow: "Education & Training",
    title: <>Enrolment starts with <em>answers</em></>,
    description: "Help prospects get answers instantly about programs, tuition and deadlines, with an agent trained on admissions content.",
    question: "Which program fits a part-time evening schedule?",
    answer: "I can compare the schedule, entry requirements and next intake dates for you.",
    problemTitle: "Education is a big decision",
    problem: [["Questions delay enrolment", "Prospects hesitate when they cannot confirm tuition, schedules or requirements."], ["Support teams get flooded", "The same questions repeat across deadlines and application cycles."], ["Complex policies confuse students", "Attendance, transfers and requirements create avoidable escalation."]],
    solutionTitle: "Enrolment-ready support",
    benefits: [["Instant admissions answers", "Handle program details, deadlines, requirements and tuition in real time."], ["Lower ticket volume", "Deflect repetitive questions so teams can focus on complex student needs."], ["Clear policy guidance", "Give consistent answers on refunds, deferrals and course requirements."], ["More completed applications", "Resolve uncertainty while a prospect is deciding."], ["All teams", "Support universities, bootcamps, online programs and training providers."], ["One experience", "Keep one source of truth and one tone of voice."]],
    steps: [["Connect sources", "Add program pages, FAQs, tuition, calendars and policies."], ["Train workflows", "Cover applications, enrolment steps, prerequisites and support questions."], ["Deploy anywhere", "Use admissions, tuition, apply-now and portal pages."], ["Improve weekly", "Review top questions and handoffs to increase completed enrolments."]],
  },
  "/industries/fitness-wellness": {
    eyebrow: "Fitness & Wellness",
    title: <>AI support that members <em>love</em></>,
    description: "Deliver fast, accurate, on-brand answers across scheduling, memberships, billing and class policies.",
    question: "Can I move my class to tomorrow evening?",
    answer: "I found the next evening slot. I can move the booking within your cancellation window.",
    problemTitle: "Wellness is personal",
    problem: [["Questions block bookings", "People abandon when they cannot confirm class details or availability."], ["Staff answer repeats", "Front desk and coaches lose hours to schedules, policies and membership questions."], ["No-shows add up", "Unclear rules and late changes create revenue leakage and frustration."]],
    solutionTitle: "Automate support without losing the human touch",
    benefits: [["Booking & scheduling support", "Help customers choose, check availability and book in seconds."], ["Instant answers 24/7", "Explain membership options, trials, pricing and amenities anytime."], ["Reduce no-shows", "Set clear cancellation and rescheduling expectations."], ["Convert more leads", "Resolve objections while motivated leads are deciding."], ["All wellness businesses", "Support gyms, studios, spas, salons and clinics."], ["On brand", "One voice across every location, service and staff member."]],
    steps: [["Add sources", "Bring menus, schedules, tiers, policies and location details."], ["Define services", "Teach memberships, packages, booking rules and common billing questions."], ["Deploy anywhere", "Embed on pricing, schedule, booking and FAQ pages."], ["Keep improving", "Review questions and escalations to lighten front desk workload."]],
  },
  "/industries/travel-hospitality": {
    eyebrow: "Travel & Hospitality",
    title: <>Win bookings and answer guests <em>around the clock</em></>,
    description: "From availability and rates to check-in, loyalty and late checkout, connect every guest across chat, email and voice.",
    question: "Any sea-view rooms for the 12th to the 15th?",
    answer: "Two are available: Deluxe Sea View at $268/night and the Junior Suite at $340/night.",
    problemTitle: "From first inquiry to next booking",
    problem: [["Win more direct bookings", "Answer availability, rate and policy questions while the guest is deciding."], ["Answer guests at any hour", "Handle arrivals, on-property requests and changes as they happen."], ["Turn a stay into the next stay", "Treat complaints, refunds and loyalty questions as retention conversations."]],
    solutionTitle: "Trained on your rates, policies and loyalty tiers, not generic templates",
    benefits: [["Direct bookings and rates", "Quote real rates, explain inclusions and complete the booking."], ["Booking changes and refunds", "Move dates and process policy-aware cancellation paths."], ["Check-in and late arrivals", "Guide guests when a delayed arrival becomes urgent."], ["On-property guest requests", "Assign housekeeping and maintenance tasks with full context."], ["Loyalty and add-ons", "Answer tier, upgrade, parking, spa and dining questions."], ["Every channel", "Keep one context across customer touchpoints."]],
    steps: [["Connect live details", "Bring availability, policy and property data into the agent."], ["Define the guest workflow", "Set the governed actions for rates, booking and service."], ["Deploy across the journey", "Serve discovery, booking, stay and follow-up moments."], ["Learn from requests", "Use every handoff to improve the guest experience."]],
  },
  "/features/product-overview": {
    eyebrow: "Product Overview",
    title: <>The complete platform for <em>customer-facing agents</em></>,
    description: "Build an agent, test it against real scenarios, deploy it across every channel and keep improving it. No code, no engineering lift.",
    question: "Can you qualify leads and book a demo?",
    answer: "Yes. I can ask the right questions, update the CRM and offer a time when the lead is ready.",
    problemTitle: "The SOPRANOVA Agentic Harness",
    problem: [["LLM", "Model-agnostic intelligence, selecting the best model for each task."], ["Context", "Knowledge and instructions that tell the agent what should be treated as true."], ["APIs & Integrations", "Native integrations, custom APIs and procedures for governed work."], ["CX capabilities", "Widgets, human-in-the-loop and helpdesk when the work needs a team."], ["Security", "Isolation, audit trails and role-based access built into every layer."]],
    solutionTitle: "Set it up the way you’d brief a new hire",
    benefits: [["Sources", "Point at help centers, files, links, Q&As, Notion and product data."], ["Instructions", "Describe role, tone and job in plain English."], ["Model", "Choose the model your agent runs on and see what powers it."], ["Procedures", "Write the steps for a task with actions inline where needed."], ["Widgets", "Reply with product cards, trackers and selectors—not just text."], ["Backstage", "Ask your own conversations a question and act on what it finds."]],
    steps: [["Build", "Connect knowledge, behavior and actions in one workspace."], ["Test", "Run everyday questions and edge cases before customers see them."], ["Deploy", "Meet customers across chat, email, voice and messaging."], ["Improve", "Use analytics and escalation review to tighten every next response."]],
  },
  "/features/helpdesk": {
    eyebrow: "AI Helpdesk Software for modern teams",
    title: <>Seamless handoffs, with <em>full context</em></>,
    description: "Hand off to a human without missing a beat. Create a ticket for follow-up or pull a human agent into live chat with the full conversation in hand.",
    question: "I was charged twice—can someone investigate?",
    answer: "I’ve created a ticket with the conversation and billing context. A teammate will follow up soon.",
    problemTitle: "Two ways to hand-off",
    problem: [["Async ticket creation", "Open a ticket for email follow-up while the AI keeps chatting."], ["Live hand-off", "Route to a human without dropping the customer or the context."]],
    solutionTitle: "Everything the human side needs",
    benefits: [["Omnichannel", "Website, email, WhatsApp, Messenger, Instagram and more in one inbox."], ["Custom statuses", "Set ticket statuses to fit your team workflow."], ["Reporting", "Track tickets, response times and work by human agent."], ["AI assist", "Draft, rewrite, summarize and translate replies for the human."], ["Custom views", "Filter by channel, assignee, status or team."], ["Routing & assignment", "Auto-assign the correct team and human agent."], ["Manual takeover", "Step into a live conversation; the AI pauses on click."], ["Allow AI replies", "Turn the agent back on when the human is done."]],
    steps: [["Define escalation", "Decide which conversations should turn into a ticket or live hand-off."], ["Connect your helpdesk", "Use SOPRANOVA or keep Zendesk, Salesforce, Intercom and more."], ["Route with context", "Pass transcript, identity and useful AI summary to the next owner."], ["Review the outcome", "Track handoffs to improve the source, rule or workflow next."]],
  },
};

function TrustBand() { return <section className="rs-trust"><span>Trusted by 10,000+ businesses worldwide</span><div><b>Chuck E Cheese</b><b>Bridgestone</b><b>National Grid</b><b>Opal</b><b>Miele</b><b>F45 Training</b></div></section>; }

function PageFooter() { return <footer className="rs-footer"><span>SOPRANOVA</span><div><Link href="/features/product-overview">Product overview</Link><Link href="/features/helpdesk">Helpdesk</Link><Link href="/blog">Blog</Link><Link href="/changelog">Changelog</Link><Link href="/enterprise">Enterprise</Link></div><small>© 2026 SOPRANOVA</small></footer>; }

function ConversationStage({ config }) { const messages = [[config.question, config.answer], ["What should I do next?", "I can give you the clearest next step, based on the policy and your account context."], ["Can you handle this today?", "I can resolve what is permitted now, or route the case with a useful summary."]]; const [message, setMessage] = useState(0); useEffect(() => { const timer = window.setInterval(() => setMessage((n) => (n + 1) % messages.length), 4200); return () => window.clearInterval(timer); }, [messages.length]); return <div className="rs-conversation" aria-label="AI agent conversation demonstration"><div className="rs-stage-top"><span><Sparkles size={15} /> AI Agent</span><span><i /> Online</span></div><div className="rs-stage-body"><div key={`q-${message}`} className="rs-bubble rs-customer">{messages[message][0]}</div><div key={`a-${message}`} className="rs-bubble rs-agent"><Sparkles size={14} />{messages[message][1]}</div></div><div className="rs-stage-input"><span>Ask a question...</span><MessageCircle size={16} /></div></div>; }

function InteractiveSteps({ steps }) { const [active, setActive] = useState(0); return <section className="rs-steps"><div><span className="rs-kicker">How it works</span><h2>Launch your AI agent <em>in hours</em></h2><p>Start with trusted context, define the work and improve from the real conversations you see.</p></div><div className="rs-step-list">{steps.map(([title, body], index) => <button key={title} className={active === index ? "active" : ""} onClick={() => setActive(index)}><span>0{index + 1}</span><strong>{title}</strong><p>{active === index ? body : ""}</p><ChevronDown size={17} /></button>)}</div></section>; }

export default function ReferenceSolutionPage() {
  const [location] = useLocation();
  const config = solutionPages[location] ?? solutionPages["/use-cases/customer-support"];
  const [activeBenefit, setActiveBenefit] = useState(0);
  return <div className="reference-site"><PublicNav /><main>
    <section className="rs-hero rs-reveal"><div className="rs-copy"><span className="rs-kicker">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p><div><Link href="/auth/signup" className="rs-primary">Build your agent for free <ArrowRight size={16} /></Link><Link href="/enterprise" className="rs-secondary">Get a demo</Link></div></div><ConversationStage config={config} /></section>
    <TrustBand />
    <section className="rs-problem rs-reveal"><div><span className="rs-kicker">Problem</span><h2>{config.problemTitle}</h2></div><div className="rs-problem-grid">{config.problem.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="rs-solution rs-reveal"><div className="rs-solution-copy"><span className="rs-kicker">Solution</span><h2>{config.solutionTitle}</h2><p>Every part of the agent is designed to be useful in the conversation and clear to the team who governs it.</p><div className="rs-benefit-selector">{config.benefits.map(([title], index) => <button key={title} onClick={() => setActiveBenefit(index)} className={activeBenefit === index ? "active" : ""}><span>0{index + 1}</span>{title}</button>)}</div></div><article className="rs-benefit-stage"><span className="rs-stage-number">0{activeBenefit + 1}</span><CircleCheck size={25} /><h3>{config.benefits[activeBenefit][0]}</h3><p>{config.benefits[activeBenefit][1]}</p><div className="rs-stage-status"><i /> System ready <span>Live context</span></div></article></section>
    <InteractiveSteps steps={config.steps} />
    <section className="rs-platform rs-reveal"><div><span className="rs-kicker">One platform</span><h2>Everything you need to <em>build, deploy and improve</em></h2></div><div className="rs-platform-grid">{[[Layers3, "Training", "Ground answers in trusted data, policies and operating context."], [MessageCircle, "Channels", "Keep one customer conversation across the places people choose."], [Code2, "Procedures", "Write the steps of work plainly and act inside the workflow."], [Zap, "Widgets", "Use useful components instead of making customers leave the conversation."], [TicketCheck, "Helpdesk", "Bring humans in when they are needed, with the right context."], [UserRoundCheck, "Human in the loop", "Keep ownership, auditability and thoughtful control with your team."]].map(([Icon, title, body]) => <article key={title}><Icon size={20} /><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="rs-contrast"><div><span className="rs-kicker">The difference</span><h2>The same customer with <em>two very different experiences</em></h2></div><div className="rs-contrast-grid"><article><span>Legacy chatbots & ticket queues</span><h3>Decision trees, macros, contact forms</h3><ul><li>Scripted and impersonal</li><li>Feels like deflection</li><li>Issues wait in a queue</li></ul><strong>12+ hrs <small>First response</small></strong></article><article className="is-agent"><span>SOPRANOVA AI agents</span><h3>An AI agent, working as your brand</h3><ul><li>Helpful and tailored to the customer</li><li>Answers in seconds</li><li>Resolves work end to end</li></ul><strong>70%+ <small>Resolution rate</small></strong></article></div></section>
    <section className="rs-cta"><div><span className="rs-kicker">Ready to build?</span><h2>Every useful answer is a better <em>customer experience.</em></h2><Link href="/auth/signup" className="rs-primary light">Build your agent for free <ArrowRight size={16} /></Link></div><div className="rs-orbit"><i /><i /><i /><span>AI Agent</span></div></section>
  </main><PageFooter /></div>;
}
