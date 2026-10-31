/** Truck mark used for the PWA icons (rendered to PNG by ImageResponse). */
export function AppIconMark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, background: "#17201c", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6h11v10H2z" />
        <path d="M13 9h4l3 3.5V16h-7z" />
        <circle cx="6" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
      </svg>
    </div>
  );
}
