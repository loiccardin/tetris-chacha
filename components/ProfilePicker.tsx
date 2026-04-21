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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Qui joue ?</h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {loading && <div className="text-sm text-neutral-400 mb-3">Chargement…</div>}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm mb-3">
            {error}
          </div>
        )}

        {profiles && profiles.length > 0 && (
          <div className="mb-4">
            <div className="text-xs uppercase text-neutral-500 mb-2">
              Profils existants
            </div>
            <ul className="flex flex-col gap-2">
              {profiles.map((p) => {
                const goal = 5 * p.level;
                return (
                  <li key={p.name} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPicked(p)}
                      className="flex-1 text-left bg-black/30 hover:bg-black/50 border border-[color:var(--color-border)] rounded px-3 py-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-lg">{p.name}</div>
                        <div className="text-cyan-400 font-mono text-sm">
                          Niveau {p.level}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-400">
                        <div>
                          <div className="uppercase text-neutral-500">
                            Progression
                          </div>
                          <div className="font-mono">
                            {p.linesThisLevel}/{goal} lignes
                          </div>
                        </div>
                        <div>
                          <div className="uppercase text-neutral-500">
                            Level max
                          </div>
                          <div className="font-mono">{p.maxLevel}</div>
                        </div>
                        <div>
                          <div className="uppercase text-neutral-500">
                            Record
                          </div>
                          <div className="font-mono text-yellow-300">
                            {p.bestScore.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.name)}
                      className="text-neutral-500 hover:text-red-400 text-sm px-2"
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

        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="text-xs uppercase text-neutral-500">
            Nouveau joueur
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Prénom (3–20 caractères)"
              maxLength={20}
              className="flex-1 bg-black/40 border border-[color:var(--color-border)] rounded px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!validName || loading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded px-4 py-2 font-semibold transition"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
