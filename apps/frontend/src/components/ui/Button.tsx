// components/ui/Button.tsx
export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'success' | 'whatsapp' }) {
  const variants = {
    primary: 'bg-[var(--accent)] text-black font-heading font-bold shadow-lg shadow-[var(--accent)]/30',
    outline: 'bg-[var(--surface2)] border border-[var(--border2)] text-[var(--text2)]',
    success: 'bg-[var(--green)] text-white font-heading font-bold shadow-lg shadow-[var(--green)]/30',
    whatsapp: 'bg-[var(--wa)] text-white shadow-lg shadow-[var(--wa)]/35',
  };
  
  return (
    <button 
      className={`px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}