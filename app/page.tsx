import Link from "next/link";
import GameShell from "@/components/GameShell";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center px-4 py-6 gap-4">
      <header className="flex items-center justify-between w-full max-w-5xl">
        <h1 className="text-2xl font-bold">
          <span className="text-cyan-400">Tetris</span>{" "}
          <span className="text-neutral-400">Chacha</span>
        </h1>
        <Link
          href="/leaderboard"
          className="text-sm text-cyan-400 hover:underline"
        >
          Leaderboard →
        </Link>
      </header>

      <GameShell />
    </main>
  );
}
