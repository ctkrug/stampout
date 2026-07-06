import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// app.js boots main() on import and, under node:test + linkedom, that trips a
// runner/GC interaction unrelated to the app. So the actual end-to-end boot
// (fetch -> render -> click -> persist -> re-render) lives in a standalone
// harness run in a clean node process; this asserts it succeeds.
const harness = fileURLToPath(new URL("../scripts/app-smoke.mjs", import.meta.url));

test("app.js boots, renders, and drives a confirm through to persistence", () => {
  let output;
  try {
    output = execFileSync("node", [harness], { encoding: "utf8", timeout: 30000 });
  } catch (error) {
    assert.fail(`app smoke harness failed:\n${error.stdout || ""}\n${error.stderr || ""}`);
  }
  assert.match(output, /SMOKE_OK/);
});
