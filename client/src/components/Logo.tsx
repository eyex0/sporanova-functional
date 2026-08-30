interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
  showWordmark?: boolean;
  wordmarkColor?: string;
}

export default function Logo({ size = 32, color = "#1A1F3C", className = "", showWordmark = true, wordmarkColor }: LogoProps) {
  const wc = wordmarkColor || color;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="6" x2="6" y2="20" stroke={color} strokeWidth="0.8" opacity="0.25" />
        <line x1="20" y1="6" x2="34" y2="20" stroke={color} strokeWidth="0.8" opacity="0.25" />
        <line x1="20" y1="34" x2="6" y2="20" stroke={color} strokeWidth="0.8" opacity="0.25" />
        <line x1="20" y1="34" x2="34" y2="20" stroke={color} strokeWidth="0.8" opacity="0.25" />
        <rect x="10.5" y="10.5" width="19" height="19" rx="3.5" transform="rotate(45 20 20)" stroke={color} strokeWidth="1.4" fill="none" />
        <line x1="20" y1="13.5" x2="20" y2="26.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="13.5" y1="20" x2="26.5" y2="20" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: size * 0.5, letterSpacing: "0.02em", color: wc, textTransform: "uppercase" }}>
          SOPRANOVA
        </span>
      )}
    </div>
  );
}
