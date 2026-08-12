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

  // Seconds left, mirrored in a ref. The ticking effect below has to read this
  // in the same commit the reset effect writes it, and a state update would
  // still be showing the previous round's value at that point.
  const remainingRef = useRef(duration);

  useEffect(() => {
    remainingRef.current = duration;
    setRemaining(duration);
    expiredRef.current = false;
  }, [duration, resetKey]);

  useEffect(() => {
    if (paused) return;

    // Track wall-clock time so a throttled background tab cannot gain the team
    // extra seconds. Seeded from the ref so a fresh round starts at `duration`
    // and a resume picks up exactly where the pause left off.
    const deadline = Date.now() + remainingRef.current * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      remainingRef.current = left;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      }
    }, 200);

    return () => window.clearInterval(id);
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
