export function BrandLogo({ className = 'w-10 h-10', light = false }: { className?: string; light?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo SISMUT RSUD Al-Mulk"
    >
      <path
        d="M32 4L10 13.5V30.5C10 44.8 19.4 56.9 32 60C44.6 56.9 54 44.8 54 30.5V13.5L32 4Z"
        fill={light ? '#238C89' : '#142D42'}
        stroke={light ? '#E5F3EF' : '#245A78'}
        strokeWidth="2.5"
      />
      <path
        d="M32 10L15 17.5V30.2C15 41.4 22.3 51 32 54C41.7 51 49 41.4 49 30.2V17.5L32 10Z"
        fill={light ? '#142D42' : '#245A78'}
        fillOpacity="0.45"
      />
      <path
        d="M22.5 32.5L28.5 38.5L42 25"
        stroke="#E5F3EF"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 16V20M30 18H34"
        stroke="#E5F3EF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
