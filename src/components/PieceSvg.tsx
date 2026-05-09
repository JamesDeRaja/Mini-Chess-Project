import type { Color, PieceType } from '../game/types';

interface PieceSvgProps {
  color: Color;
  type: PieceType;
}

// Palette – white pieces: warm ivory; black pieces: deep charcoal
const W = { f: '#f7f3ec', s: '#3d2b1f' };
const B = { f: '#232018', s: '#0e0b07' };

type Pal = typeof W;

const SW = 1.5; // stroke-width for all pieces

// Common SVG wrapper
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      {children}
    </svg>
  );
}

// ── Base used by every piece (lower trapezoid) ──
function Base({ p }: { p: Pal }) {
  return (
    <>
      <rect x="12" y="31.5" width="21" height="4.5" rx="2" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <rect x="9.5" y="35.5" width="26" height="6" rx="3" fill={p.f} stroke={p.s} strokeWidth={SW} />
    </>
  );
}

// ── PAWN ── (cburnett path, CC BY-SA 3.0)
function Pawn({ p }: { p: Pal }) {
  return (
    <Svg>
      <path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={p.f}
        stroke={p.s}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── ROOK ──
function Rook({ p }: { p: Pal }) {
  return (
    <Svg>
      {/* Three merlons */}
      <rect x="9"  y="7.5" width="6" height="9" rx="1.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <rect x="19.5" y="7.5" width="6" height="9" rx="1.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <rect x="30" y="7.5" width="6" height="9" rx="1.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Merlon connecting bar */}
      <rect x="9" y="15" width="27" height="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Body */}
      <rect x="11" y="17" width="23" height="14.5" rx="1" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Inner detail lines */}
      <line x1="11" y1="21" x2="34" y2="21" stroke={p.s} strokeWidth="1" strokeOpacity="0.35" />
      <line x1="11" y1="27" x2="34" y2="27" stroke={p.s} strokeWidth="1" strokeOpacity="0.35" />
      <Base p={p} />
    </Svg>
  );
}

// ── KNIGHT ── (horse head in profile, facing right)
function Knight({ p }: { p: Pal }) {
  return (
    <Svg>
      {/* Main horse-head silhouette */}
      <path
        d="M13 37
          C12 31 12 26 14 22
          C13 19 12 15 13 12
          C14 9 16 7 19 7
          C20 5 22 4 24 6
          C27 5 30 7 31 10
          C33 13 32 18 30 21
          C32 20 35 20 35 22
          C35 24 33 25 30 24
          C29 27 27 30 27 37 Z"
        fill={p.f}
        stroke={p.s}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <circle cx="19.5" cy="11" r="1.8" fill={p.s} />
      {/* Nostril */}
      <circle cx="14.5" cy="19" r="1" fill={p.s} fillOpacity="0.6" />
      {/* Mane highlight line */}
      <path d="M22 8 C25 8 29 9 30 12" stroke={p.s} strokeWidth="1" strokeOpacity="0.4" fill="none" />
      <Base p={p} />
    </Svg>
  );
}

// ── BISHOP ──
function Bishop({ p }: { p: Pal }) {
  return (
    <Svg>
      {/* Ball at apex */}
      <circle cx="22.5" cy="8" r="3" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Hat / mitre body */}
      <path
        d="M20 10 C18 13 16 17 15.5 22 C15 26 16 29 17 31.5 H28 C29 29 30 26 29.5 22 C29 17 27 13 25 10 Z"
        fill={p.f}
        stroke={p.s}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diagonal slash (bishop's mitre opening) */}
      <line x1="17" y1="28" x2="28" y2="21" stroke={p.s} strokeWidth="1.4" strokeLinecap="round" />
      {/* Collar */}
      <path d="M15.5 31.5 C15.5 30 18 29 22.5 29 C27 29 29.5 30 29.5 31.5" fill="none" stroke={p.s} strokeWidth="1.2" strokeOpacity="0.55" />
      <Base p={p} />
    </Svg>
  );
}

// ── QUEEN ──
function Queen({ p }: { p: Pal }) {
  return (
    <Svg>
      {/* Crown balls */}
      <circle cx="8"    cy="13"  r="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <circle cx="15"   cy="8.5" r="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <circle cx="22.5" cy="7"   r="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <circle cx="30"   cy="8.5" r="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      <circle cx="37"   cy="13"  r="2.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Body connecting crown to base */}
      <path
        d="M8 13
          C6 20 8 25 11 31.5 H34
          C37 25 39 20 37 13
          C34 17 30 15 28 12
          C27 17 25 21 22.5 22
          C20 21 18 17 17 12
          C15 15 11 17 8 13 Z"
        fill={p.f}
        stroke={p.s}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Body detail line */}
      <path d="M11 31.5 C11 29 16 28 22.5 28 C29 28 34 29 34 31.5" fill="none" stroke={p.s} strokeWidth="1" strokeOpacity="0.4" />
      <Base p={p} />
    </Svg>
  );
}

// ── KING ──
function King({ p }: { p: Pal }) {
  return (
    <Svg>
      {/* Cross — vertical bar */}
      <rect x="21" y="2.5" width="3" height="11" rx="1.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Cross — horizontal bar */}
      <rect x="16" y="6"   width="13" height="3" rx="1.5" fill={p.f} stroke={p.s} strokeWidth={SW} />
      {/* Body */}
      <path
        d="M11 13
          C9 19 9 25 11 31.5 H34
          C36 25 36 19 34 13
          C31 17 27 15 25 12
          C24 17 23 20 22.5 20
          C22 20 21 17 20 12
          C18 15 14 17 11 13 Z"
        fill={p.f}
        stroke={p.s}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wing detail */}
      <path d="M11 25 C11 22 16 19 22.5 19 C29 19 34 22 34 25" fill="none" stroke={p.s} strokeWidth="1" strokeOpacity="0.4" />
      <Base p={p} />
    </Svg>
  );
}

export function PieceSvg({ color, type }: PieceSvgProps) {
  const p = color === 'white' ? W : B;
  switch (type) {
    case 'pawn':   return <Pawn   p={p} />;
    case 'rook':   return <Rook   p={p} />;
    case 'knight': return <Knight p={p} />;
    case 'bishop': return <Bishop p={p} />;
    case 'queen':  return <Queen  p={p} />;
    case 'king':   return <King   p={p} />;
  }
}
