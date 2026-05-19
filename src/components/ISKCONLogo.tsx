'use client';
import React from 'react';

interface ISKCONLogoProps {
  size?: number;
  color?: string;
  fillColor?: string;
  className?: string;
}

/**
 * ISKCON Lotus Logo — faithful SVG recreation of the golden outline lotus.
 * 7 petals (centre, 2 inner, 2 outer, 2 wings) + seed pod, all overlapping
 * to produce the characteristic interlocking lattice of the original logo.
 */
const ISKCONLogo: React.FC<ISKCONLogoProps> = ({
  size = 48,
  color = '#c07800',
  fillColor = 'rgba(251,191,36,0.28)',
  className = '',
}) => {
  const f = fillColor;
  const s = color;
  const sw = 2.8;

  return (
    <svg
      width={size}
      height={Math.round(size * 190 / 280)}
      viewBox="0 0 280 190"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ISKCON Lotus"
    >
      {/* Wing petals drawn first (behind everything) */}
      <path d="M 102,148 C 65,160 22,152 4,118 C 24,136 65,138 100,138 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M 178,148 C 215,160 258,152 276,118 C 256,136 215,138 180,138 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>

      {/* Outer angled petals */}
      <path d="M 112,155 C 90,132 70,100 72,65 C 88,82 108,120 126,152 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M 168,155 C 190,132 210,100 208,65 C 192,82 172,120 154,152 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>

      {/* Inner flanking petals */}
      <path d="M 123,161 C 106,130 94,78 106,26 C 120,56 134,110 140,161 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M 157,161 C 174,130 186,78 174,26 C 160,56 146,110 140,161 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>

      {/* Centre petal — tallest, on top */}
      <path d="M 126,162 C 122,114 122,60 140,8 C 158,60 158,114 154,162 Z"
        fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>

      {/* Seed pod / bulb */}
      <path d="M 140,162 C 132,164 129,172 140,182 C 151,172 148,164 140,162 Z"
        fill={s} stroke={s} strokeWidth={sw * 0.6} strokeLinejoin="round"/>
    </svg>
  );
};

export default ISKCONLogo;
