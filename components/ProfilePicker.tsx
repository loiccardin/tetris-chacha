"use client";

import { useCallback, useEffect, useState } from "react";

export interface Profile {
  name: string;
  level: number;
  maxLevel: number;
  linesThisLevel: number;
  totalLines: number;
  totalGames: number;
  bestScore: number;
  lastScore: number;
  lastPlayedAt: string;
}

interface Props {
  onPicked: (profile: Profile) => void;
  open: boolean;
  onClose?: () => void;
  canClose?: boolean;
}

export default function ProfilePicker({ onPicked, open, onClose, canClose }: Props) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { profiles: Profile[] };
      setProfiles(data.profiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  if (!open) return null;

  const validName = /^[A-Za-z0-9_\-.]{3,20}$/.test(newName);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { profile: Profile };
      onPicked(data.profile);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer le profil "${name}" ?`)) return;
    await fetch(`/api/profiles/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    fetchAll();
  };

  return (
    <div className="fixed inset-0 bg-[color:var(--color-bg)] z-50 overflow-y-auto">
      <div className="min-h-full flex flex-col px-4 py-6 sm:px-8 sm:py-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <div className="text-xs sm:text-sm uppercase tracking-[0.3em] text-cyan-400 mb-1">
              Tetris Chacha
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Qui joue ?</h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white text-2xl w-12 h-12 flex items-center justify-center"
              aria-label="Fermer"
            >
              ✕
            </button>
          )}
        </div>

        {loading && (
          <div className="text-sm text-neutral-400 mb-3">Chargement…</div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {profiles && profiles.length > 0 && (
          <div className="mb-8">
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
              Profils existants
            </div>
            <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((p) => {
                const goal = 5 * p.level;
                return (
                  <li key={p.name} className="relative group">
                    <button
                      type="button"
                      onClick={() => onPicked(p)}
                      className="w-full h-full text-left bg-[color:var(--color-panel)] hover:bg-neutral-800 border border-[color:var(--color-border)] hover:border-cyan-600 rounded-xl px-4 py-4 transition"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-bold text-xl sm:text-2xl truncate">
                          {p.name}
                        </div>
                        <div className="text-cyan-400 font-mono text-sm shrink-0 ml-2">
                          Niv. {p.level}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[10px] uppercase text-neutral-500">
                            Progression
                          </div>
                          <div className="font-mono text-sm">
                            {p.linesThisLevel}/{goal}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-neutral-500">
                            Max
                          </div>
                          <div className="font-mono text-sm">{p.maxLevel}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-neutral-500">
                            Record
                          </div>
                          <div className="font-mono text-sm text-yellow-300 truncate">
                            {p.bestScore.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.name)}
                      className="absolute top-2 right-2 text-neutral-600 hover:text-red-400 text-base w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                      aria-label={`Supprimer ${p.name}`}
                    >
                      🗑
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-xl p-4 sm:p-6"
        >
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Nouveau joueur
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Prénom (3–20 caractères)"
              maxLength={20}
              className="flex-1 bg-black/40 border border-[color:var(--color-border)] rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-cyan-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!validName || loading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-6 py-3 text-lg font-semibold transition"
            >
              Créer
            </button>
          </div>
        </form>

        <div className="mt-auto pt-6 text-center text-xs text-neutral-600">
          Les profils sont enregistrés sur le serveur — tu les retrouves sur
          n'importe quel appareil.
        </div>
      </div>
    </div>
  );
}
