"use client";

import { useCallback, useEffect, useRef } from "react";

const HOLD_FIRST_MS = 150;
const HOLD_REPEAT_MS = 45;

function useHoldRepeat(action: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback(() => {
    clear();
    action();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, HOLD_REPEAT_MS);
    }, HOLD_FIRST_MS);
  }, [action, clear]);

  useEffect(() => clear, [clear]);

  return { start, stop: clear };
}

type BtnProps = {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
};

export function HoldButton({
  onHold,
  children,
  className = "",
  ariaLabel,
}: BtnProps & { onHold: () => void }) {
  const { start, stop } = useHoldRepeat(onHold);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg active:bg-neutral-700 font-semibold select-none touch-none flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  );
}

export function TapButton({
  onTap,
  children,
  className = "",
  ariaLabel,
}: BtnProps & { onTap: () => void }) {
  const firedRef = useRef(false);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.preventDefault();
        // Prevent double-fire from synthesized click after a touch.
        if (firedRef.current) return;
        firedRef.current = true;
        onTap();
        setTimeout(() => {
          firedRef.current = false;
        }, 80);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg active:bg-neutral-700 font-semibold select-none touch-none flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  );
}
