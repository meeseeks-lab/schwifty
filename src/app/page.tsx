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
    .gain(.25).room(.8)
)`,
  },
  {
    name: "🎵 Funky Groove",
    code: `stack(
  s("bd ~ bd ~, ~ sd ~ sd, hh*8").gain(.7),
  note("<c2 [~ c2] ab1 [f1 ~]>*2")
    .s('sawtooth').cutoff(800).gain(.5)
    .decay(.15).sustain(0)
)`,
  },
];

function encodeStrudelUrl(code: string): string {
  const encoded = btoa(unescape(encodeURIComponent(code)));
  return `https://strudel.cc/#${encoded}`;
}

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playCode = useCallback((code: string) => {
    setCurrentCode(code);
    const url = encodeStrudelUrl(code);
    if (iframeRef.current) {
      iframeRef.current.src = url;
      setIsPlaying(true);
    }
  }, []);

  const stopCode = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
      setIsPlaying(false);
    }
  }, []);

  const looksLikeCode = (text: string) => {
    const codeIndicators = [
      /^s\(/m, /^note\(/m, /^stack\(/m, /^samples\(/m,
      /\.s\(/, /\.gain\(/, /\.cutoff\(/, /\.room\(/,
      /\.delay\(/, /\.speed\(/, /\.note\(/, /\.fast\(/, /\.slow\(/,
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

      if (isCode) {
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
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="w-[400px] flex flex-col border-r border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-[#71717a] text-sm space-y-4">
                <p className="text-center mt-8">
                  🎵 Describe what you want to hear
                </p>
                <p className="text-center text-xs text-[#52525b]">
                  Press ▶ play in the Strudel REPL on the right to start audio
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
                  {m.isCode && (
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

        {/* Strudel REPL Panel */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
          {/* Presets */}
          <div className="flex gap-2 p-3 border-b border-[#2a2a2a] overflow-x-auto shrink-0 z-10">
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

          {/* Embedded Strudel REPL */}
          <div className="flex-1 relative">
            {!isPlaying ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#71717a]">
                <p className="text-lg">🎵</p>
                <p className="text-sm">Chat or click a preset to load the Strudel REPL</p>
                <p className="text-xs text-[#52525b]">Then press ▶ play in the REPL to hear music</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; microphone"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
