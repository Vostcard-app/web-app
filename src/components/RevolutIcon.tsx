import React from 'react';

interface RevolutIconProps {
  size?: number;
  color?: string;
}

const RevolutIcon: React.FC<RevolutIconProps> = ({ size = 16, color = '#0075EB' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M134 82h244c55.2 0 100 44.8 100 100v48c0 55.2-44.8 100-100 100h-114l114 120H298l-114-120H134V82zm0 168h244c22.1 0 40-17.9 40-40v-48c0-22.1-17.9-40-40-40H134v128z"
        fill={color}
      />
    </svg>
  );
};

export default RevolutIcon;
