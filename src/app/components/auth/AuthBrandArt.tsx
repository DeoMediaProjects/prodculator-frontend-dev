/**
 * Custom brand artwork for the auth split-view left panel.
 *
 * A wireframe-globe graticule with territory markers and connecting routes —
 * a deliberate nod to the product (incentive & location intelligence across
 * 37 territories), not a generic gradient blob. Drawn as crisp vector so it
 * stays sharp at any panel size. Purely decorative, hidden from a11y tree.
 */
const GOLD = '#D4AF37';

// Territory markers, positioned on the globe's front face.
const MARKERS: Array<{ x: number; y: number; primary?: boolean }> = [
  { x: 185, y: 165, primary: true },
  { x: 315, y: 140 },
  { x: 345, y: 255 },
  { x: 160, y: 315 },
  { x: 275, y: 345 },
];

export function AuthBrandArt() {
  return (
    <svg
      viewBox="0 0 480 480"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <g fill="none" stroke={GOLD} strokeLinecap="round">
        {/* Globe outline + longitude ellipses */}
        <circle cx="240" cy="240" r="190" strokeOpacity="0.22" />
        <ellipse cx="240" cy="240" rx="133" ry="190" strokeOpacity="0.12" />
        <ellipse cx="240" cy="240" rx="71" ry="190" strokeOpacity="0.12" />
        <line x1="240" y1="50" x2="240" y2="430" strokeOpacity="0.12" />

        {/* Latitude chords */}
        <line x1="50" y1="240" x2="430" y2="240" strokeOpacity="0.14" />
        <line x1="76" y1="145" x2="404" y2="145" strokeOpacity="0.12" />
        <line x1="76" y1="335" x2="404" y2="335" strokeOpacity="0.12" />
        <line x1="145" y1="76" x2="335" y2="76" strokeOpacity="0.10" />
        <line x1="145" y1="404" x2="335" y2="404" strokeOpacity="0.10" />

        {/* Connecting routes between territories */}
        <path d="M185,165 Q250,110 315,140" strokeOpacity="0.35" strokeDasharray="3 5" />
        <path d="M315,140 Q368,195 345,255" strokeOpacity="0.35" strokeDasharray="3 5" />
        <path d="M345,255 Q320,320 275,345" strokeOpacity="0.28" strokeDasharray="3 5" />
      </g>

      {/* Territory markers */}
      {MARKERS.map((m) => (
        <g key={`${m.x}-${m.y}`}>
          <circle cx={m.x} cy={m.y} r={m.primary ? 13 : 10} fill={GOLD} fillOpacity="0.14" />
          <circle cx={m.x} cy={m.y} r={m.primary ? 4 : 3} fill={GOLD} fillOpacity={m.primary ? 0.9 : 0.6} />
        </g>
      ))}
    </svg>
  );
}
