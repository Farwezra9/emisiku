// Simpan sebagai: app/components/nature-backdrop.tsx
// Latar ilustrasi hutan berbasis SVG (tanpa file gambar tambahan).

type Props = { className?: string };

const PINES: { x: number; y: number; s: number }[] = [
  { x: 90, y: 700, s: 1.5 },
  { x: 150, y: 708, s: 1.1 },
  { x: 210, y: 698, s: 1.8 },
  { x: 275, y: 712, s: 1.2 },
  { x: 1060, y: 668, s: 1.4 },
  { x: 1125, y: 676, s: 1.9 },
  { x: 1190, y: 668, s: 1.2 },
  { x: 1255, y: 680, s: 1.6 },
  { x: 1330, y: 690, s: 1.3 },
  { x: 1395, y: 684, s: 2 },
];

export function NatureBackdrop({ className = "" }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id="nb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081c15" />
          <stop offset="0.55" stopColor="#0f2f23" />
          <stop offset="1" stopColor="#1b4332" />
        </linearGradient>
        <radialGradient id="nb-glow" cx="0.74" cy="0.28" r="0.45">
          <stop offset="0" stopColor="#e9d8a6" stopOpacity="0.28" />
          <stop offset="1" stopColor="#e9d8a6" stopOpacity="0" />
        </radialGradient>
        <path
          id="nb-contour"
          d="M-60 150 C 160 80, 360 220, 600 140 S 1000 60, 1260 150 S 1460 120, 1520 160"
          fill="none"
        />
        <g id="nb-pine">
          <rect x="-3" y="0" width="6" height="14" />
          <path d="M0 -78 L17 -38 L9 -38 L23 -8 L11 -8 L26 14 L-26 14 L-11 -8 L-23 -8 L-9 -38 L-17 -38 Z" />
        </g>
      </defs>

      <rect width="1440" height="900" fill="url(#nb-sky)" />
      <rect width="1440" height="900" fill="url(#nb-glow)" />

      {/* Garis kontur topografi */}
      <g stroke="#b7d3b0" strokeWidth="1" opacity="0.1">
        {Array.from({ length: 11 }).map((_, i) => (
          <use
            key={i}
            href="#nb-contour"
            y={i * 26}
            transform={`translate(${i % 2 === 0 ? 0 : -40} 0)`}
          />
        ))}
      </g>

      {/* Bukit berlapis */}
      <path
        d="M0 640 C 180 560 340 610 520 565 S 880 480 1100 540 S 1360 610 1440 565 V900 H0 Z"
        fill="#1d4a37"
      />
      <path
        d="M0 720 C 220 650 420 705 640 662 S 1020 600 1240 655 S 1400 695 1440 672 V900 H0 Z"
        fill="#143a2b"
      />

      {/* Pohon pinus di bukit tengah */}
      <g fill="#0c2a1f">
        {PINES.map((p, i) => (
          <use
            key={i}
            href="#nb-pine"
            transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
          />
        ))}
      </g>

      <path
        d="M0 810 C 260 758 480 800 720 768 S 1160 726 1440 778 V900 H0 Z"
        fill="#0a2118"
      />
    </svg>
  );
}