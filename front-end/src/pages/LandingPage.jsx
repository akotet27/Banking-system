import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "../components/Logo";
import { useTheme } from "../contexts/ThemeContext";

function useCount(to, duration = 2000) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return val;
}

const TXNS = [
  { label: "Received from J. Mugisha", amount: "+50,000",  pos: true,  time: "2 min ago" },
  { label: "Nakumatt Kigali",          amount: "−12,400",  pos: false, time: "1 hr ago" },
  { label: "Agent Cash In",            amount: "+100,000", pos: true,  time: "Yesterday" },
  { label: "Send to A. Uwase",         amount: "−8,500",   pos: false, time: "2 days ago" },
];

const QUICK = [
  { label: "Send",     icon: "↗" },
  { label: "Cash Out", icon: "⬇" },
  { label: "Cash In",  icon: "⬆" },
  { label: "Pay",      icon: "🏪" },
];

function PhoneMockup() {
  const balance = useCount(124500, 2200);
  const [shown, setShown] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timers = TXNS.map((_, i) =>
      setTimeout(() => setShown(s => Math.max(s, i + 1)), 2500 + i * 380)
    );
    const id = setInterval(() => setPulse(p => !p), 1400);
    return () => { timers.forEach(clearTimeout); clearInterval(id); };
  }, []);

  return (
    <div style={{
      width: 252, height: 510,
      background: "#0c1a30", borderRadius: 38,
      border: "6px solid #19293f",
      boxShadow: "0 48px 96px rgba(10,31,68,.48), 0 0 0 1px rgba(255,255,255,.06), inset 0 1px 0 rgba(255,255,255,.08)",
      overflow: "hidden", position: "relative",
      fontFamily: "'Inter', sans-serif", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 72, height: 20, background: "#0c1a30", borderRadius: "0 0 14px 14px", zIndex: 10 }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px 4px", fontSize: 10, color: "#5a7a9e" }}>
        <span style={{ fontWeight: 600 }}>9:41</span>
        <span>●●● 🔋</span>
      </div>
      <div style={{ padding: "6px 16px 8px", borderBottom: "1px solid #19293f" }}>
        <p style={{ margin: 0, fontSize: 10, color: "#5a7a9e" }}>Welcome back</p>
        <p style={{ margin: 0, fontSize: 12, color: "#dde8f6", fontWeight: 600 }}>+250 788 123 456</p>
      </div>
      <div style={{ margin: "10px 12px", background: "linear-gradient(140deg, #1a73c4 0%, #0a4090 100%)", borderRadius: 16, padding: "12px 14px", boxShadow: "0 8px 24px rgba(26,115,196,.4)" }}>
        <p style={{ margin: "0 0 2px", fontSize: 9, color: "#93bff4", textTransform: "uppercase", letterSpacing: 1 }}>Available Balance</p>
        <p style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.8 }}>
          {balance.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500 }}>RWF</span>
        </p>
        <div style={{ display: "flex", gap: 5 }}>
          {QUICK.map(a => (
            <div key={a.label} style={{ flex: 1, background: "rgba(255,255,255,.14)", borderRadius: 9, padding: "5px 2px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#fff" }}>{a.icon}</div>
              <div style={{ fontSize: 8, color: "#c8e0ff", marginTop: 1 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", background: pulse ? "rgba(15,179,125,.09)" : "transparent", transition: "background .7s" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: pulse ? "#0fb37d" : "#243550", boxShadow: pulse ? "0 0 0 3px rgba(15,179,125,.25)" : "none", transition: "all .7s" }} />
        <span style={{ fontSize: 9, color: "#3d5e84" }}>{pulse ? "Agent session · 2:14 remaining" : "No active sessions"}</span>
      </div>
      <div style={{ padding: "6px 14px 0" }}>
        <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 600, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: .8 }}>Recent</p>
        {TXNS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111e30", opacity: shown > i ? 1 : 0, transform: shown > i ? "translateY(0)" : "translateY(5px)", transition: "opacity .4s, transform .4s" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: t.pos ? "rgba(15,179,125,.18)" : "rgba(239,68,68,.14)", color: t.pos ? "#0fb37d" : "#f87171" }}>
                {t.pos ? "↓" : "↑"}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 9, color: "#ccdaef" }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: 8, color: "#4a6a8a" }}>{t.time}</p>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.pos ? "#0fb37d" : "#f87171" }}>{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff7a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const FEATURES = [
  { icon: "⬆", color: "#0fb37d", title: "Cash In - Free",          desc: "Deposit cash through any agent. No fees, no waiting." },
  { icon: "↗", color: "#1a73c4", title: "Send Money",              desc: "Transfer to any phone number in seconds. Instant settlement." },
  { icon: <ShieldIcon />, color: "#ff7a1a", title: "Privacy-first Cash Out", desc: "Agents never see your balance - only a yes or no on your phone." },
];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function LandingPage() {
  const { dark, toggleDark } = useTheme();

  const c = dark ? {
    pageBg:         "#080f1e",
    navBg:          "rgba(8,15,30,.92)",
    navBorder:      "rgba(255,255,255,.07)",
    text:           "#e8f2ff",
    textSub:        "#7a9dc0",
    textMuted:      "#4a6a8a",
    blue:           "#4d9de0",
    blueText:       "#7ab8f0",
    badgeBg:        "#0d1f3a",
    badgeBorder:    "#1e3a5c",
    cardBg:         "#0d1a2d",
    cardBorder:     "#1e3050",
    secBtnBg:       "#0d1a2d",
    secBtnBorder:   "#1e3050",
    secBtnText:     "#e8f2ff",
    footerBorder:   "#1a2e4a",
    toggleBg:       "rgba(255,255,255,.08)",
    toggleBorder:   "rgba(255,255,255,.12)",
    toggleColor:    "#e8f2ff",
  } : {
    pageBg:         "#f4f8fc",
    navBg:          "rgba(244,248,252,.88)",
    navBorder:      "rgba(10,31,68,.07)",
    text:           "#0a1f44",
    textSub:        "#3a5880",
    textMuted:      "#7a9ab8",
    blue:           "#1a73c4",
    blueText:       "#1a56a8",
    badgeBg:        "#deeeff",
    badgeBorder:    "#b8d5f6",
    cardBg:         "#fff",
    cardBorder:     "#e0eaf6",
    secBtnBg:       "#fff",
    secBtnBorder:   "#ccdaee",
    secBtnText:     "#0a1f44",
    footerBorder:   "#e0eaf6",
    toggleBg:       "rgba(10,31,68,.06)",
    toggleBorder:   "rgba(10,31,68,.12)",
    toggleColor:    "#0a1f44",
  };

  const display = { fontFamily: "'Space Grotesk', sans-serif" };
  const body    = { fontFamily: "'Inter', sans-serif" };

  return (
    <div style={{ ...body, background: c.pageBg, color: c.text, overflowX: "hidden", transition: "background .25s, color .25s" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: c.navBg, backdropFilter: "blur(14px)", borderBottom: `1px solid ${c.navBorder}`, padding: "0 6%", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background .25s, border-color .25s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={34} variant="light" />
          <span style={{ ...display, fontWeight: 700, fontSize: 17, letterSpacing: -.4 }}>Ishimwe Bank</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to="/login" style={{ ...body, fontSize: 14, color: c.blue, textDecoration: "none", fontWeight: 600, padding: "8px 14px" }}>Sign in</Link>
          <Link to="/register" style={{ ...body, fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", padding: "9px 20px", borderRadius: 10, background: "#ff7a1a", boxShadow: "0 2px 12px rgba(255,122,26,.3)" }}>Get Started</Link>
          {/* Theme toggle */}
          <button
            onClick={toggleDark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${c.toggleBorder}`,
              background: c.toggleBg, color: c.toggleColor, cursor: "pointer",
              transition: "background .25s, border-color .25s, color .25s",
            }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "76px 6% 80px", display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 400px", maxWidth: 510 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: c.badgeBg, border: `1px solid ${c.badgeBorder}`, borderRadius: 100, padding: "5px 14px", marginBottom: 28, transition: "background .25s, border-color .25s" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0fb37d", display: "inline-block" }} />
            <span style={{ ...body, fontSize: 12, fontWeight: 600, color: c.blueText, letterSpacing: .3 }}>Rwanda's Mobile Money Platform</span>
          </div>

          <h1 style={{ ...display, fontSize: "clamp(38px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.6, margin: "0 0 22px" }}>
            Banking built<br />
            <span style={{ color: c.blue }}>for</span>{" "}
            <span style={{ color: "#ff7a1a" }}>Rwanda.</span>
          </h1>

          <p style={{ fontSize: 17, color: c.textSub, lineHeight: 1.68, margin: "0 0 34px", maxWidth: 450, transition: "color .25s" }}>
            Send money, pay merchants, and cash in or out through a trusted agent network — with sessions that keep your balance invisible to agents at all times.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
            <Link to="/register" style={{ ...body, textDecoration: "none", fontWeight: 700, fontSize: 15, color: "#fff", padding: "14px 30px", borderRadius: 13, background: "#ff7a1a", boxShadow: "0 6px 24px rgba(255,122,26,.38)" }}>
              Open an Account →
            </Link>
            <Link to="/login" style={{ ...body, textDecoration: "none", fontWeight: 600, fontSize: 15, color: c.secBtnText, padding: "14px 28px", borderRadius: 13, background: c.secBtnBg, border: `1.5px solid ${c.secBtnBorder}`, transition: "background .25s, color .25s, border-color .25s" }}>
              Sign In
            </Link>
          </div>

          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {["Zero deposit fees", "Privacy-first sessions", "Instant transfers"].map(t => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: c.textSub, transition: "color .25s" }}>
                <span style={{ color: "#0fb37d", fontWeight: 700 }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 260px", display: "flex", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", width: 320, height: 320, background: "radial-gradient(circle, rgba(26,115,196,.16) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
          <PhoneMockup />
        </div>
      </section>

      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* FEATURES */}
      <section style={{ padding: "60px 6% 80px", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: c.cardBg, borderRadius: 20, padding: "28px 26px", border: `1.5px solid ${c.cardBorder}`, boxShadow: dark ? "0 2px 16px rgba(0,0,0,.2)" : "0 2px 16px rgba(10,31,68,.05)", transition: "background .25s, border-color .25s" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ ...display, fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: c.text, transition: "color .25s" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: c.textSub, lineHeight: 1.6, margin: 0, transition: "color .25s" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 6% 80px", textAlign: "center" }}>
        <h2 style={{ ...display, fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: -1, margin: "0 0 14px", color: c.text, transition: "color .25s" }}>
          Ready to get started?
        </h2>
        <p style={{ fontSize: 16, color: c.textSub, margin: "0 auto 32px", maxWidth: 380, transition: "color .25s" }}>
          Open your Ishimwe Bank account in under 2 minutes. No branch visit required.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <Link to="/register" style={{ ...body, textDecoration: "none", fontWeight: 700, fontSize: 16, color: "#fff", padding: "15px 36px", borderRadius: 13, background: "#ff7a1a", boxShadow: "0 6px 28px rgba(255,122,26,.38)" }}>
            Open an Account →
          </Link>
          <Link to="/login" style={{ ...body, textDecoration: "none", fontWeight: 600, fontSize: 16, color: c.secBtnText, padding: "15px 34px", borderRadius: 13, background: c.secBtnBg, border: `1.5px solid ${c.secBtnBorder}`, transition: "background .25s, color .25s, border-color .25s" }}>
            Already have an account
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${c.footerBorder}`, padding: "22px 6%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, transition: "border-color .25s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoMark size={24} variant="light" />
          <span style={{ ...display, fontWeight: 700, fontSize: 14, color: c.text, transition: "color .25s" }}>Ishimwe Bank</span>
        </div>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Kigali, Rwanda 🇷🇼</p>
      </footer>

    </div>
  );
}
