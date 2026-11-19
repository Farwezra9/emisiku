// Simpan sebagai: app/components/dashboard-backdrop.tsx (file baru)
// Latar tipis bertema alam untuk area kerja: garis kontur dan bukit samar.

export default function DashboardBackdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    >
      <defs>
        <path
          id="db-contour"
          d="M-60 120 C 160 50, 360 190, 600 110 S 1000 30, 1260 120 S 1460 90, 1520 130"
          fill="none"
        />
      </defs>
      <g stroke="#2d6a4f" strokeWidth="1" opacity="0.09">
        {Array.from({ length: 16 }).map((_, i) => (
          <use
            key={i}
            href="#db-contour"
            y={i * 30}
            transform={`translate(${i % 2 === 0 ? 0 : -50} 0)`}
          />
        ))}
      </g>
      <path
        d="M0 790 C 260 740 480 785 720 752 S 1160 712 1440 765 V900 H0 Z"
        fill="#1b4332"
        opacity="0.06"
      />
      <path
        d="M0 850 C 300 815 560 845 820 825 S 1250 800 1440 830 V900 H0 Z"
        fill="#1b4332"
        opacity="0.07"
      />
    </svg>
  );
}