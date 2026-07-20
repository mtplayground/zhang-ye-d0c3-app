import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:8080';
const HISTORY_STORAGE_KEY = 'classic-cube.solve-history.v1';
const SEEDED_BEST = {
  elapsedMs: 50,
  moveCount: 1,
  completedAt: '2026-01-01T00:00:00.000Z',
};

let server;
let browser;

try {
  server = startDevServer();
  await waitForServer(BASE_URL);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 820 },
  });
  const page = await context.newPage();

  await page.addInitScript(
    ({ key, best }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, results: [best] }),
      );
    },
    { key: HISTORY_STORAGE_KEY, best: SEEDED_BEST },
  );

  await page.goto(`${BASE_URL}/?e2e=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__cubeE2E));
  await assertCanvasReady(page, {
    label: 'desktop',
    minWidth: 720,
    minHeight: 340,
  });

  const timer = page.getByLabel('计时器');
  await expectAttribute(timer, 'data-timer-status', 'idle');
  await expectText(page.locator('footer'), /最佳\s*00:00\.05/);

  await page.evaluate(() => {
    window.__cubeE2E.scrambleWithSequence('R U');
  });

  await expectAttribute(timer, 'data-timer-status', 'running');
  await delay(260);
  const runningElapsedMs = parseElapsedTime(await timer.textContent());
  assert(
    runningElapsedMs >= 200,
    `timer should advance from high precision clock after scramble, got ${runningElapsedMs}ms`,
  );

  await page.evaluate(() => {
    window.__cubeE2E.commitMove({
      face: 'U',
      direction: 'counterclockwise',
      amount: 1,
    });
  });

  await expectText(page.locator('footer'), /步数\s*1/);
  assert(
    (await page.getByRole('dialog').count()) === 0,
    'partial inverse solve must not trigger a completion dialog',
  );
  await expectAttribute(timer, 'data-timer-status', 'running');

  await delay(120);
  await page.evaluate(() => {
    window.__cubeE2E.commitMove({
      face: 'R',
      direction: 'counterclockwise',
      amount: 1,
    });
  });

  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await expectAttribute(timer, 'data-timer-status', 'stopped');
  await expectText(page.locator('footer'), /步数\s*2/);
  await expectText(dialog, /本局已完成/);
  await expectText(dialog, /距离最佳还差/);
  await expectText(dialog, /本局步数\s*2/);
  await expectText(dialog, /当前最佳\s*00:00\.05/);

  const completedElapsedMs = parseElapsedTime(await timer.textContent());
  assert(
    completedElapsedMs >= runningElapsedMs,
    `stopped timer should preserve elapsed time, got ${completedElapsedMs}ms after ${runningElapsedMs}ms`,
  );
  assert(
    completedElapsedMs < 5000,
    `E2E solve should finish within a bounded interval, got ${completedElapsedMs}ms`,
  );

  const history = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, HISTORY_STORAGE_KEY);
  assert(
    history?.version === 1,
    'solve history should be persisted with version 1',
  );
  assert(
    history.results.length === 2,
    `solve history should contain seeded best plus completed result, got ${history.results.length}`,
  );
  assert(
    history.results[0].moveCount === 2,
    `latest stored solve should record two effective moves, got ${history.results[0].moveCount}`,
  );
  assert(
    history.results[0].elapsedMs >= runningElapsedMs,
    'latest stored solve should use the same stopped high precision elapsed time',
  );
  assert(
    history.results[1].elapsedMs === SEEDED_BEST.elapsedMs,
    'seeded best should remain available for comparison',
  );

  await page.getByRole('button', { name: '再来一局' }).click();
  await expectAttribute(timer, 'data-timer-status', 'running');
  await expectText(page.locator('footer'), /步数\s*0/);
  assert(
    (await page.getByRole('dialog').count()) === 0,
    'play again should dismiss the result dialog and start a new scramble',
  );

  const mobileContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 700 },
  });
  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(`${BASE_URL}/?e2e=1`, { waitUntil: 'networkidle' });
    await mobilePage.waitForFunction(() => Boolean(window.__cubeE2E));
    await assertCanvasReady(mobilePage, {
      label: 'mobile',
      minWidth: 340,
      minHeight: 280,
    });
  } finally {
    await mobileContext.close();
  }

  console.log('E2E flow passed');
} finally {
  if (browser) {
    await browser.close();
  }

  if (server) {
    await stopDevServer(server);
  }
}

function startDevServer() {
  const child = spawn(
    'node',
    ['./node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '8080'],
    {
      cwd: process.cwd(),
      detached: true,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0 && code !== 143) {
      console.error(`Vite dev server exited with code ${code}`);
    }
    if (signal && signal !== 'SIGTERM') {
      console.error(`Vite dev server exited from signal ${signal}`);
    }
  });

  return child;
}

async function stopDevServer(child) {
  const exitPromise = new Promise((resolve) => {
    child.once('exit', resolve);
  });

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  await Promise.race([exitPromise, delay(3_000)]);
}

async function waitForServer(url) {
  const deadline = Date.now() + 20_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }

      lastError = new Error(`server responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function expectAttribute(locator, name, expectedValue) {
  await locator
    .page()
    .waitForFunction(
      ({ selector, attr, expected }) =>
        document.querySelector(selector)?.getAttribute(attr) === expected,
      {
        selector: await uniqueSelector(locator),
        attr: name,
        expected: expectedValue,
      },
    );
}

async function expectText(locator, pattern) {
  await locator.page().waitForFunction(
    ({ selector, source, flags }) => {
      const text = document.querySelector(selector)?.textContent ?? '';
      return new RegExp(source, flags).test(text);
    },
    {
      selector: await uniqueSelector(locator),
      source: pattern.source,
      flags: pattern.flags,
    },
  );
}

async function assertCanvasReady(page, { label, minWidth, minHeight }) {
  await page.waitForSelector('[data-testid="cube-webgl-canvas"]');
  await page.waitForTimeout(120);

  const result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="cube-webgl-canvas"]');

    if (!(canvas instanceof HTMLCanvasElement)) {
      return { ok: false, reason: 'canvas missing' };
    }

    const rect = canvas.getBoundingClientRect();
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');

    if (!gl) {
      return { ok: false, reason: 'WebGL context unavailable' };
    }

    const samplePoints = [
      [0.5, 0.5],
      [0.42, 0.42],
      [0.58, 0.44],
      [0.45, 0.58],
      [0.6, 0.58],
    ];
    const pixel = new Uint8Array(4);
    let nonTransparentSamples = 0;

    for (const [xRatio, yRatio] of samplePoints) {
      const x = Math.max(
        0,
        Math.min(
          gl.drawingBufferWidth - 1,
          Math.round(gl.drawingBufferWidth * xRatio),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          gl.drawingBufferHeight - 1,
          Math.round(gl.drawingBufferHeight * yRatio),
        ),
      );

      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      if (pixel[3] > 0 && pixel[0] + pixel[1] + pixel[2] > 0) {
        nonTransparentSamples += 1;
      }
    }

    return {
      ok: nonTransparentSamples > 0,
      reason: 'no nontransparent canvas samples',
      height: rect.height,
      nonTransparentSamples,
      width: rect.width,
    };
  });

  assert(
    result.width >= minWidth,
    `${label} canvas should be at least ${minWidth}px wide, got ${result.width}px`,
  );
  assert(
    result.height >= minHeight,
    `${label} canvas should be at least ${minHeight}px tall, got ${result.height}px`,
  );
  assert(
    result.ok,
    `${label} canvas should render nonblank WebGL pixels: ${result.reason}`,
  );
}

async function uniqueSelector(locator) {
  const selector = await locator.evaluate((element) => {
    if (element.getAttribute('aria-label') === '计时器') {
      return '[aria-label="计时器"]';
    }

    if (element.tagName.toLowerCase() === 'footer') {
      return 'footer';
    }

    if (element.getAttribute('role') === 'dialog') {
      return '[role="dialog"]';
    }

    throw new Error('E2E helper does not have a selector for this locator');
  });

  return selector;
}

function parseElapsedTime(text) {
  const match = text?.trim().match(/^(\d+):(\d{2})\.(\d{2})$/);

  if (!match) {
    throw new Error(`Invalid elapsed time text: ${text}`);
  }

  return (
    Number(match[1]) * 60_000 + Number(match[2]) * 1000 + Number(match[3]) * 10
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
