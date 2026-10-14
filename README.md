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

## Pursuit mode

Same highway, same cutting up, but the police are after you. Pick a **heat level (1–5)** first;
each one unlocks by escaping the one before it.

- **Escape** by staying out of every unit's sight for 15–22 seconds (it depends on heat). Outrun them, leave them
  stuck behind traffic, or make them crash into it. Escape and you keep everything, plus an escape bonus.
- **Busted**: a cop rams you or pulls a PIT maneuver (it lines up beside you, then swerves in), or you wreck.
  Either way you lose the whole chase payout. XP still counts.
- **Chase multiplier**: grows every second you survive and multiplies every point you score. Higher heat makes it climb faster and go higher.
- Higher heat brings faster cops (relative to your car), more units and backup. Heat 3 and up adds units that cut in
  from ahead, heat 4 and up adds rolling roadblocks, and heat 5 adds a helicopter. Tunnels hide you from it.
- HUD: heat stars, IN PURSUIT / EVADING with the escape meter, the chase multiplier, a radar of every unit
  (bottom left), red and blue glow when one is close behind, and PIT / bumper warnings. Sirens pan to the side of the nearest unit.

| Heat | Name | Units | Cop speed | Escape | Extras |
| --- | --- | --- | --- | --- | --- |
| 1 | Patrol | 1 | 83% of yours | 15 s | — |
| 2 | Interceptors | 2 | 92% | 15 s | backup |
| 3 | Task force | 2 → 3 | 99% | 17 s | units ahead |
| 4 | Rapid response | 3 → 4 | 102% | 19 s | roadblocks |
| 5 | Most wanted | 3 → 5 | 105% | 22 s | roadblocks, helicopter |

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

Dev pages: `?lineup` (every car, side and rear) and `?drive&car=zero` (drive the engine directly; add `&heat=3` for a pursuit).
Checks in `tools/`: `flow.mjs` (D-pad walkthrough with assertions), `bot.mjs` (fast-forward bot for balance),
`chase-bot.mjs` (pursuit balance per heat), `pursuit-shots.mjs` (pursuit screens),
`perf.mjs` (frame rate under CPU throttling), plus Meta's official `check-webapp.mjs` gate (passes: ~94 KB gzipped, 10 requests).

Built with React + Vite + TypeScript and a hand-written canvas engine; all sound is synthesized with Web Audio
(engine with gear shifts, wind, near-miss whooshes panned to the side you passed). No external assets.
