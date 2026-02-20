import * as Tone from "tone";

let started = false;
let currentParts: Tone.Part[] = [];
let currentLoop: number | null = null;

export async function startAudio() {
  if (!started) {
    await Tone.start();
    started = true;
  }
}

export function stopAll() {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  currentParts.forEach((p) => { p.dispose(); });
  currentParts = [];
  if (currentLoop !== null) {
    clearInterval(currentLoop);
    currentLoop = null;
  }
}

// Simple DSL interpreter for AI-generated music
// Format: JSON instructions that map to Tone.js calls
export function playFromInstructions(instructions: MusicInstructions) {
  stopAll();

  const transport = Tone.getTransport();
  transport.bpm.value = instructions.bpm || 120;

  // Create synths and effects
  const tracks = instructions.tracks.map((track) => {
    let synth: Tone.PolySynth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth;
    const effects: Tone.ToneAudioNode[] = [];

    // Reverb
    if (track.reverb) {
      const rev = new Tone.Reverb(track.reverb).toDestination();
      effects.push(rev);
    }
    // Delay
    if (track.delay) {
      const del = new Tone.FeedbackDelay(track.delay, 0.3).toDestination();
      effects.push(del);
    }
    // Filter
    if (track.filter) {
      const filt = new Tone.Filter(track.filter.freq || 1000, (track.filter.type || "lowpass") as BiquadFilterType).toDestination();
      effects.push(filt);
    }

    const dest = effects.length > 0 ? effects[0] : Tone.getDestination();

    switch (track.type) {
      case "drums":
      case "kick":
        synth = new Tone.MembraneSynth().connect(dest);
        break;
      case "hihat":
      case "metal":
        synth = new Tone.MetalSynth().connect(dest);
        break;
      case "noise":
        synth = new Tone.NoiseSynth().connect(dest);
        break;
      default:
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: (track.waveform || "triangle") as OscillatorType },
          envelope: {
            attack: track.attack || 0.01,
            decay: track.decay || 0.3,
            sustain: track.sustain ?? 0.5,
            release: track.release || 0.8,
          },
        }).connect(dest);
    }

    if (track.volume !== undefined) {
      synth.volume.value = track.volume;
    }

    // Create pattern
    const events = track.pattern.map((step, i) => {
      return { time: `0:${i}:0`, note: step, duration: track.duration || "8n" };
    });

    const part = new Tone.Part((time, event) => {
      if (event.note === null || event.note === "rest") return;
      if (synth instanceof Tone.NoiseSynth) {
        synth.triggerAttackRelease(event.duration, time);
      } else if (synth instanceof Tone.MetalSynth) {
        synth.triggerAttackRelease(event.duration, time, 0.5);
      } else if (synth instanceof Tone.MembraneSynth) {
        const n = typeof event.note === "string" ? event.note : "C2";
        synth.triggerAttackRelease(n, event.duration, time);
      } else {
        if (Array.isArray(event.note)) {
          synth.triggerAttackRelease(event.note, event.duration, time);
        } else {
          synth.triggerAttackRelease(event.note, event.duration, time);
        }
      }
    }, events);

    part.loop = true;
    part.loopEnd = `0:${track.pattern.length}:0`;
    part.start(0);
    currentParts.push(part);

    return { synth, effects, part };
  });

  transport.start();
  return tracks;
}

export interface TrackDef {
  type?: string;
  waveform?: string;
  pattern: (string | string[] | null)[];
  duration?: string;
  volume?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  reverb?: number;
  delay?: number;
  filter?: { freq?: number; type?: string };
}

export interface MusicInstructions {
  bpm?: number;
  tracks: TrackDef[];
}

type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";
