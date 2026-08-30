import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import PublicNav from "../components/PublicNav";
import AnimatedSection from "../components/AnimatedSection";
import Logo from "../components/Logo";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

function HeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 0;

    const nodes = Array.from({ length: 18 }, () => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      r: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
    }));

    function draw() {
      if (!canvas) return;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      });
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach((b) => {
          const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < W * 0.3) {
            const alpha = (1 - dist / (W * 0.3)) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(91,111,168,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(a.x * W, a.y * H);
            ctx.lineTo(b.x * W, b.y * H);
            ctx.stroke();
          }
        });
      });
      nodes.forEach((n, i) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * n.speed + n.phase);
        const alpha = 0.25 + 0.35 * pulse;
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0
          ? `rgba(74,127,165,${alpha})`
          : i % 3 === 1
          ? `rgba(107,127,191,${alpha})`
          : `rgba(74,139,140,${alpha})`;
        ctx.fill();
      });
      const cx = W * 0.5, cy = H * 0.5;
      const r = 6 + 2 * Math.sin(t * 0.7);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
      grd.addColorStop(0, "rgba(107,127,191,0.5)");
      grd.addColorStop(1, "rgba(107,127,191,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(107,127,191,0.7)"; ctx.fill();
      if (!reducedMotion) animRef.current = requestAnimationFrame(draw);
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.82 }} aria-hidden="true" />;
}

function MotionBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-[46%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sn-accent/10" style={{ animation: "sn-spin-slow 28s linear infinite" }} />
      <div className="absolute left-1/2 top-[46%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sn-blue/10" style={{ animation: "sn-spin-slow 22s linear infinite reverse" }} />
      <div className="absolute left-[49%] top-[45%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sn-accent/10 blur-3xl" style={{ animation: "sn-pulse-soft 4.8s ease-in-out infinite" }} />
      <div className="absolute right-[18%] top-[26%] h-2 w-2 rounded-full bg-sn-teal/35" style={{ animation: "sn-float 5s ease-in-out infinite" }} />
      <div className="absolute left-[26%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-sn-blue/30" style={{ animation: "sn-float 6.5s ease-in-out infinite reverse" }} />
    </div>
  );
}

function HeroVideoLayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  // Playback state is synced through play/pause events so the toggle handlers
  // stay free of duplicated state writes.
  useEffect(() => {
    if (reducedMotion) videoRef.current?.pause();
  }, [reducedMotion]);

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setIsPlaying(false));
    else video.pause();
  };

  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seekVideo = (value: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = value * video.duration;
    setVideoProgress(value);
  };

  return (
    <>
      {!failed && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.18] mix-blend-multiply"
          autoPlay={!reducedMotion}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setVideoProgress(video.duration ? video.currentTime / video.duration : 0);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setFailed(true)}
          src="/manus-storage/sopranova-intelligence-loop_4515574a.mp4"
        />
      )}
      {!failed && videoDuration > 0 && (
        <div className="absolute bottom-8 right-6 z-20 flex w-[min(18rem,calc(100%-3rem))] items-center gap-3 rounded-full border border-white/45 bg-white/55 px-3 py-2 text-sn-navy shadow-[0_12px_40px_rgba(26,31,60,0.08)] backdrop-blur-md">
          <button type="button" onClick={toggleVideoPlayback} className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-sn-navy hover:text-sn-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sn-navy" aria-label={isPlaying ? "Pause hero video" : "Play hero video"}>
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <input type="range" min="0" max="1" step="0.001" value={videoProgress} onChange={(event) => seekVideo(Number(event.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer rounded-full accent-sn-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sn-navy" aria-label="Hero video progress" />
          <button type="button" onClick={toggleVideoMute} className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-sn-navy hover:text-sn-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sn-navy" aria-label={isMuted ? "Unmute hero video" : "Mute hero video"}>
            {isMuted ? "⌁" : "◖"}
          </button>
        </div>
      )}
    </>
  );
}

const capabilities = [
  { label: "AI Intelligence", desc: "Conversational intelligence across your entire enterprise data landscape." },
  { label: "Analytics", desc: "Real-time insights that surface patterns invisible to conventional tools." },
  { label: "AI Agents", desc: "Autonomous AI agents that act, decide, and learn from your workflows." },
  { label: "Memory", desc: "Enterprise memory that preserves institutional knowledge at scale." },
  { label: "Automation", desc: "Intelligent workflows that adapt and self-optimize over time." },
  { label: "Decisions", desc: "Decision intelligence that transforms data into confident action." },
];

const metrics = [
  { value: "94%", label: "Faster insight discovery" },
  { value: "3.2×", label: "Analyst productivity" },
  { value: "60+", label: "Enterprise integrations" },
  { value: "< 200ms", label: "Query response time" },
];

const trustedBy = ["Meridian Financial", "Atlas Corp", "Nexus Capital", "Vantage Industries", "Apex Systems", "Stratum Global"];

export default function Home() {
  const [activeCapability, setActiveCapability] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-sn-white">
      <PublicNav />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(107,127,191,0.06) 0%, transparent 70%)" }} />
        <HeroVideoLayer />
        <MotionBackdrop />
        <HeroVisual />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(20px)", transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <div className="max-w-3xl">
            <div className="sn-label mb-6">Enterprise Intelligence Platform</div>
            <h1 className="sn-display mb-6" style={{ fontSize: "clamp(2.75rem, 6vw, 5rem)", color: "#1A1F3C" }}>
              Intelligence,<br />
              <span style={{ color: "#6B7FBF" }}>without the</span><br />
              complexity.
            </h1>
            <p className="mb-10 max-w-xl leading-relaxed" style={{ fontSize: "1.125rem", color: "#6B6660" }}>
              SOPRANOVA connects enterprise data, AI, analytics, and automation into one intelligent platform. Power that feels effortless.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/platform" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300"
                style={{ background: "#1A1F3C", color: "#FAFAF8" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#252B4A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,31,60,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1F3C"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                Explore the Platform
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 border"
                style={{ borderColor: "#D4D1CB", color: "#1A1F3C" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1A1F3C"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D4D1CB"; e.currentTarget.style.transform = ""; }}>
                Talk to an Expert
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: heroVisible ? 0.4 : 0, transition: "opacity 1s 1s ease" }}>
          <div className="w-px h-10 bg-sn-400" style={{ animation: "sn-float 2s ease-in-out infinite" }} />
          <span className="sn-label" style={{ fontSize: "0.6rem" }}>Scroll</span>
        </div>
      </section>

      {/* Trusted By */}
      <section className="border-y border-sn-100 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="sn-label text-center mb-6">Trusted by leading enterprises</div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {trustedBy.map((name) => (
              <span key={name} className="text-sm font-medium" style={{ color: "#B8B4AC", letterSpacing: "0.04em" }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <AnimatedSection animation="slide-up" delay={100}>
          <div className="sn-label mb-4">Platform Capabilities</div>
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/2">
              <h2 className="sn-display mb-10" style={{ fontSize: "clamp(1.8rem, 3vw, 2.75rem)", color: "#1A1F3C" }}>
                Every layer of intelligence,<br />in one system.
              </h2>
              <div className="flex flex-col">
                {capabilities.map((cap, i) => (
                  <button key={cap.label} className="text-left py-4 border-b transition-all duration-300"
                    style={{ borderColor: i === activeCapability ? "#6B7FBF" : "#E8E6E2", borderBottomWidth: i === activeCapability ? "2px" : "1px" }}
                    onClick={() => setActiveCapability(i)} onMouseEnter={() => setActiveCapability(i)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: i === activeCapability ? "#1A1F3C" : "#8C887F" }}>{cap.label}</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                        style={{ transform: i === activeCapability ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.3s ease", color: i === activeCapability ? "#6B7FBF" : "#B8B4AC" }}>
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="text-sm leading-relaxed overflow-hidden"
                      style={{ maxHeight: i === activeCapability ? "80px" : "0", opacity: i === activeCapability ? 1 : 0, marginTop: i === activeCapability ? "8px" : "0", color: "#6B6660", transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
                      {cap.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 flex items-center">
              <div className="w-full rounded-2xl p-8 relative overflow-hidden" style={{ background: "#F4F3F0", minHeight: 360 }}>
                <div className="absolute inset-0 transition-all duration-700"
                  style={{ background: `radial-gradient(circle at ${30 + activeCapability * 12}% ${40 + activeCapability * 5}%, rgba(107,127,191,0.12) 0%, transparent 60%)` }} />
                <div className="relative">
                  <div className="sn-label mb-3">{capabilities[activeCapability].label}</div>
                  <div className="sn-display text-2xl mb-4" style={{ color: "#1A1F3C" }}>{capabilities[activeCapability].desc}</div>
                  <div className="flex gap-2 mt-8">
                    {capabilities.map((_, i) => (
                      <div key={i} className="h-1 rounded-full transition-all duration-500"
                        style={{ width: i === activeCapability ? 24 : 8, background: i === activeCapability ? "#6B7FBF" : "#D4D1CB" }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Metrics */}
      <section className="py-16 border-y border-sn-100">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection animation="fade" delay={200}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {metrics.map((m) => (
                <div key={m.label} className="text-center">
                  <div className="sn-display mb-2" style={{ fontSize: "2.25rem", color: "#1A1F3C" }}>{m.value}</div>
                  <div className="sn-label">{m.label}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <AnimatedSection animation="slide-up" delay={100}>
          <div className="text-center mb-16">
            <div className="sn-label mb-4">Intelligence System</div>
            <h2 className="sn-display" style={{ fontSize: "clamp(1.8rem, 3vw, 2.75rem)", color: "#1A1F3C" }}>From data to decision</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect", desc: "Integrate all enterprise data sources — structured, unstructured, and real-time." },
            { step: "02", title: "Understand", desc: "AI models build a deep semantic understanding of your business context." },
            { step: "03", title: "Analyze", desc: "Surface patterns, anomalies, and opportunities invisible to conventional tools." },
            { step: "04", title: "Act", desc: "Recommendations become decisions. Decisions trigger intelligent automation." },
          ].map((item, i) => (
            <AnimatedSection key={item.step} delay={i * 80}>
              <div className="p-6 rounded-2xl h-full transition-all duration-300" style={{ background: "#F4F3F0" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.background = "#ECEAE6"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.background = "#F4F3F0"; }}>
                <div className="sn-label mb-4">{item.step}</div>
                <h3 className="font-medium mb-2" style={{ fontSize: "1.125rem", color: "#1A1F3C" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8C887F" }}>{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection animation="scale" delay={150}>
            <div className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: "#1A1F3C" }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(107,127,191,0.15) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="sn-label mb-6" style={{ color: "rgba(248,246,242,0.4)" }}>Ready to begin</div>
                <h2 className="sn-display mb-6" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", color: "#F8F6F2" }}>
                  This is what enterprise<br />intelligence should feel like.
                </h2>
                <p className="mb-10 text-sm" style={{ color: "rgba(248,246,242,0.55)" }}>Join the enterprises that chose clarity over complexity.</p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link to="/signup" className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300"
                    style={{ background: "#F8F6F2", color: "#1A1F3C" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    Create Account
                  </Link>
                  <Link to="/contact" className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 border"
                    style={{ borderColor: "rgba(248,246,242,0.2)", color: "#F8F6F2" }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(248,246,242,0.5)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(248,246,242,0.2)"}>
                    Talk to an Expert
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sn-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size={22} showWordmark />
          <div className="flex flex-wrap gap-6 text-sm" style={{ color: "#8C887F" }}>
            {["Platform", "Intelligence", "AI Agents", "Solutions", "Enterprise", "About", "Contact"].map((l) => (
              <Link key={l} to={`/${l.toLowerCase().replace(" ", "-")}`} className="hover:text-sn-navy transition-colors">{l}</Link>
            ))}
          </div>
          <div className="text-sm" style={{ color: "#B8B4AC" }}>© 2026 SOPRANOVA</div>
        </div>
      </footer>
    </div>
  );
}
