export const MUTE_STORAGE_KEY = "optoutly:v1:muted";

/**
 * WebAudio-synthesized SFX, gated behind a persisted mute flag. The
 * AudioContext is created lazily (only once a sound actually needs to play)
 * so it's built on a real user gesture, satisfying the autoplay policy, and
 * so it never needs to exist at all in environments without one (tests).
 */
export function createSoundEngine({ AudioContextClass, store, storageKey = MUTE_STORAGE_KEY } = {}) {
  let ctx = null;
  let muted = store ? store.getItem(storageKey) === "true" : false;

  function ensureContext() {
    if (!ctx && AudioContextClass) {
      ctx = new AudioContextClass();
    }
    return ctx;
  }

  function isMuted() {
    return muted;
  }

  function setMuted(next) {
    muted = next;
    if (store) store.setItem(storageKey, String(next));
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function playTone({ frequency, duration, type = "sine", gain = 0.15 }) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    oscillator.stop(audioCtx.currentTime + duration);
  }

  function playThump() {
    playTone({ frequency: 90, duration: 0.18, type: "sine", gain: 0.2 });
  }

  function playTick() {
    playTone({ frequency: 440, duration: 0.05, type: "square", gain: 0.08 });
  }

  return { isMuted, setMuted, toggleMuted, playThump, playTick, ensureContext };
}
