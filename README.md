# CUT UP — night-highway traffic weaving for Meta Ray-Ban Display

A No Hesi–inspired cutting-up game built for Meta Ray-Ban Display glasses and the Meta Neural Band.
You spawn in the middle of a four-lane highway at night and weave through traffic as fast as you dare.

**Play it:** https://webmanagments.github.io/cutup/

## Controls

| Neural Band | Keyboard (desktop) | Action |
| --- | --- | --- |
| Swipe left / right | ← → | Change lanes |
| Swipe up or pinch | ↑ or Enter | Nitro |
| Swipe down | ↓ | Brake |
| Back | Esc | Pause (Back again resumes) |

Menus are fully D-pad driven: swipe to move, pinch to press.

## How scoring works

- **Near misses** (passing traffic close at speed) build a combo multiplier up to ×10.
  Tiers: *Near miss*, *Close call* (×1.8) and *Insane* (×3.2), all scaling with how much faster you are.
- **Thread the needle**: pass cars on both sides in quick succession for a big bonus.
- Combo points stay **at risk** until the combo timer runs out and they bank. Crash first and they're gone.
- Nitro adds speed, multiplies points ×1.5 and refills with every near miss.
- Traffic signals before changing lanes. It arrives in rows that always leave a way through,
  spaced by time so every car (starter to hypercar) gets the same reaction window. It gets denser over the first 2½ minutes.

## Progression

- Cash and XP from every run, level-up rewards, and three rotating missions that get harder as you complete them.
- **10 original cars**, each with its own side profile, rear light signature, exhaust and stats
  (top speed, acceleration, handling, nitro). Better cars cost more and unlock at higher levels:

| Car | Tier | Price | Level |
| --- | --- | --- | --- |
| Pocket R | Street | Free | 1 |
| Ronin GT | Sport | $12,000 | 2 |
| Vapor S | Sport | $26,000 | 4 |
| Brute SS | Muscle | $44,000 | 6 |
| Kaiju RX | Track | $78,000 | 9 |
| Stiletto V12 | Super | $125,000 | 12 |
| Phantom E | Hyper | $190,000 | 15 |
| Apex LM | Hyper | $280,000 | 20 |
| Nova X | Legend | $420,000 | 25 |
| KMR Zero | Legend | $750,000 | 30 |

- 9 paints unlock with your level. Progress saves on each pair of glasses.

## Put it on your glasses

1. Repo **Settings → Pages**: Deploy from a branch, `main`, `/docs`.
2. Meta AI app → your Display glasses → App connections → Web apps → **Add a web app** →
   name it `CUT UP` and paste `https://webmanagments.github.io/cutup/` (Developer Mode on).

Add `?debug` to the link to see exactly what input the glasses send.

## Develop

```sh
npm install
npm run dev       # local dev server
npm run build     # production build into dist/ (copy into docs/ to publish)
```

Dev pages: `?lineup` (every car, side and rear) and `?drive&car=zero` (drive the engine directly).
Checks in `tools/`: `flow.mjs` (D-pad walkthrough with assertions), `bot.mjs` (fast-forward bot for balance),
`perf.mjs` (frame rate under CPU throttling), plus Meta's official `check-webapp.mjs` gate (passes: ~94 KB gzipped, 10 requests).

Built with React + Vite + TypeScript and a hand-written canvas engine; all sound is synthesized with Web Audio
(engine with gear shifts, wind, near-miss whooshes panned to the side you passed). No external assets.
