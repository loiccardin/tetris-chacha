# Tetris Chacha

Clone Tetris jouable dans le navigateur, déployé sur Railway, avec leaderboard global persisté en Postgres.

## Stack

- **Next.js 15** (App Router) · **TypeScript strict**
- **Canvas HTML5** pour le rendu (pas de lib externe)
- **Tailwind CSS v4**
- **PostgreSQL** + **Prisma**
- Hosting: **Railway** (nixpacks auto-detect)

## Règles

- Plateau 10 × 20 (+ 2 lignes buffer en haut)
- **7-bag randomizer** : chaque « sac » contient les 7 pièces mélangées
- **SRS** (Super Rotation System) + wall kicks officiels (I a sa propre table)
- **Ghost piece** en transparence
- **Hold** (une pièce en réserve, un swap par pièce)
- **Next queue** affichant les 5 prochaines pièces
- **Gravité** par level selon la table standard Guideline (level 1–20)
- **Lock delay** : 500 ms
- **Soft drop** (↓) : 1 pt/cellule · **Hard drop** (Espace) : 2 pts/cellule
- **Scoring** Guideline : 100 / 300 / 500 / 800 × level · Back-to-back Tetris × 1.5
- **Level up** : tous les 10 lignes, level +1 (max 20)

## Contrôles

| Touche          | Action                    |
|-----------------|---------------------------|
| ← / →           | Déplacement latéral       |
| ↓               | Soft drop                 |
| Espace          | Hard drop                 |
| Z / Q           | Rotation anti-horaire     |
| X / W / ↑       | Rotation horaire          |
| Shift / C       | Hold                      |
| P / Échap       | Pause                     |

Sur mobile, des boutons tactiles s'affichent automatiquement.

## Setup local

Prérequis : Node 20 LTS, pnpm, Postgres.

```bash
pnpm install
cp .env.example .env          # puis éditer DATABASE_URL
pnpm prisma migrate dev       # crée la DB + table Score
pnpm dev
```

Ouvre http://localhost:3000.

## Tests

```bash
pnpm test
```

Vitest couvre la logique pure dans `lib/tetris` : board, collisions, line clear, 7-bag, SRS kicks, scoring, gravity.

## Variables d'environnement

| Nom            | Description                              |
|----------------|------------------------------------------|
| `DATABASE_URL` | URL Postgres (injectée par Railway)      |
| `PORT`         | Port d'écoute (injecté par Railway)      |

## Déploiement Railway

1. Push le repo sur GitHub
2. Railway → New Project → Deploy from GitHub repo
3. Add Plugin → PostgreSQL (injecte `DATABASE_URL` automatiquement)
4. Build : `pnpm install && pnpm prisma migrate deploy && pnpm build`
5. Start : `pnpm start`

## Architecture

```
app/
  page.tsx                 → page de jeu
  leaderboard/page.tsx     → top 100 global
  api/scores/route.ts      → POST / GET scores (validation Zod, rate-limit IP)
lib/
  tetris/
    board.ts               → grille, collisions, line clear
    tetromino.ts           → 7 pièces + rotations SRS
    srs.ts                 → wall kicks
    game.ts                → boucle, gravité, scoring, levels
    rng.ts                 → 7-bag randomizer
    types.ts
  prisma.ts                → singleton PrismaClient
components/
  TetrisGame.tsx           → orchestrateur (état + input)
  TetrisCanvas.tsx         → rendu Canvas
  HUD.tsx                  → score / level / lines / hold / next
  Controls.tsx             → hints clavier + boutons mobile
  GameOverModal.tsx        → saisie pseudo + submit score
prisma/
  schema.prisma
```

## Anti-triche (MVP)

Les soumissions au leaderboard sont validées côté serveur :

- Pseudo : 3–20 caractères, `[A-Za-z0-9_\-.]`
- Rate limit : 1 soumission / 10 s / IP
- Score cohérent : `score ≤ lines × 800 × level × 1.5 + duration × 2 + marge`
- Durée plancher : `duration ≥ lines × 0.2`

Pas de signature cryptographique — suffisant pour un MVP convivial.

## Licence

MIT.
