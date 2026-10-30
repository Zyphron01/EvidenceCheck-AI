import puppeteer from "puppeteer-core";
import * as fs from "node:fs";
import * as path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ICONS_DIR = path.join(process.cwd(), "extension", "icons");

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function generateIcons() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:transparent;overflow:hidden;">
        <canvas id="c" width="${size}" height="${size}"></canvas>
        <script>
          const c = document.getElementById("c");
          const ctx = c.getContext("2d");
          const s = ${size};

          // Background rounded shield container
          ctx.fillStyle = "#080D16";
          ctx.beginPath();
          ctx.roundRect(0, 0, s, s, s * 0.22);
          ctx.fill();

          // Border glow
          ctx.strokeStyle = "#23C9C5";
          ctx.lineWidth = Math.max(1, s * 0.06);
          ctx.stroke();

          // Inner shield icon
          ctx.fillStyle = "#23C9C5";
          ctx.beginPath();
          ctx.arc(s * 0.5, s * 0.5, s * 0.28, 0, Math.PI * 2);
          ctx.fill();

          // Inner checkmark
          ctx.fillStyle = "#080D16";
          ctx.beginPath();
          ctx.arc(s * 0.5, s * 0.5, s * 0.16, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#10B981";
          ctx.beginPath();
          ctx.arc(s * 0.72, s * 0.32, s * 0.12, 0, Math.PI * 2);
          ctx.fill();
        </script>
      </body>
      </html>
    `;

    await page.setContent(html);
    const canvasElement = await page.$("#c");
    const iconPath = path.join(ICONS_DIR, `icon${size}.png`);
    await canvasElement.screenshot({ path: iconPath, omitBackground: true });
    console.log(`Generated icon${size}.png (${size}x${size})`);
  }

  await browser.close();
}

generateIcons().catch(console.error);
