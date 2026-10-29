// Renders the two App Store product page creative assets:
//   out/header-3840x1646.jpg   Header (21:9)
//   out/search-3840x2560.jpg   Search Results (3:2)
// Same look as build.mjs: SF Pro Rounded, navy gradient, glowing marks. Run: node build-assets.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const C = { red: '#ff4655', teal: '#3be8e0', orange: '#ff6333', cream: '#f2ede6', muted: '#8a93a6' };

const base = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:"SF Pro Rounded",system-ui,sans-serif;color:${C.cream};
 background:
  radial-gradient(900px 700px at 8% 12%,rgba(255,99,51,.24),transparent 62%),
  radial-gradient(1000px 800px at 96% 92%,rgba(59,232,224,.17),transparent 62%),
  linear-gradient(180deg,#172131 0%,#0a0e15 100%)}
.copy{position:absolute;left:150px;top:50%;transform:translateY(-50%);width:760px}
h1{font-weight:900;font-size:150px;line-height:1.0;letter-spacing:-.015em}
h1 em{font-style:normal;color:${C.orange};text-shadow:0 0 70px rgba(255,99,51,.55)}
p{margin-top:34px;font-size:50px;font-weight:600;color:${C.muted};line-height:1.25}
svg{display:block;overflow:visible}
.phone{position:absolute;border-radius:96px;padding:14px;background:linear-gradient(160deg,#4d5466,#1d222d 38%,#0e1118);
 box-shadow:0 0 0 3px #07090d,0 60px 120px rgba(0,0,0,.6)}
.phone img{display:block;width:100%;border-radius:84px}
</style></head><body>${body}</body></html>`;

// ---- isometric helpers (same projection as build.mjs)
const A = Math.PI / 6;
const iso = (s, cx, cy) => (x, y, z) => [cx + (x - y) * Math.cos(A) * s, cy + (x + y) * Math.sin(A) * s - z * s];
const pts = (l) => l.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
const plate = (P, n, z) => {
  let o = `<polygon points="${pts([P(0, 0, z), P(n, 0, z), P(n, n, z), P(0, n, z)])}" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.6)" stroke-width="6" stroke-linejoin="round"/>`;
  const g = 0.09;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    o += `<polygon points="${pts([P(i + g, j + g, z), P(i + 1 - g, j + g, z), P(i + 1 - g, j + 1 - g, z), P(i + g, j + 1 - g, z)])}" fill="rgba(255,255,255,.10)"/>`;
  return o;
};
const X = (P, i, j, z, r = 18, w = 9) => { const [x, y] = P(i + .5, j + .5, z);
  return `<g stroke="${C.red}" stroke-width="${w}" stroke-linecap="round" filter="url(#g)"><line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}"/><line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}"/></g>`; };
const O = (P, i, j, z, r = 18, w = 8) => { const [x, y] = P(i + .5, j + .5, z);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${C.teal}" stroke-width="${w}" filter="url(#g)"/>`; };
const defs = `<defs><filter id="g" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

// ---- Header: 1920x823 canvas rendered at 2x = 3840x1646 (21:9)
function header() {
  // Three upright glass boards in perspective, turned to face left, like the game's own board view.
  const s = 116, d = 1.85, yaw = (-30 * Math.PI) / 180, pitch = (14 * Math.PI) / 180, roll = (-5 * Math.PI) / 180, D = 11;
  const cx = 1282, cy = 415;
  const proj = (x, y, z) => {
    let x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    let z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    let y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const k = D / (D - z2);
    x1 *= k; y1 *= k;
    const xr = x1 * Math.cos(roll) - y1 * Math.sin(roll), yr = x1 * Math.sin(roll) + y1 * Math.cos(roll);
    return [cx + xr * s, cy - yr * s, k];
  };
  const flat = (x, y, z) => proj(x, y, z).slice(0, 2);   // screen x,y only (proj also returns the perspective scale)
  const quad = (z, x0, y0, x1, y1) => pts([flat(x0, y0, z), flat(x1, y0, z), flat(x1, y1, z), flat(x0, y1, z)]);
  const at = (z, i, j) => proj(i - 1, 1 - j, z);
  const X = (z, i, j, w = 11) => { const [x, y, k] = at(z, i, j), r = 25 * k;
    return `<g stroke="${C.red}" stroke-width="${w}" stroke-linecap="round" filter="url(#g)"><line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}"/><line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}"/></g>`; };
  const O = (z, i, j, w = 10) => { const [x, y, k] = at(z, i, j);
    return `<circle cx="${x}" cy="${y}" r="${25 * k}" fill="none" stroke="${C.teal}" stroke-width="${w}" filter="url(#g)"/>`; };
  const board = (z, claimed) => {
    const edge = claimed ? C.red : 'rgba(255,255,255,.62)';
    let o = `<polygon points="${quad(z, -1.5, -1.5, 1.5, 1.5)}" fill="${claimed ? 'rgba(255,70,85,.15)' : 'rgba(255,255,255,.05)'}" stroke="${edge}" stroke-width="6" stroke-linejoin="round"/>`;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const c = [[i - 1.5 + 0.08, 1.5 - j - 0.08], [i - 0.5 - 0.08, 1.5 - j - 0.08], [i - 0.5 - 0.08, 0.5 - j + 0.08], [i - 1.5 + 0.08, 0.5 - j + 0.08]].map(([x, y]) => flat(x, y, z));
      o += `<polygon points="${pts(c)}" fill="rgba(255,255,255,${claimed ? '.08' : '.11'})"/>`;
    }
    return o;
  };
  const zs = [-d, 0, d];            // back, middle, front (front is nearest the viewer, so it ends up leftmost)
  let g = '';
  // A few pieces per board and no line on any of them: the picture says "3D board", not "someone won".
  g += board(zs[0], false) + O(zs[0], 2, 1) + X(zs[0], 1, 2);
  g += board(zs[1], false) + O(zs[1], 1, 1) + X(zs[1], 2, 0);
  g += board(zs[2], false) + X(zs[2], 0, 1) + O(zs[2], 1, 2);
  const body = `<div class="copy" style="left:400px;width:660px"><h1 style="font-size:100px">Tic-tac-toe,<br>in <em>3D</em></h1><p style="font-size:38px;margin-top:24px">Rotate a glass cube.<br>Win through depth.</p></div>
    <svg viewBox="0 0 1920 823" width="1920" height="823" style="position:absolute;left:0;top:0">${defs}${g}</svg>`;
  return base(1920, 823, body);
}

// ---- Search Results: 1920x1280 canvas rendered at 2x = 3840x2560 (3:2)
function search() {
  const body = `<div class="copy" style="width:700px"><h1 style="font-size:138px">Tic-tac-toe,<br>in <em>3D</em></h1><p>Rotate a glass cube. Win through depth.</p></div>
    <div class="phone" style="left:1020px;top:150px;width:470px;transform:rotate(-5deg)"><img src="../raw/phone/b3.png"></div>
    <div class="phone" style="left:1390px;top:215px;width:470px;transform:rotate(4deg)"><img src="../raw/phone/b5.png"></div>`;
  return base(1920, 1280, body);
}

const jobs = [
  { name: 'header-3840x1646', html: header(), w: 1920, h: 823 },
  { name: 'search-3840x2560', html: search(), w: 1920, h: 1280 },
];
mkdirSync(join(here, 'html'), { recursive: true });
mkdirSync(join(here, 'out'), { recursive: true });
for (const j of jobs) {
  const html = join(here, 'html', `${j.name}.html`), png = join(here, 'out', `${j.name}.png`);
  writeFileSync(html, j.html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
    `--window-size=${j.w},${j.h}`, `--screenshot=${png}`, `file://${html}`], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '95', png, '--out', png.replace('.png', '.jpg')], { stdio: 'ignore' });
  execFileSync('rm', [png]);
  console.log(`${j.name}.jpg`);
}
