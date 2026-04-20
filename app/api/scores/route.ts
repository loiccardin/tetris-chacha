import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  pseudo: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9_\-.]+$/, "Pseudo invalide"),
  score: z.number().int().min(0).max(100_000_000),
  lines: z.number().int().min(0).max(100_000),
  level: z.number().int().min(1).max(20),
  duration: z.number().int().min(0).max(60 * 60 * 12),
});

// Rate limiting: in-memory per-IP (sufficient for MVP on single instance)
const lastSubmitByIp = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100),
  );
  const scores = await prisma.score.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      pseudo: true,
      score: true,
      lines: true,
      level: true,
      duration: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();
  const last = lastSubmitByIp.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Trop de soumissions, réessaie dans quelques secondes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { pseudo, score, lines, level, duration } = parsed.data;

  // Basic sanity: score upper bound consistent with lines, level, duration.
  const maxReasonable = Math.floor(
    lines * 800 * Math.max(level, 1) * 1.5 + duration * 2 + 1000,
  );
  if (score > maxReasonable) {
    return NextResponse.json(
      { error: "Score incohérent par rapport aux lignes/niveau/durée." },
      { status: 400 },
    );
  }
  if (duration < Math.ceil(lines * 0.2)) {
    return NextResponse.json(
      { error: "Durée trop courte pour ce nombre de lignes." },
      { status: 400 },
    );
  }

  const created = await prisma.score.create({
    data: { pseudo, score, lines, level, duration },
    select: { id: true },
  });

  lastSubmitByIp.set(ip, now);

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
