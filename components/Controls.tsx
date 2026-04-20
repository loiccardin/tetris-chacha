"use client";

import { useEffect, useState } from "react";

interface Props {
  onMove: (dx: number) => void;
  onRotate: (dir: 1 | -1) => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onHold: () => void;
  onPause: () => void;
}

export default function Controls(props: Props) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window);
  }, []);

  if (!isTouch) {
    return (
      <div className="text-xs text-neutral-400 leading-relaxed mt-4">
        <div className="font-semibold text-neutral-300 mb-1">Contrôles</div>
        <div>← → déplacer · ↓ soft drop · Espace hard drop</div>
        <div>Z/Q rot. anti-horaire · X/W/↑ rot. horaire</div>
        <div>Shift/C hold · P pause</div>
      </div>
    );
  }

  const Btn = ({
    onPress,
    children,
    wide,
  }: {
    onPress: () => void;
    children: React.ReactNode;
    wide?: boolean;
  }) => (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        onPress();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg py-3 active:bg-neutral-800 text-lg font-semibold ${
        wide ? "col-span-2" : ""
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mt-4 grid grid-cols-4 gap-2 w-full max-w-md">
      <Btn onPress={() => props.onHold()}>Hold</Btn>
      <Btn onPress={() => props.onRotate(-1)}>⟲</Btn>
      <Btn onPress={() => props.onRotate(1)}>⟳</Btn>
      <Btn onPress={() => props.onPause()}>⏸</Btn>

      <Btn onPress={() => props.onMove(-1)}>←</Btn>
      <Btn onPress={() => props.onSoftDrop()}>↓</Btn>
      <Btn onPress={() => props.onMove(1)}>→</Btn>
      <Btn onPress={() => props.onHardDrop()}>⤓</Btn>
    </div>
  );
}
