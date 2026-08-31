/** Reference style: warm editorial story detail with cobalt operational surface, short information columns and a clear route back to the customer archive. */
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import PublicNav from "@/components/PublicNav";
import { getCustomerStory } from "@/data/customerStories";
import { trackFrontendEvent } from "@/lib/frontendEvents";
import "./customer-story-detail.css";

export default function CustomerStoryDetail() {
  const [, params] = useRoute("/customers/:slug");
  const story = getCustomerStory(params?.slug);
  if (!story) return <div className="story-detail-site"><PublicNav /><main className="story-not-found"><Link href="/customers"><ArrowLeft size={15} /> Back to customers</Link><h1>That story is not<br /><em>available here.</em></h1></main></div>;
  return <div className="story-detail-site"><PublicNav /><main><section className="story-detail-hero"><div><Link className="story-back" href="/customers"><ArrowLeft size={15} /> All customer stories</Link><span className="eyebrow">{story.eyebrow}</span><h1>{story.company}<br /><em>{story.headline}</em></h1><p>{story.detail}</p></div><aside><span>AI</span><i /><i /><i /><b>Knowledge<br />to action</b></aside></section><section className="story-focus"><div><span className="eyebrow">Focus</span><h2>One experience,<br /><em>made legible.</em></h2></div><ul>{story.focus.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></section><section className="story-journey"><div><span className="eyebrow">How the system moves</span><h2>From a question to<br /><em>a next step.</em></h2></div><ol>{story.journey.map((item, index) => <li key={item.step}><span>0{index + 1}</span><div><h3>{item.step}</h3><p>{item.body}</p></div></li>)}</ol></section><section className="story-detail-cta"><div><Sparkles size={19} /><span className="eyebrow light">Continue the exploration</span><h2>Build a customer<br /><em>experience in motion.</em></h2><Link href="/auth/signup" onClick={() => trackFrontendEvent("cta_click", { location: "customer_story", story: story.slug })}>Start free trial <ArrowRight size={15} /></Link></div></section></main></div>;
}
