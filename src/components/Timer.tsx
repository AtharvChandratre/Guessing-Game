"use client";

import { useEffect, useRef, useState } from "react";

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  /** Length of a round in seconds. */
  duration: number;
  /** Changing this restarts the clock - pass the turn number. */
  resetKey: number;
  paused: boolean;
  onExpire: () => void;
};

export default function Timer({ duration, resetKey, paused, onExpire }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
  }, [duration, resetKey]);

  useEffect(() => {
    if (paused) return;

    // Track wall-clock time so a throttled background tab cannot gain the team extra seconds.
    const deadline = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      const left = (deadline - Date.now()) / 1000;
      if (left <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      } else {
        setRemaining(left);
      }
    }, 200);

    return () => window.clearInterval(id);
    // `remaining` is intentionally excluded: it is read once to seed the deadline,
    // and including it would restart the interval on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, duration, resetKey]);

  const pct = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;
  const low = remaining <= 10;

  return (
    <div className={`timer${low ? " low" : ""}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="spread">
        <span className="eyebrow">Time left</span>
        <span className="clock">{formatClock(remaining)}</span>
      </div>
      <div className="timer-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
