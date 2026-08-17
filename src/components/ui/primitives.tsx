import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import Link from "next/link";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--slate-100)] rounded-xl shadow-sm ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  href?: string;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-[var(--slate-950)] text-white hover:bg-[var(--slate-800)]",
    secondary: "bg-white border border-[var(--slate-300)] text-[var(--slate-900)] hover:bg-[var(--slate-50)]",
    ghost: "text-[var(--slate-700)] hover:bg-[var(--slate-100)]",
    danger: "bg-[var(--rec)] text-white hover:bg-[#c9362e]",
  };
  const cls = `${base} ${sizes} ${variants[variant]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[var(--slate-300)] px-3 py-2 text-sm outline-none focus:border-[var(--slate-950)] focus:ring-1 focus:ring-[var(--slate-950)] ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[var(--slate-300)] px-3 py-2 text-sm outline-none focus:border-[var(--slate-950)] focus:ring-1 focus:ring-[var(--slate-950)] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-[var(--slate-300)] px-3 py-2 text-sm outline-none focus:border-[var(--slate-950)] bg-white ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-[var(--slate-500)] mb-1 font-mono-data uppercase tracking-wide">{children}</label>;
}

// Status chip styled after a slate/timecode tag — the app's signature data element.
export function StatusTag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const tones: Record<string, string> = {
    good: "bg-[var(--good-dim)] text-[var(--good)]",
    warn: "bg-[var(--amber-dim)] text-[#8a5a10]",
    bad: "bg-[var(--rec-dim)] text-[var(--rec)]",
    neutral: "bg-[var(--slate-100)] text-[var(--slate-700)]",
  };
  return (
    <span className={`font-mono-data inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-wide font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[var(--slate-700)]">{label}</span>
      <span className="flex items-center gap-2">
        {detail && !ok ? <span className="text-xs text-[var(--slate-500)]">{detail}</span> : null}
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${ok ? "bg-[var(--good-dim)] text-[var(--good)]" : "bg-[var(--amber-dim)] text-[#8a5a10]"}`}>
          {ok ? "✓" : "!"}
        </span>
      </span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-[var(--slate-300)] rounded-xl">
      <p className="font-semibold text-[var(--slate-900)]">{title}</p>
      <p className="text-sm text-[var(--slate-500)] mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
