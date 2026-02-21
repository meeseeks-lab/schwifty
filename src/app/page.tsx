"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
  {
    name: "🥁 Minimal Beat",
    json: {
      bpm: 100,
      tracks: [
        { type: "kick", pattern: ["C2", null, null, null, "C2", null, null, null], duration: "8n", volume: -2 },
        { type: "noise", pattern: [null, null, null, null, "C2", null, null, null], duration: "16n", volume: -8 },
        { type: "hihat", pattern: ["C4", null, "C4", null, "C4", null, "C4", null], duration: "32n", volume: -14 },
      ],
    },
  },
  {
    name: "🎹 Ambient Keys",
    json: {
      bpm: 72,
      tracks: [
        {
          type: "synth", waveform: "triangle",
          pattern: [["C4","E4","G4"], null, ["D4","F4","A4"], null, ["E4","G4","B4"], null, ["F4","A4","C5"], null],
          duration: "2n", volume: -10, reverb: 3, delay: 0.5, attack: 0.5, release: 2,
          filter: { freq: 2000, type: "lowpass" },
        },
      ],
    },
  },
  {
    name: "🔊 Acid Bass",
    json: {
      bpm: 132,
      tracks: [
        {
          type: "synth", waveform: "sawtooth",
          pattern: ["C2", "C2", "Eb2", "F2", "C2", "C2", "Eb2", "G2"],
          duration: "16n", volume: -4, decay: 0.1, sustain: 0,
          filter: { freq: 3000, type: "lowpass" },
        },
        { type: "kick", pattern: ["C2", null, null, null, "C2", null, null, null], duration: "8n", volume: -2 },
        { type: "hihat", pattern: ["C4","C4","C4","C4","C4","C4","C4","C4"], duration: "32n", volume: -16 },
      ],
    },
  },
  {
    name: "🌌 Space Vibes",
    json: {
      bpm: 85,
      tracks: [
        {
          type: "synth", waveform: "sine",
          pattern: [["C3","G3"], null, null, ["D3","A3"], null, null, ["E3","B3"], null],
          duration: "4n", volume: -12, reverb: 4, delay: 0.6, attack: 0.8, release: 3,
        },
        {
          type: "synth", waveform: "triangle",
          pattern: ["C5", null, "G4", null, "E5", null, "D5", null, "B4", null, "A4", null],
          duration: "8n", volume: -16, reverb: 3, delay: 0.4,
        },
      ],
    },
  },
  {
    name: "🎵 Funky Groove",
    json: {
      bpm: 110,
      tracks: [
        { type: "kick", pattern: ["C2", null, null, "C2", null, null, "C2", null, null, null, "C2", null, null, null, null, null], duration: "16n", volume: -2 },
        { type: "noise", pattern: [null, null, null, null, "C2", null, null, null, null, null, null, null, "C2", null, null, null], duration: "16n", volume: -8 },
        { type: "hihat", pattern: ["C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4","C4"], duration: "32n", volume: -18 },
        {
          type: "synth", waveform: "sawtooth",
          pattern: ["C2", null, "C2", null, "Ab1", null, null, "F1"],
          duration: "8n", volume: -6, decay: 0.15, sustain: 0, filter: { freq: 800 },
        },
      ],
    },
  },
];

