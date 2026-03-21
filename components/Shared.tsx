import React from 'react';

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
    {children}
  </div>
);

// ─── Button ───────────────────────────────────────────────────────────────────
export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  className?: string;
  type?: "button' | 'submit" | "reset";
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = "", type = 'button', disabled = false }) => {
  const styles = {
    primary:   "bg-cac-green text-white hover:bg-cac-dark",
    secondary: "bg-cac-gold text-white hover:opacity-90",
    outline:   "border-2 border-cac-green text-cac-green hover:bg-cac-light",
    danger:    "bg-cac-red text-white hover:opacity-90",
    ghost:     "bg-slate-100 text-slate-600 hover:bg-slate-200",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────
// Supports both old usage: <Badge status="Filed" />
// And new usage: <Badge text="Filed" variant="success" />
export const Badge: React.FC<{
  status?: string;
  text?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
}> = ({ status, text, variant }) => {
  const label = text || status || '';

  // If variant is explicitly passed, use it
  let style = "bg-gray-100 text-gray-700 border-gray-200";
  if (variant === 'success') style = "bg-green-100 text-green-700 border-green-200";
  else if (variant === 'warning') style = "bg-amber-100 text-amber-700 border-amber-200";
  else if (variant === 'danger') style = "bg-red-100 text-red-700 border-red-200";
  else if (variant === 'info') style = "bg-blue-100 text-blue-700 border-blue-200";
  // Fallback: infer from status string
  else if (label === 'Filed') style = "bg-green-100 text-green-700 border-green-200";
  else if (label === 'Due') style = "bg-amber-100 text-amber-700 border-amber-200";
  else if (label === 'Upcoming') style = "bg-blue-100 text-blue-700 border-blue-200";
  else if (label === 'Overdue') style = "bg-red-100 text-red-700 border-red-200";

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${style}`}>
      {label.toUpperCase()}
    </span>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <input
      {...props}
      className={`px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cac-green focus:border-cac-green transition-all text-sm bg-white ${className}`}
    />
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <select
      {...props}
      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cac-green focus:border-cac-green transition-all text-sm"
    >
      {children}
    </select>
  </div>
);
