"use client";
import { useState, useEffect, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Module-level singleton so any component can push a toast
const listeners: Array<(t: Toast) => void> = [];

export function pushToast(message: string, type: ToastType = "info") {
  const toast: Toast = { id: Math.random().toString(36).slice(2), message, type };
  listeners.forEach((fn) => fn(toast));
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-lime/30 bg-lime-soft text-lime",
  error:   "border-danger/30 bg-danger/10 text-danger",
  info:    "border-subtle bg-surface-raised text-secondary",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
  }, []);

  useEffect(() => {
    listeners.push(add);
    return () => { const i = listeners.indexOf(add); if (i > -1) listeners.splice(i, 1); };
  }, [add]);

  return (
    <div className="fixed bottom-6 right-4 z-[70] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-lg animate-slide-up pointer-events-auto ${TYPE_STYLES[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
