import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  level: z.number().int().min(1).max(200).optional(),
  linesThisLevel: z.number().int().min(0).max(10_000).optional(),
  addLines: z.number().int().min(0).max(10_000).optional(),
  lastScore: z.number().int().min(0).max(1_000_000_000).optional(),
  bestScore: z.number().int().min(0).max(1_000_000_000).optional(),
  finishedGame: z.boolean().optional(),
});

type PatchUpdate = {
  lastPlayedAt: Date;
  level?: number;
  maxLevel?: number;
  linesThisLevel?: number;
  lastScore?: number;
  bestScore?: number;
  totalLines?: { increment: number };
  totalGames?: { increment: number };
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const profile = await prisma.profile.findUnique({ where: { name } });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { level, linesThisLevel, addLines, lastScore, bestScore, finishedGame } =
    parsed.data;

  const existing = await prisma.profile.findUnique({ where: { name } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: PatchUpdate = { lastPlayedAt: new Date() };
  if (level !== undefined) {
    data.level = level;
    if (level > existing.maxLevel) data.maxLevel = level;
  }
  if (linesThisLevel !== undefined) data.linesThisLevel = linesThisLevel;
  if (lastScore !== undefined) data.lastScore = lastScore;
  if (bestScore !== undefined && bestScore > existing.bestScore) {
    data.bestScore = bestScore;
  }
  if (addLines && addLines > 0) {
    data.totalLines = { increment: addLines };
  }
  if (finishedGame) {
    data.totalGames = { increment: 1 };
  }

  const profile = await prisma.profile.update({
    where: { name },
    data: data as never,
  });

  return NextResponse.json({ profile });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    await prisma.profile.delete({ where: { name } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