type Message = {
  role: "user" | "assistant";
  content: string;
  isMusic?: boolean;
  parsedJson?: Record<string, unknown>;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<typeof import("./audio-engine") | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initAudio = useCallback(async () => {
    const engine = await import("./audio-engine");
    await engine.startAudio();
    engineRef.current = engine;
    setAudioReady(true);
  }, []);

  const playMusic = useCallback(
    // eslint-disable-next-line
    (instructions: any) => {
      if (!engineRef.current) return;
      try {
        engineRef.current.playFromInstructions(instructions);
        setIsPlaying(true);
        setCurrentCode(JSON.stringify(instructions, null, 2));
      } catch (err) {
        console.error("Play error:", err);
      }
    },
    []
  );

  const stopMusic = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopAll();
      setIsPlaying(false);
    }
  }, []);

  const tryParseJson = (text: string) => {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```json?\n?/gm, "").replace(/```$/gm, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.tracks && Array.isArray(parsed.tracks)) return parsed;
    } catch {}
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = tryParseJson(data.text);
      const assistantMsg: Message = {
        role: "assistant",
        content: data.text,
        isMusic: !!parsed,
        parsedJson: parsed || undefined,
      };
      setMessages([...newMessages, assistantMsg]);

      if (parsed && audioReady) {
        playMusic(parsed);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Error: ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎵</span>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-[#7c3aed]">Schwifty</span>
            <span className="text-[#71717a] text-sm ml-2 font-normal">
              AI Livecoding
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/meeseeks-lab/schwifty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#71717a] hover:text-white transition-colors"
            title="View on GitHub"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          {isPlaying && (
            <button
              onClick={stopMusic}
              className="px-3 py-1 text-sm bg-[#ef4444] hover:bg-[#dc2626] rounded transition-colors"
            >
              ■ Stop
            </button>
          )}
          {isPlaying && (
            <div className="flex gap-[2px] items-end h-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#10b981] rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 10}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="w-[400px] flex flex-col border-r border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-[#71717a] text-sm space-y-4">
                <p className="text-center mt-8">🎵 Describe what you want to hear</p>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-[#52525b]">Try saying:</p>
                  {[
                    "a chill lo-fi beat",
                    "dark techno with acid bass",
                    "ambient drone with evolving textures",
                    "make it funky, 808 style",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="block w-full text-left px-3 py-2 rounded bg-[#141414] hover:bg-[#1a1a1a] text-[#a1a1aa] hover:text-white transition text-sm"
                    >
                      &quot;{s}&quot;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-[#7c3aed] text-white"
                      : m.isMusic
                        ? "bg-[#141414] border border-[#2a2a2a]"
                        : "bg-[#1a1a1a] text-[#e4e4e7]"
                  }`}
                >
                  {m.isMusic ? (
                    <div>
                      <p className="text-[#10b981] text-xs mb-2">
                        🎵 {String((m.parsedJson as Record<string, unknown>)?.bpm || 120)} BPM · {String(((m.parsedJson as Record<string, unknown>)?.tracks as unknown[])?.length || 0)} tracks
                      </p>
                      <button
                        onClick={() => m.parsedJson && playMusic(m.parsedJson)}
                        className="px-3 py-1 text-xs bg-[#7c3aed] hover:bg-[#6d28d9] rounded transition"
                      >
                        ▶ Play
                      </button>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words m-0 font-[inherit]">
                      {m.content}
                    </pre>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-[#71717a]">composing...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#2a2a2a]">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={audioReady ? "Describe the music..." : "Click Start Audio first →"}
                disabled={!audioReady}
                className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !audioReady}
                className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-30 rounded-lg text-sm font-medium transition"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a]">
          {!audioReady ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <button
                onClick={initAudio}
                className="px-8 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-[#7c3aed]/20"
              >
                🎵 Start Audio Engine
              </button>
              <p className="text-xs text-[#52525b]">Browser requires a click to enable audio</p>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div className="flex gap-2 p-3 border-b border-[#2a2a2a] overflow-x-auto shrink-0">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => playMusic(p.json)}
                    className="px-3 py-1 text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-full whitespace-nowrap transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Code display */}
              <div className="flex-1 p-4 overflow-auto">
                <div className="h-full bg-[#141414] rounded-lg border border-[#2a2a2a] p-4 font-mono text-sm overflow-auto">
                  {currentCode ? (
                    <pre className="text-[#10b981] whitespace-pre-wrap">{currentCode}</pre>
                  ) : (
                    <p className="text-[#52525b]">
                      {`// Music data will appear here...\n// Chat with AI or click a preset to start`}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
