"use client";

import { useState } from "react";

interface Props {
  score: number;
  lines: number;
  level: number;
  durationSec: number;
  onSubmit: (pseudo: string) => Promise<void>;
  onRestart: () => void;
}

export default function GameOverModal({
  score,
  lines,
  level,
  durationSec,
  onSubmit,
  onRestart,
}: Props) {
  const [pseudo, setPseudo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[A-Za-z0-9_\-.]{3,20}$/.test(pseudo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(pseudo);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Game Over</h2>

        <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
          <div className="text-neutral-400">Score</div>
          <div className="font-mono text-right">{score.toLocaleString()}</div>
          <div className="text-neutral-400">Lines</div>
          <div className="font-mono text-right">{lines}</div>
          <div className="text-neutral-400">Level</div>
          <div className="font-mono text-right">{level}</div>
          <div className="text-neutral-400">Durée</div>
          <div className="font-mono text-right">{durationSec}s</div>
        </div>

        {submitted ? (
          <div className="text-center text-green-400 mb-4">
            Score enregistré !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm text-neutral-300">
              Pseudo (3–20 car., alphanum + _-.)
              <input
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                className="mt-1 w-full bg-black/40 border border-[color:var(--color-border)] rounded px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                maxLength={20}
                autoFocus
                autoComplete="off"
              />
            </label>
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button
              type="submit"
              disabled={!valid || submitting}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded px-4 py-2 font-semibold transition"
            >
              {submitting ? "Envoi..." : "Soumettre au leaderboard"}
            </button>
          </form>
        )}

        <button
          onClick={onRestart}
          className="mt-3 w-full bg-neutral-700 hover:bg-neutral-600 rounded px-4 py-2 transition"
        >
          Rejouer
        </button>
        <a
          href="/leaderboard"
          className="mt-2 block text-center text-cyan-400 hover:underline"
        >
          Voir le leaderboard
        </a>
      </div>
    </div>
  );
}
