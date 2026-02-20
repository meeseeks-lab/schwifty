"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
  { name: "🥁 808 Beat", code: `stack(\n  s("bd*2 [~ bd] bd ~"),\n  s("~ sd ~ sd"),\n  s("hh*8")\n).bank("RolandTR808")` },
  { name: "🎹 Acid Bass", code: `note("<c2 c2 eb2 f2>*2")\n  .s("sawtooth")\n  .lpf(sine.slow(4).range(200, 4000))\n  .resonance(15)\n  .decay(.1).sustain(0)` },
  { name: "🌊 Ambient", code: `note("c4 e4 g4 b4".slow(4))\n  .s("sine")\n  .room(0.9)\n  .delay(0.6)\n  .gain(0.5)` },
  { name: "🎵 Melody", code: `note("<c4 [e4 g4] a4 [g4 e4]>")\n  .s("square")\n  .lpf(1200)\n  .decay(.2).sustain(.3)\n  .delay(0.3).room(0.4)` },
  { name: "🪩 Funk", code: `stack(\n  s("bd ~ bd [~ bd]"),\n  s("~ cp ~ cp"),\n  s("[hh hh] [hh oh] [hh hh] [hh ~]"),\n  note("<c3 c3 f3 g3>").s("sawtooth").lpf(600).gain(0.5)\n).bank("RolandTR808")` },
  { name: "✨ Minimal", code: `s("bd sd:1")\n  .speed(perlin.range(.8,1.2))\n  .room(0.5)\n  .bank("RolandTR808")` },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  code?: string;
}

function extractCode(text: string): { message: string; code: string | null } {
  // Try to find code blocks
  const codeBlockMatch = text.match(/```(?:js|javascript|strudel)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    const msg = text.replace(/```(?:js|javascript|strudel)?\n?[\s\S]*?```/, "").trim();
    return { message: msg, code: codeBlockMatch[1].trim() };
  }
  
  // Check if the entire response looks like code (starts with common Strudel functions)
  const lines = text.trim().split("\n");
  const codePatterns = /^(note|s|sound|stack|cat|seq|samples|n)\s*\(/;
  if (codePatterns.test(lines[0])) {
    return { message: "", code: text.trim() };
  }
  
  // Try to split on blank line - text before, code after
  const parts = text.split(/\n\n/);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();
    if (codePatterns.test(lastPart)) {
      return { message: parts.slice(0, -1).join("\n\n").trim(), code: lastPart };
    }
  }
  
  return { message: text, code: null };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(PRESETS[0].code);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Listen for iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === "playing") setIsPlaying(true);
      if (e.data.type === "stopped") setIsPlaying(false);
      if (e.data.type === "error") setError(e.data.message);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Strudel via dynamic import from CDN
  const initStrudel = useCallback(async () => {
    if (replRef.current) return;
    try {
      // @ts-ignore - loaded from CDN
      if (!window.__strudelLoaded) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/@strudel/repl@latest";
          script.type = "module";
          script.onload = () => {
            // @ts-ignore
            window.__strudelLoaded = true;
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
        // Give it a moment to register
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      console.error("Failed to load Strudel:", e);
    }
  }, []);

  // Visualizer
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(10, 10, 10, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const hue = (i / bufferLength) * 120 + 120; // green to cyan
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  // Evaluate Strudel code using the Web Audio API directly
  const evaluate = useCallback(async (codeToEval: string) => {
    setError(null);
    try {
      // Use the strudel web component approach via iframe
      const iframe = document.getElementById("strudel-frame") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "eval", code: codeToEval }, "*");
        setIsPlaying(true);
      }
    } catch (e: any) {
      setError(e.message);
      console.error("Eval error:", e);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    const iframe = document.getElementById("strudel-frame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "stop" }, "*");
    }
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { message, code: extractedCode } = extractCode(data.content);
      
      const assistantMsg: Message = {
        role: "assistant",
        content: message || data.content,
        code: extractedCode || undefined,
      };
      
      setMessages([...newMessages, assistantMsg]);

      if (extractedCode) {
        setCode(extractedCode);
        // Auto-play the generated code
        setTimeout(() => evaluate(extractedCode), 300);
      }
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setCode(preset.code);
    evaluate(preset.code);
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#111]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-[#00ff88]">⚡</span> Schwifty
          </h1>
          <span className="text-xs text-[#666] hidden sm:inline">AI Live Coding Music</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-[#00ff88] playing" : "bg-[#333]"}`} />
          <span className="text-xs text-[#666]">{isPlaying ? "playing" : "stopped"}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat */}
        <div className="w-[400px] min-w-[300px] flex flex-col border-r border-[#2a2a2a] bg-[#0d0d0d]">
          {/* Presets */}
          <div className="p-2 border-b border-[#2a2a2a] flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                className="text-xs px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-[#444] text-sm space-y-2 mt-8 text-center">
                <p className="text-2xl">🎵</p>
                <p>Describe music and I&apos;ll code it live</p>
                <p className="text-xs">&quot;make a chill lo-fi beat&quot;</p>
                <p className="text-xs">&quot;acid techno bassline&quot;</p>
                <p className="text-xs">&quot;ambient generative melody&quot;</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88]"
                      : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc]"
                  }`}
                >
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  {m.code && (
                    <div className="mt-2">
                      <pre className="font-mono text-xs bg-[#0a0a0a] p-2 rounded overflow-x-auto text-[#00ff88]/80">
                        {m.code}
                      </pre>
                      <button
                        onClick={() => { setCode(m.code!); evaluate(m.code!); }}
                        className="mt-1 text-xs text-[#00ff88] hover:underline"
                      >
                        ▶ Play this
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#666]">
                  <span className="cursor-blink">generating</span>
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
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Describe music..."
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00ff88]/50 placeholder-[#555]"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-[#00ff88] text-black rounded-lg text-sm font-medium hover:bg-[#00cc6a] disabled:opacity-30 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right: Editor + Visualizer */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Visualizer */}
          <div className="h-24 bg-[#0a0a0a] border-b border-[#2a2a2a] relative overflow-hidden" id="visualizer-container">
            <canvas ref={canvasRef} className="w-full h-full" width={800} height={96} />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center text-[#333] text-sm">
                audio visualization
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2a2a] bg-[#111]">
            <button
              onClick={() => isPlaying ? stopPlayback() : evaluate(code)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                isPlaying
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/30"
              }`}
            >
              {isPlaying ? "⏹ Stop" : "▶ Play"}
            </button>
            <button
              onClick={() => evaluate(code)}
              className="px-4 py-1.5 rounded text-sm bg-[#1a1a1a] border border-[#333] hover:bg-[#252525] transition-colors"
              title="Re-evaluate code"
            >
              ↻ Update
            </button>
            {error && <span className="text-red-400 text-xs ml-2">{error}</span>}
            <span className="ml-auto text-xs text-[#444]">Strudel REPL</span>
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  evaluate(code);
                }
                // Tab support
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  setCode(code.substring(0, start) + "  " + code.substring(end));
                  setTimeout(() => {
                    editorRef.current!.selectionStart = editorRef.current!.selectionEnd = start + 2;
                  }, 0);
                }
              }}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-[#0a0a0a] text-[#00ff88] font-mono text-sm p-4 resize-none outline-none leading-relaxed"
              placeholder="// Strudel code here... (Ctrl+Enter to play)"
            />
          </div>

          {/* Strudel iframe REPL */}
          <iframe
            id="strudel-frame"
            src="/strudel.html"
            className="hidden"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </main>
  );
}
