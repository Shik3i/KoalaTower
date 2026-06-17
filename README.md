# 🛰️ Flatland TD (FLTD)

**Open Source Neon Cyber Idle Tower Defense**

> *"Deploy towers. Question nothing. Refine Alloy."*

A beautiful, fully playable idle tower defense game built with **Svelte 5 + TypeScript + PixiJS v8 (WebGL)**. No backend, no tracking, no cookies — entirely self-contained static web app.

**▶ [Play now at tower.koalastuff.net](https://tower.koalastuff.net)**

[![MIT License](https://img.shields.io/badge/license-MIT-cyan.svg)](LICENSE)
[![Svelte 5](https://img.shields.io/badge/svelte-5-ff3e00.svg)](https://svelte.dev)
[![PixiJS v8](https://img.shields.io/badge/pixijs-v8-e72264.svg)](https://pixijs.com)

---

## 🎮 Gameplay

Flatland is at war with **hostile geometric shapes**. Deploy towers from orbit, harvest Energy from destroyed enemies to overclock your tower mid-battle, and refine Alloy for permanent upgrades. When the tower falls — deploy a new one. Research endures.

- 🏗️ **13 Forge upgrades** — permanent pre-installed improvements (Damage, Fire Rate, Range, HP, Crit, Lifesteal, Thorns...)
- 🔬 **5 Research Deck projects** — real-time orbital research with offline progress
- ⚡ **14 Field upgrades** — temporary overclocks per deployment (Offense, Defense, Utility)
- 📐 **10 Blueprints** — discover hidden upgrade paths during runs, research with Alloy
- 🌍 **5 Fronts (Tiers)** — escalating difficulty with better Alloy rewards
- 🏆 **42 Achievements** — deploy towers, destroy shapes, earn Alloy rewards
- 👾 **5 Enemy types** — Normal ■, Fast ◆, Tank ⬡, Ranged ▶, Boss ⬠ — each visually distinct
- ⚡ **3 Special Operations** — challenge modes with modified rules

### Controls

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `1` `2` `3` `4` | Speed 1× / 2× / 3× / 5× |
| `Shift` + Click | Buy 5× upgrades |
| `Ctrl` + Click | Buy max affordable |

---

## ⚡ Quick Start

```bash
npm install
npm run dev         # dev server at localhost:5173
npm run build       # production build → build/
npm run preview     # preview production build
npm test            # run 184 tests
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **SvelteKit** + Svelte 5 |
| Language | **TypeScript** (strict mode) |
| Renderer | **PixiJS v8** (WebGL + AdvancedBloomFilter) |
| Storage | **IndexedDB** via idb-keyval |
| Audio | Procedural **Web Audio API** (no asset files) |
| Testing | **Vitest** (184 tests, 6 test files) |
| Build | **Vite** + @sveltejs/adapter-static |
| Container | Multi-arch **Docker** (amd64 + arm64) |

---

## 📁 Project Structure

```
src/
├── app.css                  # Design tokens + global styles (CSS variables for everything)
├── app.html                 # HTML shell + SEO meta/OG/Twitter tags
├── lib/
│   ├── components/          # Tutorial, BossHealthBar, Stats panels, News, Icon
│   ├── stores/              # Reactive Svelte stores (coins, settings, engine)
│   ├── content/             # Flatland News (18 humorous items)
│   └── game/
│       ├── engine/          # GameEngine + GameConfig + GameTypes
│       ├── systems/         # Wave, Enemy, Tower, Projectile, Economy (pure functions)
│       ├── balance/         # Enemies, Upgrades, Labs, Tiers, Blueprints, Achievements
│       ├── progression/     # Unlock requirements + blueprint discovery RNG
│       ├── render/          # PixiJS WebGL rendering (layered renderers, effects)
│       ├── audio/           # Procedural Web Audio SFX + music
│       ├── save/            # IndexedDB persistence + schema migrations
│       └── __tests__/       # 184 Vitest unit tests
└── routes/
    ├── +layout.svelte       # Global footer nav + lab polling + toasts
    ├── +page.svelte         # Landing page with animated stars + news
    ├── play/+page.svelte    # Game canvas + side panels + launch/game-over screens
    ├── hub/+page.svelte     # Forge · Lab · Blueprints · Fronts · SpecialOps · Simulation · Archives
    ├── help/+page.svelte    # FAQ (12 questions) · Lore · Controls · Tutorial replay
    ├── imprint/+page.svelte # Legal notice
    ├── privacy/+page.svelte # Privacy policy (100% local data)
    └── sitemap.xml/         # Dynamic XML sitemap
```

---

## 🐳 Docker

Multi-arch images published automatically on Git tags.

```bash
docker pull ghcr.io/shik3i/koalatower:latest
docker run -p 8080:8080 ghcr.io/shik3i/koalatower:latest
# → http://localhost:8080
```

Docker Compose + Caddy reverse proxy examples in `examples/` and `docker-compose.example.yml`.

### Publishing a release

```bash
git tag v0.3.0
git push origin v0.3.0
# → CI builds multi-arch image + pushes to GHCR with SBOM attestation
```

---

## 🔒 Privacy

- **100% local** — all data stored in your browser (IndexedDB)
- **No backend** — fully static, no servers, no accounts
- **No tracking** — zero analytics, zero cookies, zero external requests
- **No CDN** — fonts and assets are self-hosted
- Export/Import save as JSON with encoding + checksums
- Reset save with confirmation dialog

---

## 🧪 Testing

```bash
npm test            # 184 tests across 6 suites
npm run check       # TypeScript strict typecheck
npm run build       # Production build verification
```

Test coverage includes: enemy scaling formulas, upgrade cost curves, save migration integrity, progression requirements, wave system, and viewport placement math.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*"Orbital Command has reviewed the situation. It is not great."*
