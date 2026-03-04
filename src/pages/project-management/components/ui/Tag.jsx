export const Tag = ({ children, className = "" }) => (
  <span className={["inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", className].join(" ")}>
    {children}
  </span>
);