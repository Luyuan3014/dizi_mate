import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

test("production shell exposes an installable offline app", () => {
  const manifest = JSON.parse(readFileSync(join(root, "public", "manifest.webmanifest"), "utf8"));
  const index = readFileSync(join(root, "index.html"), "utf8");
  const worker = readFileSync(join(root, "public", "sw.js"), "utf8");

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/#practice");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
  assert.match(index, /rel="manifest"/);
  assert.match(worker, /caches\.open\(CACHE_NAME\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});
