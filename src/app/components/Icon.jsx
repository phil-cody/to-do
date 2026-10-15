import React from "react";
const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  list: <path d="M4 5h2M10 5h10M4 12h2M10 12h10M4 19h2M10 19h10" />,
  star: (
    <path d="m12 2.5 3 6.2 6.8 1-4.9 4.8 1.2 6.8L12 18.1l-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1Z" />
  ),
  chevron: <path d="m5 9 7 7 7-7" />,
};
export default function Icon({ name, filled = false, className = "" }) {
  return (
    <svg
      className={`button-icon ${className}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
