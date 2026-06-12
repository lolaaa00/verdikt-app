"use client";
import { useState, useEffect } from "react";

interface CountdownProps {
  deadline: string;
  onExpire?: () => void;
}

export default function MarketCountdown({ deadline, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired,  setExpired]  = useState(false);
  const [urgent,   setUrgent]   = useState(false);

  useEffect(() => {
    function calc() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Ended");
        onExpire?.();
        return;
      }
      const days  = Math.floor(diff / 86_400_000);
      const hrs   = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins  = Math.floor((diff % 3_600_000) / 60_000);
      const secs  = Math.floor((diff % 60_000) / 1_000);

      setUrgent(diff < 3_600_000); // last hour

      if (days > 0)         setTimeLeft(`${days}d ${hrs}h ${mins}m`);
      else if (hrs > 0)     setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      else                  setTimeLeft(`${mins}m ${secs}s`);
    }

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  return (
    <span
      className={`text-xs font-mono tabular-nums ${
        expired
          ? "text-muted"
          : urgent
          ? "text-danger animate-pulse"
          : "text-muted"
      }`}
    >
      {timeLeft}
    </span>
  );
}
