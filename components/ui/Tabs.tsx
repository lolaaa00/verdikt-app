"use client";

interface Tab { key: string; label: string; count?: number }

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex items-center gap-1 bg-surface rounded-xl p-1 border border-subtle ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === tab.key
              ? "bg-lime text-black font-bold"
              : "text-muted hover:text-white"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === tab.key ? "bg-black/20" : "bg-surface-raised text-muted"}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
