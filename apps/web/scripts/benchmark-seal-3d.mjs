import { spawn } from "node:child_process";
import { cpus, platform, release } from "node:os";
import { chromium } from "@playwright/test";

const DIST_DIR = ".next-benchmark-3d";
const DEFAULT_BASE_URL = "http://127.0.0.1:3150";
const STUDIO_PATH = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";
const READY_BUDGET_MS = 2_500;
const FALLBACK_BUDGET_MS = 300;
const DYNAMIC_BUDGET_BYTES = 320 * 1_024;

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const readySampleCount = positiveInteger(process.env.BENCHMARK_3D_SAMPLES, 20);
const fallbackSampleCount = positiveInteger(process.env.BENCHMARK_3D_FALLBACK_SAMPLES, 10);
const cpuRate = positiveInteger(process.env.BENCHMARK_3D_CPU_RATE, 4);
const networkLatencyMs = positiveInteger(process.env.BENCHMARK_3D_LATENCY_MS, 40);
const downloadThroughput = positiveInteger(process.env.BENCHMARK_3D_DOWNLOAD_BPS, 1_250_000);
const uploadThroughput = positiveInteger(process.env.BENCHMARK_3D_UPLOAD_BPS, 625_000);
const externalBaseUrl = process.env.BENCHMARK_BASE_URL;
const baseUrl = externalBaseUrl ?? DEFAULT_BASE_URL;

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function waitForServer(url, serverState, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverState.child.exitCode !== null) {
      throw new Error(`Production server exited early:\n${serverState.output()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startProductionServer() {
  const url = new URL(baseUrl);
  const child = spawn(
    "pnpm",
    ["exec", "next", "start", "--hostname", url.hostname, "--port", url.port || "3000"],
    {
      env: {
        ...process.env,
        NEXT_DIST_DIR: DIST_DIR,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  return {
    child,
    output: () => logs.join("").slice(-4_000),
  };
}

function stopProductionServer(serverState) {
  if (serverState?.child.exitCode === null) serverState.child.kill("SIGTERM");
}

async function configurePage(browser, saveData) {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: 1_280, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((shouldSaveData) => {
    if (shouldSaveData) {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true },
      });
    }
    window.__fangcunBenchmarkEvents = [];
    window.addEventListener("fangcun:event", (event) => {
      const detail = event.detail;
      if (detail?.name === "viewer_3d_ready" || detail?.name === "viewer_3d_fallback") {
        window.__fangcunBenchmarkEvents.push(detail);
      }
    });
  }, saveData);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    connectionType: "wifi",
    downloadThroughput,
    latency: networkLatencyMs,
    offline: false,
    uploadThroughput,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  return { context, errors, page };
}

async function enterStoneStage(page) {
  await page.goto(new URL(STUDIO_PATH, baseUrl).toString(), { waitUntil: "networkidle" });
  await page.locator(".studio-preview svg").waitFor({ state: "visible", timeout: 15_000 });
  const loadedBeforeStage = await page.evaluate(() => window.__fangcun3dModuleLoaded === true);
  await page.getByRole("button", { name: "3D 石章", exact: true }).click();
  await page.getByRole("img", { name: "当前印蜕 SVG 海报" }).waitFor({ state: "visible" });
  const loadedBeforeOpen = await page.evaluate(() => window.__fangcun3dModuleLoaded === true);
  return { loadedBeforeOpen, loadedBeforeStage };
}

async function readySample(browser, sampleNumber) {
  const { context, errors, page } = await configurePage(browser, false);
  try {
    const moduleState = await enterStoneStage(page);
    await page.evaluate(() => {
      window.__fangcunBenchmarkOpenedAt = performance.now();
    });
    await page.getByRole("button", { name: "打开 3D 石章" }).click();
    await page.waitForFunction(
      () => window.__fangcunBenchmarkEvents.length > 0,
      undefined,
      { timeout: 15_000 },
    );
    const result = await page.evaluate(() => {
      const event = window.__fangcunBenchmarkEvents[0];
      const openedAt = window.__fangcunBenchmarkOpenedAt;
      const scripts = performance.getEntriesByType("resource")
        .filter((entry) => entry.initiatorType === "script" && entry.startTime >= openedAt)
        .map((entry) => ({
          durationMs: Math.round(entry.duration),
          encodedBodySize: entry.encodedBodySize,
          name: entry.name.split("/").pop()?.split("?")[0] ?? entry.name,
        }));
      return {
        dynamicScriptBytes: scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        event,
        moduleLoaded: window.__fangcun3dModuleLoaded === true,
        scripts,
        status: document.querySelector("[data-viewer-status]")?.getAttribute("data-viewer-status"),
      };
    });
    if (result.event?.name !== "viewer_3d_ready") {
      throw new Error(`sample ${sampleNumber} fell back: ${result.event?.properties?.reason ?? "unknown"}`);
    }
    if (result.status !== "ready" || !result.moduleLoaded) {
      throw new Error(`sample ${sampleNumber} did not reach an interactive canvas`);
    }
    if (moduleState.loadedBeforeStage || moduleState.loadedBeforeOpen) {
      throw new Error(`sample ${sampleNumber} loaded R3F before explicit open`);
    }
    if (errors.length > 0) throw new Error(`sample ${sampleNumber} console errors: ${errors.join(" | ")}`);
    return {
      dynamicScriptBytes: result.dynamicScriptBytes,
      elapsedMs: result.event.properties?.elapsedMs,
      scripts: result.scripts,
    };
  } finally {
    await context.close();
  }
}

async function fallbackSample(browser, sampleNumber) {
  const { context, errors, page } = await configurePage(browser, true);
  try {
    const moduleState = await enterStoneStage(page);
    await page.getByRole("button", { name: "打开 3D 石章" }).click();
    await page.waitForFunction(
      () => window.__fangcunBenchmarkEvents.length > 0,
      undefined,
      { timeout: 5_000 },
    );
    const result = await page.evaluate(() => ({
      event: window.__fangcunBenchmarkEvents[0],
      moduleLoaded: window.__fangcun3dModuleLoaded === true,
      posterVisible: Boolean(document.querySelector('[aria-label="当前印蜕 SVG 海报"]')),
      status: document.querySelector("[data-viewer-status]")?.getAttribute("data-viewer-status"),
    }));
    if (result.event?.name !== "viewer_3d_fallback" || result.status !== "fallback") {
      throw new Error(`fallback sample ${sampleNumber} did not use the poster`);
    }
    if (moduleState.loadedBeforeStage || moduleState.loadedBeforeOpen || result.moduleLoaded) {
      throw new Error(`fallback sample ${sampleNumber} loaded the R3F module`);
    }
    if (!result.posterVisible) throw new Error(`fallback sample ${sampleNumber} lost the SVG poster`);
    if (errors.length > 0) throw new Error(`fallback sample ${sampleNumber} console errors: ${errors.join(" | ")}`);
    return result.event.properties?.elapsedMs;
  } finally {
    await context.close();
  }
}

async function main() {
  let productionServer;
  let browser;
  try {
    if (!externalBaseUrl) {
      await run("pnpm", ["exec", "next", "build"], {
        env: {
          ...process.env,
          NEXT_DIST_DIR: DIST_DIR,
          NEXT_TELEMETRY_DISABLED: "1",
        },
      });
      productionServer = startProductionServer();
      await waitForServer(new URL(STUDIO_PATH, baseUrl), productionServer);
    }

    browser = await chromium.launch({ headless: true });
    const readySamples = [];
    for (let index = 0; index < readySampleCount; index += 1) {
      readySamples.push(await readySample(browser, index + 1));
    }
    const fallbackSamples = [];
    for (let index = 0; index < fallbackSampleCount; index += 1) {
      fallbackSamples.push(await fallbackSample(browser, index + 1));
    }

    const readyDurations = readySamples.map((sample) => sample.elapsedMs);
    const dynamicBytes = readySamples.map((sample) => sample.dynamicScriptBytes);
    const readyP75Ms = percentile(readyDurations, 0.75);
    const fallbackP75Ms = percentile(fallbackSamples, 0.75);
    const dynamicScriptP75Bytes = percentile(dynamicBytes, 0.75);
    const report = {
      browser: await browser.version(),
      budgets: {
        dynamicScriptBytes: DYNAMIC_BUDGET_BYTES,
        fallbackP75Ms: FALLBACK_BUDGET_MS,
        readyP75Ms: READY_BUDGET_MS,
      },
      environment: {
        cpu: cpus()[0]?.model ?? "unknown",
        cpuThrottlingRate: cpuRate,
        downloadThroughput,
        networkLatencyMs,
        os: `${platform()} ${release()}`,
        uploadThroughput,
      },
      result: {
        dynamicScriptP75Bytes,
        fallbackP75Ms,
        pass: readyP75Ms <= READY_BUDGET_MS
          && fallbackP75Ms <= FALLBACK_BUDGET_MS
          && dynamicScriptP75Bytes <= DYNAMIC_BUDGET_BYTES,
        readyP75Ms,
      },
      samples: {
        fallbackMs: fallbackSamples,
        ready: readySamples,
      },
      timestamp: new Date().toISOString(),
      url: new URL(STUDIO_PATH, baseUrl).toString(),
    };

    console.log("\n3D PERFORMANCE BUDGET");
    console.log(`ready P75      ${readyP75Ms}ms / ${READY_BUDGET_MS}ms`);
    console.log(`fallback P75   ${fallbackP75Ms}ms / ${FALLBACK_BUDGET_MS}ms`);
    console.log(`dynamic P75    ${dynamicScriptP75Bytes} bytes / ${DYNAMIC_BUDGET_BYTES} bytes`);
    console.log(`result         ${report.result.pass ? "PASS" : "FAIL"}`);
    console.log(`FANGCUN_3D_BENCHMARK=${JSON.stringify(report)}`);
    if (!report.result.pass) process.exitCode = 1;
  } finally {
    await browser?.close();
    stopProductionServer(productionServer);
  }
}

await main();
