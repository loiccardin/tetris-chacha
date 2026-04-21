"use client";

import { useCallback, useEffect, useState } from "react";
import TetrisGame from "./TetrisGame";
import ProfilePicker, { type Profile } from "./ProfilePicker";

const STORAGE_KEY = "tetris:lastProfile";

export default function GameShell() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Auto-load last-used profile on mount
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (!saved) {
      setInitializing(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(saved)}`);
        if (res.ok) {
          const data = (await res.json()) as { profile: Profile };
          setProfile(data.profile);
          setPickerOpen(false);
        }
      } catch {
        // fall through to picker
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const handlePick = useCallback((p: Profile) => {
    setProfile(p);
    setPickerOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, p.name);
    }
  }, []);

  const handleChange = useCallback(() => {
    setPickerOpen(true);
  }, []);

  if (initializing) {
    return (
      <div className="text-neutral-500 text-sm py-10">Chargement…</div>
    );
  }

  return (
    <>
      <ProfilePicker
        open={pickerOpen}
        canClose={!!profile}
        onClose={() => setPickerOpen(false)}
        onPicked={handlePick}
      />
      {profile && (
        <TetrisGame profile={profile} onChangeProfile={handleChange} />
      )}
    </>
  );
}
