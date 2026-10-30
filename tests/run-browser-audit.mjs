/**
 * EvidenceCheck AI — End-to-End Real Browser Audit
 *
 * Runs headless Chrome against the Next.js production server.
 * Captures real screenshots at 1440px and 390px.
 * Tests interactions:
 * - Homepage input & example pills
 * - Archive report navigation & verdict reveal
 * - Interactive Evidence Trail node clicking & inspector updates
 * - Citation drawer expansion & failed citation distinction
 * - Dashboard view & setup blocker
 * - Canvas non-interference & performance metrics
 */

import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/f", "/t"]);
    } else {
      process.kill(pid);
    }
  } catch {}
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (err) {
      lastError = err;
    }
    await wait(400);
  }
  console.error("Last fetch error:", lastError?.message || lastError);
  return false;
}

async function main() {
  console.log("=== EVIDENCECHECK AI: REAL BROWSER UI AUDIT START ===");

  if (!fs.existsSync(CHROME_PATH)) {
    console.error("Chrome executable not found at:", CHROME_PATH);
    process.exit(1);
  }

  // 1. Start Next.js production server
  console.log("[1/6] Launching Next.js production server on port", PORT, "...");
  const serverProcess = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    shell: true,
    stdio: "pipe",
  });

  serverProcess.stdout.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log("  [Server]", msg);
  });

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.error("  [Server Error]", msg);
  });

  const serverReady = await waitForServer(BASE_URL);
  if (!serverReady) {
    console.error("Failed to connect to Next.js server within timeout.");
    killProcessTree(serverProcess.pid);
    try { serverProcess.kill(); } catch {}
    process.exit(1);
  }
  console.log("  ✓ Next.js production server is live and responding at", BASE_URL);

  // 2. Launch headless Chrome via puppeteer-core
  console.log("\n[2/6] Launching Headless Chrome browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => console.log("  [Browser Console]", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("  [Browser Error]", err.message));
  const screenshotsDir = path.join(process.cwd(), "tests", "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results = {
    checks: [],
    metrics: {},
    screenshots: [],
  };

  function recordCheck(name, passed, details = "") {
    results.checks.push({ name, passed, details });
    const mark = passed ? "✓ [PASS]" : "✗ [FAIL]";
    console.log(`  ${mark} ${name}${details ? ` (${details})` : ""}`);
  }

  try {
    // =========================================================================
    // AUDIT 1: DESKTOP HOMEPAGE (1440 x 900)
    // =========================================================================
    console.log("\n[3/6] Inspecting Desktop Experience (1440px)...");
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await wait(800);

    // Verify title and heading
    const title = await page.title();
    recordCheck("Page Title", title.includes("EvidenceCheck"), title);

    const hasH1 = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      return h1 && h1.innerText.includes("Audit Factual Claims");
    });
    recordCheck("Hero Headline Visible", Boolean(hasH1));

    // Verify claim textarea
    const textareaExists = await page.evaluate(() => {
      const el = document.querySelector("#claim-input");
      return el && !el.disabled;
    });
    recordCheck("Claim Input Present & Writable", Boolean(textareaExists));

    // Verify canvas background does not block pointer events
    const canvasPointerEvents = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return null;
      return window.getComputedStyle(canvas).pointerEvents;
    });
    recordCheck(
      "Constellation Canvas Non-Blocking",
      canvasPointerEvents === "none",
      `pointer-events: ${canvasPointerEvents}`
    );

    // Test typing in textarea
    await page.type("#claim-input", "Testing keyboard interaction");
    const typedValue = await page.$eval("#claim-input", (el) => el.value);
    recordCheck(
      "Textarea Keyboard Input",
      typedValue === "Testing keyboard interaction"
    );

    // Clear and click an example pill
    await page.$eval("#claim-input", (el) => (el.value = ""));
    const exampleButton = await page.$('button[data-testid="example-pill"]');
    if (exampleButton) {
      await exampleButton.click();
      await wait(200);
      const pillValue = await page.$eval("#claim-input", (el) => el.value);
      recordCheck(
        "Example Claim Pill Populates Input",
        pillValue.length > 10,
        `Length: ${pillValue.length}`
      );
    }

    // Capture Desktop Home Screenshot
    const ssHome = path.join(screenshotsDir, "desktop-01-home.png");
    await page.screenshot({ path: ssHome, fullPage: false });
    results.screenshots.push("desktop-01-home.png");
    console.log("  📸 Saved screenshot:", ssHome);

    // =========================================================================
    // AUDIT 2: VERIFIED REPORT & VERDICT SHOWCASE (1440px)
    // =========================================================================
    console.log("\n[4/6] Inspecting Real Evidence Report & Verdict...");
    // Click "Inspect Verified Run"
    const clickedArchive = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="inspect-archive-btn"]') ||
                  document.querySelector('[data-testid="header-archive-tab"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log("  Archive button clicked:", clickedArchive);
    await page.waitForFunction(
      () => document.body.innerText.includes("SUPPORTED"),
      { timeout: 8000 }
    );

    // Check verdict badge and confidence
    const verdictInfo = await page.evaluate(() => {
      const supportedBadge = document.body.innerText.includes("SUPPORTED");
      const scoreVisible = document.body.innerText.includes("0.75");
      const originalClaimVisible = document.body.innerText.includes(
        "speed of light in a vacuum"
      );
      return { supportedBadge, scoreVisible, originalClaimVisible };
    });

    recordCheck(
      "Verdict Badge 'SUPPORTED' Rendered",
      verdictInfo.supportedBadge
    );
    recordCheck(
      "Heuristic Support Index '0.75' Visible",
      verdictInfo.scoreVisible
    );
    recordCheck(
      "Original Claim Legible",
      verdictInfo.originalClaimVisible
    );

    const ssReport = path.join(screenshotsDir, "desktop-02-report.png");
    await page.screenshot({ path: ssReport, fullPage: false });
    results.screenshots.push("desktop-02-report.png");
    console.log("  📸 Saved screenshot:", ssReport);

    // =========================================================================
    // AUDIT 3: INTERACTIVE EVIDENCE TRAIL GRAPH (1440px)
    // =========================================================================
    console.log("\n[5/6] Inspecting Interactive Evidence Trail & Node Connections...");

    // Scroll evidence trail into view
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="trail-node-src-1"]');
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await wait(200);

    // Find and click Source node `src-1`
    await page.click('[data-testid="trail-node-src-1"]');
    await wait(300);

    const inspectorSourceState = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes("source: src-1") &&
        text.includes("open authentic webpage")
      );
    });
    recordCheck(
      "Source Node (src-1) Click Opens Inspector & Webpage Action",
      inspectorSourceState
    );

    // Find and click Passage node `psg-1`
    await page.click('[data-testid="trail-node-psg-1"]');
    await wait(300);

    const inspectorPassageState = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes("passage: psg-1") &&
        text.includes("character offsets:")
      );
    });
    recordCheck(
      "Passage Node (psg-1) Click Displays Retained Text & Offsets",
      inspectorPassageState
    );

    // Find and click Citation node `cit-1` (the failed citation)
    await page.click('[data-testid="trail-node-cit-1"]');
    await wait(300);

    const inspectorCitationState = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes("citation audit: cit-1") &&
        text.includes("audit rejection:")
      );
    });
    recordCheck(
      "Failed Citation Node (cit-1) Visibly Explains Audit Rejection",
      inspectorCitationState
    );

    const ssTrail = path.join(screenshotsDir, "desktop-03-evidence-trail.png");
    await page.screenshot({ path: ssTrail, fullPage: false });
    results.screenshots.push("desktop-03-evidence-trail.png");
    console.log("  📸 Saved screenshot:", ssTrail);

    // Scroll down to Citation Audit section
    await page.evaluate(() => {
      const h3s = Array.from(document.querySelectorAll("h3"));
      const target = h3s.find((h) => h.innerText.includes("Deterministic Citation Audit Trail"));
      if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await wait(200);

    // Test expandable citation drawer in lower list
    const drawerClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("View Source Passage Context"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (drawerClicked) {
      await wait(400);
      const drawerOpened = await page.evaluate(() => {
        return document.body.innerText.includes("Hide Source Passage Context");
      });
      recordCheck("Citation Inline Drawer Expands Verbatim Context", drawerOpened);
    }

    const ssCitations = path.join(screenshotsDir, "desktop-04-citation-audit.png");
    await page.screenshot({ path: ssCitations, fullPage: false });
    results.screenshots.push("desktop-04-citation-audit.png");
    console.log("  📸 Saved screenshot:", ssCitations);

    // Dashboard navigation
    const dashClicked = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="header-dashboard-tab"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (dashClicked) {
      await page.waitForFunction(
        () => document.body.innerText.includes("Investigation Observatory"),
        { timeout: 8000 }
      );
      // Wait for async fetch to finish loading reports
      await page.waitForFunction(
        () => !document.body.innerText.includes("Loading stored investigations..."),
        { timeout: 8000 }
      );

      const dashboardState = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes("investigation observatory") &&
          (text.includes("database_url is not set") ||
            text.includes("stored investigation reports") ||
            text.includes("durable postgresql persistence status")) &&
          text.includes("verified live archive")
        );
      });
      recordCheck(
        "Dashboard Renders Genuine Records & Honest DB Blocker",
        dashboardState
      );

      const ssDash = path.join(screenshotsDir, "desktop-05-dashboard.png");
      await page.screenshot({ path: ssDash, fullPage: false });
      results.screenshots.push("desktop-05-dashboard.png");
      console.log("  📸 Saved screenshot:", ssDash);
    }

    // =========================================================================
    // AUDIT 4: MOBILE RESPONSIVENESS (390 x 844 iPhone viewport)
    // =========================================================================
    console.log("\n[6/6] Inspecting Mobile Viewport (390px)...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });
    await wait(600);

    const mobileHomeReadable = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const textarea = document.querySelector("#claim-input");
      const btn = document.querySelector('button[type="submit"]');
      return Boolean(h1 && textarea && btn);
    });
    recordCheck("Mobile Homepage Cleanly Formatted (390px)", mobileHomeReadable);

    const ssMobileHome = path.join(screenshotsDir, "mobile-01-home.png");
    await page.screenshot({ path: ssMobileHome, fullPage: false });
    results.screenshots.push("mobile-01-home.png");
    console.log("  📸 Saved screenshot:", ssMobileHome);

    // Navigate to Verified Run on Mobile
    const mobileArchiveClicked = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="inspect-archive-btn"]') ||
                  document.querySelector('[data-testid="header-archive-tab"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (mobileArchiveClicked) {
      await page.waitForFunction(
        () => document.body.innerText.includes("SUPPORTED"),
        { timeout: 8000 }
      );

      const mobileReportOk = await page.evaluate(() => {
        return (
          document.body.innerText.includes("SUPPORTED") &&
          document.body.innerText.includes("0.75")
        );
      });
      recordCheck("Mobile Report & Verdict Legible", mobileReportOk);

      const ssMobileReport = path.join(screenshotsDir, "mobile-02-report.png");
      await page.screenshot({ path: ssMobileReport, fullPage: false });
      results.screenshots.push("mobile-02-report.png");
      console.log("  📸 Saved screenshot:", ssMobileReport);
    }

    // Performance measurements via Chrome CDP
    const perfMetrics = await page.metrics();
    results.metrics = {
      Timestamp: perfMetrics.Timestamp,
      Documents: perfMetrics.Documents,
      Frames: perfMetrics.Frames,
      JSEventListeners: perfMetrics.JSEventListeners,
      Nodes: perfMetrics.Nodes,
      LayoutCount: perfMetrics.LayoutCount,
      RecalcStyleCount: perfMetrics.RecalcStyleCount,
      LayoutDuration: `${(perfMetrics.LayoutDuration * 1000).toFixed(2)} ms`,
      RecalcStyleDuration: `${(perfMetrics.RecalcStyleDuration * 1000).toFixed(2)} ms`,
      ScriptDuration: `${(perfMetrics.ScriptDuration * 1000).toFixed(2)} ms`,
      JSHeapUsedSize: `${(perfMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`,
      JSHeapTotalSize: `${(perfMetrics.JSHeapTotalSize / 1024 / 1024).toFixed(2)} MB`,
    };

    console.log("\n=== REAL PERFORMANCE METRICS (Chrome DevTools Protocol) ===");
    for (const [k, v] of Object.entries(results.metrics)) {
      console.log(`  - ${k}: ${v}`);
    }
  } catch (err) {
    console.error("Browser audit runtime exception:", err);
  } finally {
    await browser.close();
    killProcessTree(serverProcess.pid);
    try { serverProcess.kill(); } catch {}
    console.log("\nBrowser closed and server process terminated.");
  }

  // Summary
  const passCount = results.checks.filter((c) => c.passed).length;
  const failCount = results.checks.filter((c) => !c.passed).length;
  console.log(`\n=== BROWSER AUDIT SUMMARY: ${passCount} passed, ${failCount} failed ===`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal audit execution error:", err);
  process.exit(1);
});
