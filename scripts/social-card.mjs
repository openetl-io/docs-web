// Draws public/social-card.png, the 1200×630 picture a link to any page of
// the site shows where it's shared (lib/metadata.ts). It's openetl.io's card
// (scripts/generate-social-card.mjs in openetl-io/website) for the docs: the
// same paper, ink and orange, mark and layout, in the site's own Geist.
//
// The PNG is committed, so a build needs no browser. Run this after changing
// the card, with Chrome or Chromium installed, or CHROME set to one:
//
//   node scripts/social-card.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'social-card.png');

const browsers = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) throw new Error(`no Chrome or Chromium at ${browsers.join(', ')}: set CHROME`);

const font = fs
  .readFileSync(path.join(root, 'node_modules', '@fontsource-variable', 'geist', 'files', 'geist-latin-wght-normal.woff2'))
  .toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
*{box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{margin:0;position:relative;background:#f5f3ec;color:#292621;font-family:Geist,sans-serif;padding:54px 70px}
.top{font-size:24px;font-weight:700;letter-spacing:-1px}
.tag{position:absolute;right:70px;top:59px;font-size:17px;font-weight:700;letter-spacing:2px}
h1{font-size:104px;font-weight:700;line-height:1;letter-spacing:-5px;margin:92px 0 34px}
h1 span{color:#e9582b}
p{font-size:28px;line-height:1.3;margin:0;color:#5c554b;max-width:620px}
.mark{position:absolute;right:46px;top:150px;width:330px;transform:rotate(-12deg);color:#e9582b}
.bottom{position:absolute;bottom:0;left:0;right:0;height:20px;background:#e9582b}
</style></head><body>
<div class="top">openetl.</div>
<div class="tag">DOCS.OPENETL.IO</div>
<h1>OpenETL<br><span>documentation</span></h1>
<p>Self-hosted, open-source data integration for batch and streaming ETL and ELT.</p>
<svg class="mark" viewBox="0 0 512 512" fill="currentColor"><path fill-rule="evenodd" d="M38 256A150 150 0 1 0 338 256A150 150 0 1 0 38 256ZM98 256A90 90 0 1 0 278 256A90 90 0 1 0 98 256Z"/><path d="M188 106H444A30 30 0 0 1 444 166H188ZM308 226H412A30 30 0 0 1 412 286H308ZM188 346H444A30 30 0 0 1 444 406H188Z"/></svg>
<div class="bottom"></div>
</body></html>`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-card-'));
try {
  const page = path.join(dir, 'card.html');
  fs.writeFileSync(page, html);
  execFileSync(browser, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    // Time for the font to load before the screenshot.
    '--virtual-time-budget=5000',
    `--user-data-dir=${path.join(dir, 'profile')}`,
    `--screenshot=${out}`,
    `file://${page}`,
  ], { stdio: 'ignore' });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`${path.relative(root, out)}: 1200×630`);
