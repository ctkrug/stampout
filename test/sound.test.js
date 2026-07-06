import { test } from "node:test";
import assert from "node:assert/strict";
import { MUTE_STORAGE_KEY, createSoundEngine } from "../public/js/lib/sound.js";

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value)
  };
}

class FakeOscillator {
  constructor() {
    this.frequency = { value: 0 };
    this.type = "sine";
  }
  connect(node) {
    return node;
  }
  start() {}
  stop() {}
}

class FakeGain {
  constructor() {
    this.gain = { value: 0, exponentialRampToValueAtTime: () => {} };
  }
  connect(node) {
    return node;
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.created = [];
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.created.push(oscillator);
    return oscillator;
  }
  createGain() {
    return new FakeGain();
  }
}

test("createSoundEngine defaults to unmuted with no stored preference", () => {
  const engine = createSoundEngine({ store: fakeStore() });
  assert.equal(engine.isMuted(), false);
});

test("createSoundEngine restores a persisted mute preference", () => {
  const engine = createSoundEngine({ store: fakeStore({ [MUTE_STORAGE_KEY]: "true" }) });
  assert.equal(engine.isMuted(), true);
});

test("toggleMuted flips and persists the preference", () => {
  const store = fakeStore();
  const engine = createSoundEngine({ store });
  assert.equal(engine.toggleMuted(), true);
  assert.equal(store.getItem(MUTE_STORAGE_KEY), "true");
  assert.equal(engine.toggleMuted(), false);
  assert.equal(store.getItem(MUTE_STORAGE_KEY), "false");
});

test("playThump does not throw when muted", () => {
  const engine = createSoundEngine({
    store: fakeStore({ [MUTE_STORAGE_KEY]: "true" }),
    AudioContextClass: FakeAudioContext
  });
  assert.doesNotThrow(() => engine.playThump());
});

test("playThump and playTick do not throw with no AudioContext available", () => {
  const engine = createSoundEngine({ store: fakeStore() });
  assert.doesNotThrow(() => engine.playThump());
  assert.doesNotThrow(() => engine.playTick());
});

test("playThump starts an oscillator when unmuted and a context is available", () => {
  const engine = createSoundEngine({ store: fakeStore(), AudioContextClass: FakeAudioContext });
  engine.playThump();
  assert.equal(engine.ensureContext().created.length, 1);
});

test("the AudioContext is constructed lazily, only once a sound plays", () => {
  let constructed = 0;
  class CountingContext extends FakeAudioContext {
    constructor() {
      super();
      constructed += 1;
    }
  }
  const engine = createSoundEngine({ store: fakeStore(), AudioContextClass: CountingContext });
  assert.equal(constructed, 0);
  engine.playTick();
  assert.equal(constructed, 1);
  engine.playThump();
  assert.equal(constructed, 1);
});
