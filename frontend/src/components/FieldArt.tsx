/**
 * The soft farm illustration behind the banners: sun, golden fields, wheat, and
 * (for the language screen) four people talking. Plain SVG shapes, about 2 KB,
 * no image download. Purely decorative.
 */
export function FieldArt({
  withPeople = false,
  className,
}: {
  withPeople?: boolean
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 130"
      preserveAspectRatio="xMidYMax slice"
      className={className}
    >
      <rect width="320" height="130" fill="#fff0d3" />
      {withPeople ? null : <circle cx="262" cy="30" r="16" fill="#f7d98a" />}
      <path
        d="M0 92 C60 70 120 84 190 74 S290 70 320 80 V130 H0Z"
        fill="#c9b52a"
      />
      <path
        d="M0 108 C70 92 140 104 210 96 S300 94 320 100 V130 H0Z"
        fill="#a89a1f"
      />
      {/* wheat */}
      <g stroke="#8f8419" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M18 128 V92 M28 128 V86 M38 128 V96 M10 128 V98" />
      </g>
      <g fill="#b7a523">
        <ellipse cx="18" cy="90" rx="3" ry="6" />
        <ellipse cx="28" cy="84" rx="3" ry="6" />
        <ellipse cx="38" cy="94" rx="3" ry="6" />
        <ellipse cx="10" cy="96" rx="3" ry="6" />
      </g>
      {withPeople ? (
        // Kept to the right half so the greeting text on the left never covers them.
        <g transform="translate(46 0)">
          {/* speech bubbles */}
          <g fill="#fff">
            <rect x="130" y="16" width="40" height="22" rx="8" />
            <rect x="186" y="34" width="42" height="22" rx="8" />
          </g>
          <g fill="#4a4a4a">
            <circle cx="142" cy="27" r="2" />
            <circle cx="150" cy="27" r="2" />
            <circle cx="158" cy="27" r="2" />
            <circle cx="199" cy="45" r="2" />
            <circle cx="207" cy="45" r="2" />
            <circle cx="215" cy="45" r="2" />
          </g>
          {/* people */}
          <g>
            <circle cx="120" cy="58" r="9" fill="#5a3825" />
            <path d="M104 96 C104 74 136 74 136 96Z" fill="#0b8a3a" />
            <circle cx="152" cy="54" r="9" fill="#7a4b2f" />
            <path d="M136 94 C136 70 168 70 168 94Z" fill="#067a30" />
            <circle cx="186" cy="62" r="9" fill="#4a2f1f" />
            <path d="M170 98 C170 76 202 76 202 98Z" fill="#0b8a3a" />
            <circle cx="224" cy="66" r="9" fill="#6b4128" />
            <path d="M208 100 C208 78 240 78 240 100Z" fill="#067a30" />
          </g>
        </g>
      ) : null}
    </svg>
  )
}
