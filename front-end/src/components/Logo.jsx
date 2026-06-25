export function LogoMark({ size = 32, variant = "light" }) {
  const ring = variant === "dark" ? "#ffffff" : "#0a1f44";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" stroke={ring} strokeWidth="3.5"/>
      <path d="M20 38 L29 28 L35 33 L46 20" stroke="#ff7a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38 20 H46 V28" stroke="#ff7a1a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function LogoMarkSquare({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0a1f44"/>
      <path d="M17 36 L26 27 L33 33 L46 18" stroke="#ff7a1a" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M36 18 H46 V28" stroke="#ff7a1a" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
