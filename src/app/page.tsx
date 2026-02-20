"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
  {
    name: "🥁 Minimal Beat",
    code: `s("bd sd cp hh*4").gain(.8)`,
  },
  {
    name: "🎹 Ambient Keys",
    code: `note("<c3 e3 g3 b3>/2")
  .s('triangle')
  .cutoff(sine.slow(8).range(300,2000))
  .gain(.4)
  .room(.8)
  .delay(.5)`,
  },
  {
    name: "🔊 Acid Bass",
    code: `note("<c2 c2 eb2 f2 c2 c2 eb2 g2>*2")
  .s('sawtooth')
  .cutoff(sine.slow(4).range(200,5000))
  .resonance(15)
  .gain(.5)
  .decay(.1)
  .sustain(0)`,
  },
  {
    name: "🌌 Space Vibes",
    code: `stack(
  note("<c3 e3 g3 b3>*2").s('sine').gain(.3).room(.9).delay(.6),
  note("<[c2,g2] [d2,a2] [e2,b2] [f2,c3]>")
    .s('triangle')
    .cutoff(sine.slow(6).range(400,3000))
    .gain(.25)
    .room(.8)
)`,
  },
  {
    name: "🎵 Funky Groove",
    code: `stack(
  s("bd ~ bd ~, ~ sd ~ sd, hh*8").gain(.7),
  note("<c2 [~ c2] ab1 [f1 ~]>*2")
    .s('sawtooth')
    .cutoff(800)
    .gain(.5)
    .decay(.15)
    .sustain(0)
)`,
  },
];

type Message = {
  role: "user" | "assistant";
  content: string;
  isCode?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [engineError, setEngineError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    evaluate: (code: string) => Promise<void>;
    stop: () => void;
  } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playCode = useCallback(
    async (code: string) => {
      setCurrentCode(code);
      setEngineError("");
      if (engineRef.current) {
        try {
          await engineRef.current.evaluate(code);
          setIsPlaying(true);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Eval error";
          setEngineError(msg);
          console.error("[strudel] eval:", err);
        }
      }
    },
    []
  );

  const stopCode = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setIsPlaying(false);
    }
  }, []);

  const initAudio = useCallback(async () => {
    try {
      const engine = await import("./strudel-engine");
      const ok = await engine.initStrudel();
      if (ok) {
        engineRef.current = engine;
        setAudioReady(true);
      } else {
        setEngineError("Failed to initialize audio engine");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Init error";
      setEngineError(msg);
      console.error("[strudel] init:", err);
    }
  }, []);

  const looksLikeCode = (text: string) => {
    const codeIndicators = [
      /^s\(/m,
      /^note\(/m,
      /^stack\(/m,
      /^samples\(/m,
      /\.s\(/,
      /\.gain\(/,
      /\.cutoff\(/,
      /\.room\(/,
      /\.delay\(/,
      /\.speed\(/,
      /\.note\(/,
      /\.fast\(/,
      /\.slow\(/,
    ];
    return codeIndicators.some((r) => r.test(text));
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

      const isCode = looksLikeCode(data.text);
      const assistantMsg: Message = {
        role: "assistant",
        content: data.text,
        isCode,
      };
      setMessages([...newMessages, assistantMsg]);

      if (isCode && audioReady) {
        playCode(data.text);
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
          {isPlaying && (
            <button
              onClick={stopCode}
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
          {engineError && (
            <span className="text-xs text-[#ef4444]">{engineError}</span>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="w-[400px] flex flex-col border-r border-[#2a2a2a] bg-[#0a0a0a]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-[#71717a] text-sm space-y-4">
                <p className="text-center mt-8">
                  🎵 Describe what you want to hear
                </p>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-[#52525b]">
                    Try saying:
                  </p>
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
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-[#7c3aed] text-white"
                      : m.isCode
                        ? "bg-[#141414] border border-[#2a2a2a] font-mono text-[#10b981]"
                        : "bg-[#1a1a1a] text-[#e4e4e7]"
                  }`}
                >
                  <pre className="whitespace-pre-wrap break-words m-0 font-[inherit]">
                    {m.content}
                  </pre>
                  {m.isCode && audioReady && (
                    <button
                      onClick={() => playCode(m.content)}
                      className="mt-2 px-2 py-1 text-xs bg-[#7c3aed] hover:bg-[#6d28d9] rounded transition"
                    >
                      ▶ Play this
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-[#71717a]">
                  composing...
                </div>
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
                placeholder="Describe the music..."
                className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-30 rounded-lg text-sm font-medium transition"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Code + Audio Panel */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a]">
          {!audioReady ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <button
                onClick={initAudio}
                className="px-8 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-[#7c3aed]/20"
              >
                🎵 Start Audio Engine
              </button>
              {engineError && (
                <p className="text-sm text-[#ef4444] max-w-md text-center">{engineError}</p>
              )}
            </div>
          ) : (
            <>
              {/* Presets */}
              <div className="flex gap-2 p-3 border-b border-[#2a2a2a] overflow-x-auto shrink-0">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => playCode(p.code)}
                    className="px-3 py-1 text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-full whitespace-nowrap transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Code display */}
              <div className="flex-1 p-4 overflow-auto">
                <div className="h-full bg-[#141414] rounded-lg border border-[#2a2a2a] p-4 font-mono text-sm">
                  {currentCode ? (
                    <pre className="text-[#10b981] whitespace-pre-wrap">
                      {currentCode}
                    </pre>
                  ) : (
                    <p className="text-[#52525b]">
                      {`// Strudel code will appear here...\n// Chat with AI or click a preset to start`}
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
