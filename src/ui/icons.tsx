import type {SVGProps} from 'react';

type P = SVGProps<SVGSVGElement> & {size?: number};
const base = (size: number, p: P) => {
  const {size: _s, ...rest} = p;
  return {width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false, ...rest} as const;
};

export const Play = ({size = 18, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </svg>
);
export const GarageIcon = ({size = 18, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M3 10l9-6 9 6v10h-3v-7H6v7H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 16h8M8 19h8" stroke="currentColor" strokeWidth="2" />
  </svg>
);
export const Flag = ({size = 18, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M5 21V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 4h13l-3 4.5 3 4.5H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
export const Back = ({size = 18, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Lock = ({size = 14, ...p}: P) => (
  <svg {...base(size, p)}>
    <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);
export const Check = ({size = 14, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Sound = ({size = 16, off = false, ...p}: P & {off?: boolean}) => (
  <svg {...base(size, p)}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {off ? (
      <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    ) : (
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    )}
  </svg>
);
export const Gauge = ({size = 16, ...p}: P) => (
  <svg {...base(size, p)}>
    <path d="M4 17a8 8 0 1 1 16 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M12 17l4-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

/** The CUT UP wordmark: the letters are sliced along a diagonal and the top half shifts, like a lane change. */
export function Logo({size = 1}: {size?: number}) {
  return (
    <svg viewBox="0 0 260 64" width={260 * size} height={64 * size} className="logo" role="img" aria-label="CUT UP">
      <defs>
        <clipPath id="logo-top">
          <path d="M0 0H260V22L0 40Z" />
        </clipPath>
        <clipPath id="logo-bot">
          <path d="M0 40L260 22V64H0Z" />
        </clipPath>
        <linearGradient id="logo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c8d6e6" />
        </linearGradient>
      </defs>
      <g clipPath="url(#logo-bot)">
        <text x="4" y="54" fontSize="58" fontWeight="900" fontStyle="italic" fill="url(#logo-fill)" letterSpacing="-2" fontFamily="system-ui, Arial">
          CUT UP
        </text>
      </g>
      <g clipPath="url(#logo-top)" transform="translate(7 -1)">
        <text x="4" y="54" fontSize="58" fontWeight="900" fontStyle="italic" fill="url(#logo-fill)" letterSpacing="-2" fontFamily="system-ui, Arial">
          CUT UP
        </text>
      </g>
      <path d="M0 41.5L260 23.5" stroke="#35f2ff" strokeWidth="2.5" />
    </svg>
  );
}
