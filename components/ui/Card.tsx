import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: boolean;
}

export default function Card({ hover = false, padding = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface-card rounded-xl border border-subtle ${hover ? "card-hover cursor-pointer" : ""} ${padding ? "p-5" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
