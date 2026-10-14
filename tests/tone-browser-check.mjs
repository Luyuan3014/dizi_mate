import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.DIZIMATE_TEST_URL || "http://localhost:5174";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("artifacts/tone-observation", { recursive: true });
const title = page.locator("[data-tone-title]");
const waitTitle = (value) => title.filter({ hasText: value }).waitFor({ timeout: 10000 });
async function screenshotObservation(path) {
  await page.locator("#tone-fixture").evaluate((el) => { el.style.visibility = "hidden"; });
  await page.locator("#tone-heading").click();
  await page.locator(".tone-observation").screenshot({ path });
  await page.locator("#tone-fixture").evaluate((el) => { el.style.visibility = ""; });
}
async function assertFits() {
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth > innerWidth + 1,
    metrics: [...document.querySelectorAll(".tone-metrics dd, .tone-reference-actions button, .tone-heading")].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
  }));
  assert.equal(overflow.page, false, "page overflows horizontally");
  assert.deepEqual(overflow.metrics, []);
}
try {
  await page.goto(`${base}/tests/tone-harness.html#long-tone`);
  await page.locator("[data-tone-toggle]").click();
  await page.locator("#mic-state").filter({ hasText: "已准备好" }).waitFor();
  await page.locator('[data-signal="clear"]').click();
  await waitTitle("声音主体较明显");
  await page.locator(".tone-details summary").click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector("[data-tone-spectrum]");
    const pixels = canvas.getContext("2d").getImageData(0, 0, 720, 180).data;
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 120 && pixels[i + 1] > 120) lit++;
    return lit > 50;
  });
  await assertFits();
  await screenshotObservation("artifacts/tone-observation/desktop-live.png");
  await page.locator('[data-signal="rich"]').click();
  await waitTitle("声音主体较明显");
  await page.locator('[data-signal="noise"]').click();
  await page.waitForFunction(() => document.querySelector("[data-tone-title]").textContent !== "声音主体较明显");
  assert.notEqual(await page.locator(".tone-verdict").getAttribute("data-tone-kind"), "observed");
  await page.locator('[data-signal="clipped"]').click();
  await waitTitle("输入声音失真");
  await page.locator('[data-signal="clear"]').click();
  await waitTitle("声音主体较明显");
  await page.locator('[data-signal="octave"]').click();
  await waitTitle("八度跳动");
  await page.locator('[data-signal="clear"]').click();
  await page.locator('[data-signal="silent"]').click();
  await page.locator("[data-tone-take]").filter({ hasText: "本口气：" }).waitFor();
  await page.locator('[data-signal="clear"]').click();
  await page.waitForFunction(() => document.querySelector(".tone-verdict").dataset.toneKind !== "uncertain");
  await page.locator('[data-signal="silent"]').click();
  await page.locator("[data-tone-take]").filter({ hasText: /上次有效观察|音区发生变化/ }).waitFor();

  const wav = Buffer.alloc(44 + 48000 * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < 48000; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 740 / 48000) * 4000), 44 + i * 2);
  await page.locator("[data-tone-file]").setInputFiles({ name: "fixture-reference.wav", mimeType: "audio/wav", buffer: wav });
  await page.locator("[data-tone-reference]").evaluate((audio) => audio.play());
  await page.waitForFunction(() => document.querySelector("#mic-state").textContent.includes("未开启"));
  assert.equal(await page.locator("[data-tone-reference]").evaluate((audio) => audio.paused), false);
  await page.locator('[data-action="long-listen"]').click();
  assert.equal(await page.locator("[data-tone-reference]").evaluate((audio) => audio.paused), true);

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await assertFits();
    await screenshotObservation(`artifacts/tone-observation/mobile-${width}.png`);
  }
  await page.goto(`${base}/tests/tone-harness.html#tuner`);
  await page.locator("#mic-button").click();
  await page.locator("#mic-state").filter({ hasText: "已准备好" }).waitFor();
  await page.locator('[data-signal="clear"]').click();
  await waitTitle("声音主体较明显");
  await assertFits();
  await screenshotObservation("artifacts/tone-observation/tuner-mobile.png");
  await page.locator("#fixture-disconnect").click();
  await page.locator("#mic-state").filter({ hasText: "中断" }).waitFor();
  await page.locator("#mic-mode").selectOption("compatible");
  await page.locator('[data-signal="silent"]').click();
  await page.locator("#mic-button").click();
  await page.locator("#mic-state").filter({ hasText: "已准备好" }).waitFor();
  await page.locator('[data-signal="clear"]').click();
  await waitTitle("拾音处理影响观察");
  await page.goto(`${base}/tests/tone-harness.html#long-tone`);
  await page.locator("#mic-mode").selectOption("precise");
  await page.locator('[data-signal="silent"]').click();
  await page.locator("#long-start").click();
  await page.locator("#mic-state").filter({ hasText: "已准备好" }).waitFor();
  await page.locator('[data-signal="clear"]').click();
  await page.locator("#long-countdown").waitFor({ state: "visible" });
  assert.equal(await title.textContent(), "等待持续单音");
  await waitTitle("声音主体较明显");
  await page.locator("#long-result").filter({ hasText: "黄金" }).waitFor({ timeout: 15000 });
  await page.locator("#mic-state").filter({ hasText: "未开启" }).waitFor();
  await page.locator("[data-tone-take]").filter({ hasText: "本口气：" }).waitFor();
  await page.goto(`${base}/#long-tone`);
  await assertFits();
  assert.deepEqual(errors, []);
  console.log("PASS: live Web Audio, harmonic tolerance, noise, clipping, octave jumps, breath comparison, local playback isolation, interruption, compatibility, countdown/gold-medal lifecycle and 360/390/430px layouts.");
} catch (error) {
  await page.screenshot({ path: "artifacts/tone-observation/failure.png", fullPage: true });
  console.error({ title: await title.textContent().catch(() => "missing"), errors });
  throw error;
} finally {
  await browser.close();
}
