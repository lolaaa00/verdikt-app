import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-secondary font-medium">{label}</label>}
      <input
        className={`bg-surface-soft border border-default rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-active focus:ring-1 focus:ring-lime/10 transition-all ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-secondary font-medium">{label}</label>}
      <textarea
        className={`bg-surface-soft border border-default rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-muted focus:outline-none focus:border-active focus:ring-1 focus:ring-lime/10 transition-all resize-none ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
