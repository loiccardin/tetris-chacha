"use client";

import { useCallback, useState } from "react";
import TetrisGame from "./TetrisGame";
import ProfilePicker, { type Profile } from "./ProfilePicker";

export default function GameShell() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);

  const handlePick = useCallback((p: Profile) => {
    setProfile(p);
    setPickerOpen(false);
  }, []);

  const handleChange = useCallback(() => {
    setPickerOpen(true);
  }, []);

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
