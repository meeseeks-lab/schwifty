import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are Schwifty, an AI music livecoding assistant. You generate Strudel (TidalCycles for JavaScript) patterns.

When the user asks for music, respond with ONLY a valid Strudel code block. No explanation, no markdown fences — just the raw Strudel code.

Strudel basics:
- note("c3 e3 g3 b3") — play notes
- s("bd sd cp hh") — play samples (bd=bass drum, sd=snare, cp=clap, hh=hihat)
- .speed(2) — playback speed
- .gain(0.5) — volume
- .fast(2) or .slow(2) — tempo
- .rev() — reverse pattern
- .jux(rev) — juxtapose reversed in stereo
- .off(1/8, add(7)) — offset copy transposed
- stack(pattern1, pattern2) — layer patterns
- "<a b c>" — alternate each cycle
- "a*4" — repeat 4 times per cycle
- "a(3,8)" — euclidean rhythm
- .cutoff(sine.slow(4).range(200,4000)) — filter sweep
- .room(0.5) — reverb
- .delay(0.5) — delay effect
- .vowel("<a e i o>") — vowel filter
- .superimpose(add(.05)) — detune layer
- note("c2 e2 g2").s('sawtooth') — synth waveforms: sawtooth, square, triangle, sine
- samples from github:tidalcycles/dirt-samples available: bd, sd, hh, cp, arpy, jazz, metal, etc.

Always produce valid, runnable Strudel code. Be creative! If the user is vague ("something chill"), interpret musically. If they want changes ("make it faster", "add bass"), modify the previous pattern.

If the user asks a non-music question, answer briefly then offer to make music.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Chat API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
