import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const nameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9_\-.]+$/, "Pseudo invalide");

export async function GET() {
  const profiles = await prisma.profile.findMany({
    orderBy: [{ lastPlayedAt: "desc" }],
    take: 50,
  });
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nom invalide (3–20 caractères, alphanumérique ou _ - .)" },
      { status: 400 },
    );
  }
  const profile = await prisma.profile.upsert({
    where: { name: parsed.data.name },
    update: { lastPlayedAt: new Date() },
    create: { name: parsed.data.name },
  });
  return NextResponse.json({ profile }, { status: 201 });
}
