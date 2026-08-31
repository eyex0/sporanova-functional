interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function Logo({ size = 32, color = "#1A1F3C", className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="20" y1="20" x2="80" y2="80" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <line x1="80" y1="20" x2="20" y2="80" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <rect x="30" y="30" width="40" height="40" rx="6" transform="rotate(45 50 50)" stroke={color} strokeWidth="3" fill="none" />
      <line x1="50" y1="38" x2="50" y2="62" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="38" y1="50" x2="62" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
