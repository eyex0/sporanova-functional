// @ts-nocheck
/** Reference style: observed SOPRANOVA public navigation with two-column product menus, exact routes, 150ms state transitions and Geist/Inter hierarchy. */
import { useState } from "react";
import "../pages/public-pages.css";
import "../pages/proximity-motion.css";
import { ChevronDown, Menu, X, Headphones, BriefcaseBusiness, Layers3, PanelsTopLeft, ShoppingBag, GraduationCap, Dumbbell, Plane, BookOpen, FileText, Clock3, Newspaper, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import Logo from "./Logo";

const solutionGroups = [
  { title: "By use-case", items: [["Customer Support Agent", "Instant answers, lower volume, fewer escalations", "/use-cases/customer-support", Headphones], ["Sales Agent", "Qualify leads, answer questions, and book meetings", "/use-cases/sales-agent", BriefcaseBusiness]] },
  { title: "Features", items: [["Product Overview", "Build, deploy and optimize AI agents", "/features/product-overview", Layers3], ["HelpDesk", "Hand off complex issues to humans", "/features/helpdesk", PanelsTopLeft]] },
  { title: "By industry", items: [["Ecommerce & Retail", "Product questions, shipping, and returns", "/industries/ecommerce-retail", ShoppingBag], ["Education & Training", "Admissions, enrolment, and student questions", "/industries/education-training", GraduationCap], ["Fitness & Wellness", "Bookings, cancellations, and member support", "/industries/fitness-wellness", Dumbbell], ["Travel & Hospitality", "Bookings, disruptions, and refunds", "/industries/travel-hospitality", Plane]] },
];

const resourceItems = [["Blog", "Product updates, tips, and insights from SOPRANOVA", "/blog", Newspaper], ["Changelog", "Stay up to date with the latest updates and features", "/changelog", Clock3]];

export default function PublicNav() {
  const [open, setOpen] = useState<"solutions" | "resources" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => { setOpen(null); setMobileOpen(false); };

  return <header className="public-header" onMouseLeave={() => setOpen(null)}>
    <Link className="brand" href="/" onClick={close}><Logo size={30} /><span>SOPRANOVA</span></Link>
    <nav className={mobileOpen ? "public-nav mobile-open" : "public-nav"} aria-label="Primary navigation">
      <button className={open === "solutions" ? "nav-trigger active" : "nav-trigger"} onPointerEnter={() => setOpen("solutions")} onFocus={() => setOpen("solutions")} onClick={() => setOpen(open === "solutions" ? null : "solutions")}>Solutions <ChevronDown size={13} /></button>
      <button className={open === "resources" ? "nav-trigger active" : "nav-trigger"} onPointerEnter={() => setOpen("resources")} onFocus={() => setOpen("resources")} onClick={() => setOpen(open === "resources" ? null : "resources")}>Resources <ChevronDown size={13} /></button>
      <Link href="/customers" onClick={close}>Customers</Link><Link href="/enterprise" onClick={close}>Enterprise</Link><Link href="/pricing" onClick={close}>Pricing</Link>
    </nav>
    <div className="public-nav-actions"><Link className="signin-link" href="/auth/signin" onClick={close}>Sign in</Link><Link className="nav-trial" href="/auth/signup" onClick={close}>Try for Free <ArrowUpRight size={14} /></Link><button className="public-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    {open === "solutions" && <div className="mega-menu solutions-mega"><div className="solutions-menu-primary">{solutionGroups.slice(0, 2).map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map(([title, description, href, Icon]) => <Link className="mega-item" href={href as string} onClick={close} key={title as string}><span className="mega-icon"><Icon size={17} /></span><span><b>{title}</b><small>{description}</small></span></Link>)}</section>)}</div><section>{solutionGroups[2].items.map(([title, description, href, Icon], index) => <Link className="mega-item" href={href as string} onClick={close} key={title as string}>{index === 0 && <span className="solutions-menu-heading">By industry</span>}<span className="mega-icon"><Icon size={17} /></span><span><b>{title}</b><small>{description}</small></span></Link>)}</section></div>}
    {open === "resources" && <div className="mega-menu resources-mega"><section><h2>Resources</h2>{resourceItems.map(([title, description, href, Icon]) => <Link className="mega-item" href={href as string} onClick={close} key={title as string}><span className="mega-icon"><Icon size={17} /></span><span><b>{title}</b><small>{description}</small></span></Link>)}</section><aside className="mega-update"><div className="update-thumb"><span>Center stage<br /><em>is now live</em></span><i /></div><b>Center Stage is now live</b><p>You can now place your SOPRANOVA AI agent directly in the center of your website.</p><Link href="/changelog/center-stage-is-live" onClick={close}>Read update <ArrowUpRight size={14} /></Link></aside></div>}
  </header>;
}
