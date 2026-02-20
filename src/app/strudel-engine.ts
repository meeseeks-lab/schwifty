// eslint-disable-next-line
let scheduler: Record<string, Function> | null = null;
let initialized = false;

export async function initStrudel() {
  if (initialized) return true;
  try {
    const core = await import("@strudel/core");
    const mini = await import("@strudel/mini");
    const webaudio = await import("@strudel/webaudio");
    const tonal = await import("@strudel/tonal");

    const ctx = webaudio.getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    webaudio.registerSynthSounds();

    // Register everything in eval scope
    core.evalScope(core.controls, core, mini, webaudio, tonal);

    scheduler = await core.repl({
      defaultOutput: webaudio.webaudioOutput,
    });

    initialized = true;
    console.log("[strudel] ready");
    return true;
  } catch (e) {
    console.error("[strudel] init error:", e);
    return false;
  }
}

export async function evaluate(code: string) {
  if (!scheduler) throw new Error("Not initialized");
  return scheduler.evaluate(code);
}

export function stop() {
  if (scheduler) scheduler.stop();
}
