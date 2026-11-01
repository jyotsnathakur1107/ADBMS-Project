// src/components/UI.jsx - Reusable UI Component Library
import { forwardRef } from 'react';
import clsx from 'clsx';

// ─── Button ───────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, disabled, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 shadow-sm',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────
export function Badge({ children, variant = 'default', size = 'sm', className }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  return (
    <span className={clsx('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, className, hover, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={clsx('px-6 py-4 border-b border-slate-100', className)}>{children}</div>;
}
export function CardBody({ children, className }) {
  return <div className={clsx('px-6 py-4', className)}>{children}</div>;
}

// ─── Input ────────────────────────────────────────────────
export const Input = forwardRef(({ label, error, icon: Icon, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <input
        ref={ref}
        className={clsx(
          'block w-full rounded-lg border text-sm text-slate-900 placeholder-slate-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          Icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5',
          error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Input.displayName = 'Input';

// ─── Select ───────────────────────────────────────────────
export const Select = forwardRef(({ label, error, children, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <select
      ref={ref}
      className={clsx(
        'block w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 bg-white transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        error ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Select.displayName = 'Select';

// ─── Spinner ──────────────────────────────────────────────
export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' };
  return (
    <div className={clsx('rounded-full border-indigo-200 border-t-indigo-600 animate-spin', sizes[size], className)} />
  );
}

// ─── Loading Page ─────────────────────────────────────────
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center space-y-3">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>}
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Alert/Toast ──────────────────────────────────────────
export function Alert({ type = 'info', title, message, onClose, className }) {
  const styles = {
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: '✓' },
    error:   { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '✕' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: '⚠' },
    info:    { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', icon: 'ℹ' },
  };
  const s = styles[type] || styles.info;
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-lg border', s.bg, s.text, className)}>
      <span className="text-lg leading-none mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm">{title}</p>}
        {message && <p className="text-sm mt-0.5">{message}</p>}
      </div>
      {onClose && <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 flex-shrink-0">×</button>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={clsx('relative bg-white rounded-2xl shadow-2xl w-full animate-fade-in', sizes[size])}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xl">×</button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color = 'indigo', trend }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', val: 'text-indigo-900' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', val: 'text-amber-900' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', val: 'text-red-900' },
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', val: 'text-sky-900' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-900' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
          <p className={clsx('text-3xl font-bold', c.val)}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', c.bg)}>
          <Icon className={clsx('w-6 h-6', c.icon)} />
        </div>
      </div>
    </Card>
  );
}

// ─── Availability Badge ───────────────────────────────────
export function AvailabilityBadge({ status }) {
  const config = {
    available: { variant: 'success', label: 'Available' },
    limited:   { variant: 'warning', label: 'Limited Seats' },
    full:      { variant: 'danger',  label: 'Full' },
    cancelled: { variant: 'default', label: 'Cancelled' },
    closed:    { variant: 'default', label: 'Closed' },
  };
  const c = config[status] || config.available;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

// ─── Table ────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMessage = 'No data available' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col, i) => (
              <th key={i} className={clsx('px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider', col.align === 'right' ? 'text-right' : 'text-left')}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={columns.length} className="py-12 text-center text-slate-400">
              <Spinner className="mx-auto" />
            </td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-12 text-center text-slate-400">{emptyMessage}</td></tr>
          ) : data.map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-50 transition-colors">
              {columns.map((col, ci) => (
                <td key={ci} className={clsx('px-4 py-3 text-slate-700', col.align === 'right' && 'text-right')}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button variant="secondary" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>←</Button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const p = page <= 3 ? i + 1 : page - 2 + i;
        if (p < 1 || p > totalPages) return null;
        return (
          <button key={p} onClick={() => onPage(p)}
            className={clsx('w-8 h-8 rounded-lg text-sm font-medium',
              p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            {p}
          </button>
        );
      })}
      <Button variant="secondary" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>→</Button>
    </div>
  );
}
