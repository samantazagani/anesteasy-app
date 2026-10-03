// Identita' dell'app: usare SOLO nell'header del drawer mobile e in cima alla sidebar
// desktop, non dentro le schermate dei moduli.
export function Logomark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#8b5cf6" />
      <path
        d="M6 17h4.5l2.2-8.5L17 25l3-15 1.8 7h4.2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
