// Renders the Android store graphics with headless Chrome (macOS).
//
//   node build.mjs   ->  out/screenshot-*.png (1080x1920) and out/feature-1024x500.png
//
// The screenshots frame real captures from raw/ (gitignored). Capture them from a debug build
// on an emulator; the commands are in ../README.md under "Store graphics". The look follows the
// iOS slides in ios/AppStore/marketing.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = join(here, 'out');
const pages = join(out, 'html');
mkdirSync(pages, { recursive: true });

const C = { red: '#ff4655', teal: '#3be8e0', orange: '#ff6333', cream: '#f2ede6', muted: '#8a93a6' };

const base = (w, h) => `
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:"SF Pro Rounded",system-ui,sans-serif;color:${C.cream};
  background:
   radial-gradient(900px 700px at 10% 6%,rgba(255,99,51,.22),transparent 62%),
   radial-gradient(900px 800px at 98% 92%,rgba(59,232,224,.15),transparent 62%),
   linear-gradient(180deg,#172131 0%,#0a0e15 100%)}
em{font-style:normal;color:var(--accent,${C.orange});text-shadow:0 0 50px color-mix(in srgb,var(--accent,${C.orange}) 55%,transparent)}
`;

// ------------------------------------------------------------------ screenshots (1080x1920)

const slide = (n, accent, h1, sub, raw) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>:root{--accent:${accent}}${base(1080, 1920)}
.head{position:absolute;left:0;right:0;top:110px;padding:0 70px;text-align:center}
h1{font-weight:900;font-size:108px;line-height:1.02;letter-spacing:-.01em}
.sub{margin-top:30px;font-size:42px;font-weight:600;color:${C.muted};line-height:1.25}
.phone{position:absolute;left:120px;top:520px;width:840px;border-radius:96px;padding:16px;
  background:linear-gradient(160deg,#4d5466,#1d222d 38%,#0e1118);
  box-shadow:0 0 0 3px #07090d,0 80px 150px rgba(0,0,0,.65),0 0 200px color-mix(in srgb,${accent} 22%,transparent)}
.phone img{display:block;width:100%;border-radius:82px}
</style></head><body><div class="head"><h1>${h1}</h1><p class="sub">${sub}</p></div>
<div class="phone"><img src="../../raw/${raw}.png"></div></body></html>`;
  return [`screenshot-${n}`, html, 1080, 1920];
};

const slides = [
  slide('1-hero', C.orange, 'Tic-tac-toe,<br>in <em>3D</em>', 'Rotate a glass cube. Win through depth.', 'midgame'),
  slide('2-layers', C.red, 'Claim <em>layers</em>', 'Complete a line to lock a layer. Take 2 of 3 to win.', 'layer'),
  slide('3-depth', C.teal, 'Strike through <em>depth</em>', 'Three in a line down the stack wins on the spot.', 'winboard'),
  slide('4-play', C.orange, 'Play your <em>way</em>', 'Take on the AI, a friend, or ranked players online.', 'landing'),
];

// ------------------------------------------------------------------ feature graphic (1024x500)

const feature = [
  'feature-1024x500',
  `<!doctype html><html><head><meta charset="utf-8"><style>:root{--accent:${C.orange}}${base(1024, 500)}
.row{position:absolute;inset:0;display:flex;align-items:center;padding:0 64px;gap:48px}
.icon{width:132px;height:132px;border-radius:30px;box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 90px rgba(255,99,51,.3)}
.copy{flex:1}
h1{font-weight:900;font-size:76px;line-height:1;letter-spacing:.01em;margin-top:26px}
.tag{margin-top:16px;font-size:28px;font-weight:600;color:${C.muted};line-height:1.25}
.board{width:420px;height:420px;border-radius:36px;flex:none;background-color:#0a0e15;
  background:#0a0e15 url(../../raw/midgame.png) -57px -414px/535px auto no-repeat;
  box-shadow:0 0 0 2px rgba(255,255,255,.1),0 30px 80px rgba(0,0,0,.5)}
</style></head><body><div class="row"><div class="copy"><img class="icon" src="../../icon-512.png">
<h1>TWISTED <em>TAC</em></h1><p class="tag">Stack layers.<br>Strike through depth.<br>Win the cube.</p></div><div class="board"></div></div></body></html>`,
  1024, 500,
];

for (const [name, html, w, h] of [...slides, feature]) {
  const file = join(pages, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${join(out, name + '.png')}`, `file://${file}`,
  ], { stdio: 'ignore' });
  console.log('rendered', name);
}
