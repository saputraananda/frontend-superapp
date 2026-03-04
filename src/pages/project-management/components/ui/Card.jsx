export const Card = ({ children, className = "", ...props }) => (
  <div {...props} className={["rounded-xl bg-white border border-slate-200 shadow-sm", className].join(" ")}>
    {children}
  </div>
);