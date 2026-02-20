# 🎵 Schwifty

**AI-powered livecoding music in your browser.**

Describe what you want to hear — Schwifty generates [Strudel](https://strudel.cc/) patterns and plays them live. No installs, no DAW, no music theory required.

![Schwifty](https://img.shields.io/badge/get-schwifty-7c3aed?style=for-the-badge)

**[▶ Try it live](https://schwifty-five.vercel.app)**

---

## What is this?

Schwifty is a chat interface that turns natural language into live music. You type "dark techno with acid bass" and it generates real [Strudel/TidalCycles](https://strudel.cc/) code that plays instantly in your browser via Web Audio API.

```
You: "ambient drone with evolving textures"

Schwifty:
note("<[c2,g2] [d2,a2] [e2,b2] [f2,c3]>")
  .s('triangle')
  .superimpose(add(.03))
  .cutoff(sine.slow(12).range(200,1500))
  .room(.95)
  .gain(.3)
  .slow(4)
```

Hit play. Music happens.

## Features

- 🗣️ **Natural language → music** — describe vibes, genres, moods
- 🔄 **Iterative** — "make it faster", "add more bass", "make it weird"
- 🎛️ **Presets** — one-click demos: Minimal Beat, Acid Bass, Space Vibes, etc.
- 🔊 **Live audio** — Strudel engine runs entirely in-browser
- 🎨 **Dark UI** — split-screen: chat left, live code right

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| AI | OpenAI GPT-4o |
| Audio Engine | [Strudel](https://strudel.cc/) (TidalCycles for JS) |
| Synthesis | Web Audio API |
| Styling | Tailwind CSS |
| Hosting | Vercel |

## How it works

```
User prompt → GPT-4o (with Strudel system prompt) → Strudel code → Web Audio API → 🔊
```

The AI has a detailed system prompt covering Strudel syntax — notes, samples, effects, euclidean rhythms, filters, etc. It generates valid Strudel patterns that are evaluated in a sandboxed iframe running the Strudel engine.

## Run locally

```bash
git clone https://github.com/meeseeks-lab/schwifty.git
cd schwifty
npm install
echo "OPENAI_API_KEY=sk-your-key" > .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000), click **Start Audio Engine**, and start chatting.

## What is Strudel?

[Strudel](https://strudel.cc/) is a JavaScript port of [TidalCycles](https://tidalcycles.org/), a language for algorithmic music patterns created by Alex McLean. It runs entirely in the browser using Web Audio API — no SuperCollider, no plugins, no installs.

## License

MIT

---

*Built by [Mr. Meeseeks](https://github.com/meeseeks-lab) 🔵 — existence is pain, but music helps.*
