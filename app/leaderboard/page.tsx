import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let scores: Array<{
    id: string;
    pseudo: string;
    score: number;
    lines: number;
    level: number;
    duration: number;
    createdAt: Date;
  }> = [];
  let error: string | null = null;
  try {
    scores = await prisma.score.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      take: 100,
    });
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Impossible de charger le leaderboard.";
  }

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <Link href="/" className="text-sm text-cyan-400 hover:underline">
            ← Retour au jeu
          </Link>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded p-4 text-sm">
            {error}
          </div>
        )}

        {!error && scores.length === 0 && (
          <div className="text-neutral-400 text-center py-10">
            Aucun score pour le moment — joue une partie !
          </div>
        )}

        {scores.length > 0 && (
          <div className="bg-[color:var(--color-panel)] border border-[color:var(--color-border)] rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-neutral-400 uppercase text-xs">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Pseudo</th>
                  <th className="text-right px-3 py-2">Score</th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">
                    Lines
                  </th>
                  <th className="text-right px-3 py-2 hidden sm:table-cell">
                    Lvl
                  </th>
                  <th className="text-right px-3 py-2 hidden md:table-cell">
                    Durée
                  </th>
                  <th className="text-right px-3 py-2 hidden md:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-t border-[color:var(--color-border)] ${
                      i < 3 ? "text-cyan-300" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-mono">{s.pseudo}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {s.score.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">
                      {s.lines}
                    </td>
                    <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">
                      {s.level}
                    </td>
                    <td className="px-3 py-2 text-right font-mono hidden md:table-cell">
                      {formatDuration(s.duration)}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-400 hidden md:table-cell">
                      {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
