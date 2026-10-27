// Renders the App Store marketing slides.
//
//   node build.mjs            -> out/iphone/*.jpg (1320x2868) and out/ipad/*.jpg (2064x2752)
//
// Each slide is an HTML page designed on a 1320px-wide canvas. The iPhone canvas is
// 1320x2868; the iPad canvas is 1320x1760 rendered at 1.5636x, giving 2064x2752. Pages
// are drawn by headless Chrome and flattened to JPEG (the App Store rejects alpha).
// Real gameplay comes from raw/ (simulator captures; see the README for the launch flags).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DEVICES = {
  iphone: { raw: 'phone', width: 1320, height: 2868, scale: 1, outW: 1320, outH: 2868 },
  ipad: { raw: 'pad', width: 1320, height: 1760, scale: 2064 / 1320, outW: 2064, outH: 2752 },
};

const C = { red: '#ff4655', teal: '#3be8e0', orange: '#ff6333', cream: '#f2ede6', muted: '#8a93a6' };

// ---------------------------------------------------------------- shared pieces

const css = (d) => `
*{box-sizing:border-box;margin:0}
html,body{width:1320px;height:${d.height}px;overflow:hidden}
body{position:relative;font-family:"SF Pro Rounded",system-ui,sans-serif;color:${C.cream};
  background:
   radial-gradient(1000px 800px at 10% 6%,rgba(255,99,51,.22),transparent 62%),
   radial-gradient(1000px 900px at 98% 92%,rgba(59,232,224,.15),transparent 62%),
   linear-gradient(180deg,#172131 0%,#0a0e15 100%)}
.head{position:absolute;left:0;right:0;top:${d.raw === 'pad' ? 90 : 150}px;padding:0 90px;text-align:center}
h1{font-weight:900;font-size:${d.raw === 'pad' ? 108 : 132}px;line-height:1.02;letter-spacing:-.01em}
h1 em{font-style:normal;color:var(--accent,${C.orange});text-shadow:0 0 60px color-mix(in srgb,var(--accent,${C.orange}) 55%,transparent)}
.sub{margin-top:${d.raw === 'pad' ? 26 : 38}px;font-size:${d.raw === 'pad' ? 44 : 52}px;font-weight:600;color:${C.muted};line-height:1.25}
.tag{display:inline-block;margin-top:${d.raw === 'pad' ? 22 : 30}px;padding:11px 26px;border-radius:99px;font-size:34px;font-weight:700;
  color:${C.teal};background:rgba(59,232,224,.10);border:2px solid rgba(59,232,224,.35)}
.phone{position:absolute;left:130px;width:1060px;border-radius:${d.raw === 'pad' ? 78 : 150}px;padding:20px;
  background:linear-gradient(160deg,#4d5466,#1d222d 38%,#0e1118);
  box-shadow:0 0 0 3px #07090d,0 90px 170px rgba(0,0,0,.65),0 0 220px color-mix(in srgb,var(--accent,${C.orange}) 22%,transparent)}
.phone img{display:block;width:100%;border-radius:${d.raw === 'pad' ? 60 : 132}px}
.glass{background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:2px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 30px 80px rgba(0,0,0,.35);border-radius:56px}
.content{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center}
svg{display:block;overflow:visible}
`;

const head = (h1, sub, tag) =>
  `<div class="head"><h1>${h1}</h1><p class="sub">${sub}</p>${tag ? '<div class="tag">Optional in-app purchase</div>' : ''}</div>`;

const page = (d, accent, body) => `<!doctype html><html><head><meta charset="utf-8"><style>:root{--accent:${accent}}${css(d)}</style></head><body>${body}</body></html>`;

// ---------------------------------------------------------------- isometric helpers

const A = Math.PI / 6;
const iso = (s, cx, cy) => (x, y, z) => [cx + (x - y) * Math.cos(A) * s, cy + (x + y) * Math.sin(A) * s - z * s];
const pts = (list) => list.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

function plate(P, n, z, { fill = 'rgba(255,255,255,.05)', stroke = 'rgba(255,255,255,.6)', cell = 'rgba(255,255,255,.10)', cellStroke = 'none' } = {}) {
  let out = `<polygon points="${pts([P(0, 0, z), P(n, 0, z), P(n, n, z), P(0, n, z)])}" fill="${fill}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>`;
  const g = 0.09;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      out += `<polygon points="${pts([P(i + g, j + g, z), P(i + 1 - g, j + g, z), P(i + 1 - g, j + 1 - g, z), P(i + g, j + 1 - g, z)])}" fill="${cell}" stroke="${cellStroke}" stroke-linejoin="round"/>`;
  return out;
}
// Marks face the viewer (like the app's pieces) instead of lying flat on the plate.
const markX = (P, i, j, z, w = 13, r = 26) => {
  const [x, y] = P(i + 0.5, j + 0.5, z);
  return `<g stroke="${C.red}" stroke-width="${w}" stroke-linecap="round" filter="url(#glowR)"><line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}"/><line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}"/></g>`;
};
const markO = (P, i, j, z, w = 12, r = 26) => {
  const [x, y] = P(i + 0.5, j + 0.5, z);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${C.teal}" stroke-width="${w}" filter="url(#glowT)"/>`;
};
const defs = `<defs>
 <filter id="glowR" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="glowT" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <filter id="glowO" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

// ---------------------------------------------------------------- slide builders

const slides = [];

// Slides with the real game in a phone/tablet frame.
function deviceSlide(name, accent, h1, sub, shot, tag) {
  slides.push((d) => page(d, accent, `${head(h1, sub, tag)}<div class="phone" style="top:${d.raw === 'pad' ? 640 : (tag ? 800 : 720)}px"><img src="../raw/${d.raw}/${shot}.png"></div>`));
  names.push(name);
}
const names = [];

deviceSlide('1-hero', C.orange, 'Tic-tac-toe,<br>in <em>3D</em>', 'Rotate a glass cube. Win through depth.', 'b3');
deviceSlide('2-bigger', C.teal, 'Go bigger,<br>up to <em>8×8×8</em>', 'Cubes from 1×1 to 8×8×8, plus flat boards.', 'b5', true);
deviceSlide('3-online', C.teal, 'Challenge a<br>friend <em>online</em>', 'Share a room code or link and play in seconds.', 'room');

// 4: two ways to win (isometric diagrams)
names.push('4-ways');
slides.push((d) => {
  const wide = d.raw === 'pad';
  const s = 118, n = 3;
  const stack = (() => {
    const P = iso(s, 400, 330);
    let g = '';
    for (const z of [0, 1.35, 2.7]) g += plate(P, n, z);
    const top = P(1.5, 1.5, 2.7 + 0.0), bottom = P(1.5, 1.5, 0);
    g += `<line x1="${bottom[0]}" y1="${bottom[1]}" x2="${top[0]}" y2="${top[1]}" stroke="${C.orange}" stroke-width="10" stroke-linecap="round" filter="url(#glowO)" opacity=".95"/>`;
    for (const z of [0, 1.35, 2.7]) g += markX(P, 1, 1, z, 15);
    g += markO(P, 0, 2, 1.35) + markO(P, 2, 0, 2.7) + markO(P, 2, 1, 0) + markO(P, 0, 1, 0);
    return `<svg viewBox="0 0 800 720" style="margin:0 auto" width="${wide ? 560 : 960}">${defs}${g}</svg>`;
  })();
  const layer = (() => {
    const P = iso(s, 400, 40);
    let g = plate(P, n, 0, { fill: 'rgba(255,70,85,.14)', stroke: C.red, cell: 'rgba(255,255,255,.10)' });
    for (let i = 0; i < 3; i++) g += markX(P, i, 0, 0, 15);
    g += markO(P, 1, 1, 0) + markO(P, 2, 2, 0) + markX(P, 0, 2, 0);
    const a = P(0.1, 0.5, 0), b = P(2.9, 0.5, 0);
    g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.orange}" stroke-width="10" stroke-linecap="round" filter="url(#glowO)"/>`;
    return `<svg viewBox="0 0 800 430" style="margin:30px auto 0" width="${wide ? 560 : 960}">${defs}${g}</svg>`;
  })();
  const card = (title, text, svg) => `<div class="glass" style="padding:40px 30px 44px;text-align:center;width:${wide ? 620 : 1080}px;display:flex;flex-direction:column;justify-content:center">${svg}<div style="font-size:56px;font-weight:900;margin-top:6px">${title}</div><div style="font-size:38px;font-weight:600;color:${C.muted};margin-top:10px">${text}</div></div>`;
  return page(d, C.orange, `${head('Two ways<br>to <em>win</em>', 'Strike through the stack, or claim two of three layers.')}
   <div class="content" style="top:${wide ? 590 : 780}px;flex-direction:${wide ? 'row' : 'column'};gap:40px;justify-content:center;align-items:${wide ? 'stretch' : 'center'}">
     ${card('Strike through depth', 'Three in a line straight down the cube wins on the spot.', stack)}
     ${card('Claim a layer', 'Complete a row on a layer to lock it. Take most layers to win.', layer)}
   </div>`);
});

deviceSlide('5-ranks', C.red, 'Win. Earn rank.<br><em>Climb.</em>', 'Ranked online matches feed a live leaderboard.', 'win');

// 6: every size
names.push('6-sizes');
slides.push((d) => {
  const wide = d.raw === 'pad';
  const c = 30, g = 6, gap = 22;
  let x = 0, svg = '';
  const widths = [];
  for (let n = 1; n <= 8; n++) widths.push(n * c + (n - 1) * g);
  const total = widths.reduce((a, b) => a + b, 0) + gap * 7;
  const base = widths[7] + 60;
  for (let n = 1; n <= 8; n++) {
    const w = widths[n - 1], free = n === 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const on = i === j;
      const fill = on ? (free ? C.teal : C.orange) : 'rgba(255,255,255,.12)';
      svg += `<rect x="${x + i * (c + g)}" y="${base - w + j * (c + g)}" width="${c}" height="${c}" rx="6" fill="${fill}" ${on ? `filter="url(#glowO)"` : ''}/>`;
    }
    if ([1, 3, 5, 8].includes(n)) svg += `<text x="${x + w / 2}" y="${base + 52}" text-anchor="middle" font-size="34" font-weight="800" fill="${free ? C.teal : C.muted}" font-family="SF Pro Rounded">${n}×${n}${free ? ' · free' : ''}</text>`;
    x += w + gap;
  }
  const stairs = `<svg viewBox="-10 -10 ${total + 20} ${base + 80}" width="${wide ? 920 : 1180}">${defs}${svg}</svg>`;
  // a small cube and a flat board
  const P = iso(70, 270, 190);
  let cube = ''; for (const z of [0, 0.9, 1.8, 2.7]) cube += plate(P, 4, z - 0.0, { cell: 'rgba(255,255,255,.08)' });
  cube += markX(P, 1, 1, 0.9, 9, 14) + markO(P, 2, 2, 1.8, 8, 13) + markX(P, 2, 1, 2.7, 9, 14) + markO(P, 0, 3, 0, 8, 13);
  const flat = (() => {
    let o = `<rect x="40" y="10" width="480" height="480" rx="34" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.6)" stroke-width="7"/>`;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) o += `<rect x="${64 + i * 90}" y="${34 + j * 90}" width="76" height="76" rx="16" fill="rgba(255,255,255,.10)"/>`;
    const X = (i, j) => { const x1 = 64 + i * 90 + 18, y1 = 34 + j * 90 + 18, e = 40; return `<g stroke="${C.red}" stroke-width="13" stroke-linecap="round" filter="url(#glowR)"><line x1="${x1}" y1="${y1}" x2="${x1 + e}" y2="${y1 + e}"/><line x1="${x1 + e}" y1="${y1}" x2="${x1}" y2="${y1 + e}"/></g>`; };
    const O = (i, j) => `<circle cx="${64 + i * 90 + 38}" cy="${34 + j * 90 + 38}" r="23" fill="none" stroke="${C.teal}" stroke-width="12" filter="url(#glowT)"/>`;
    return `<svg viewBox="0 0 560 500" style="margin:0 auto" width="${wide ? 290 : 480}">${defs}${o}${X(0, 0)}${X(1, 1)}${X(2, 2)}${O(3, 1)}${O(1, 3)}${O(4, 4)}${X(3, 3)}</svg>`;
  })();
  const panel = (title, text, inner) => `<div class="glass" style="padding:${wide ? 24 : 50}px 24px ${wide ? 28 : 56}px;text-align:center;width:${wide ? 520 : 560}px">${inner}<div style="font-size:50px;font-weight:900;margin-top:12px">${title}</div><div style="font-size:34px;font-weight:600;color:${C.muted};margin-top:8px">${text}</div></div>`;
  return page(d, C.teal, `${head('Every size,<br>every <em>style</em>', 'Classic 3×3×3 is free. Larger boards unlock with one purchase.', true)}
   <div class="content" style="top:${wide ? 620 : 860}px;gap:${wide ? 34 : 84}px">
     ${stairs}
     <div style="display:flex;gap:40px">${panel('3D cubes', 'Up to 8 layers deep', `<svg viewBox="0 0 540 520" style="margin:0 auto" width="${wide ? 300 : 500}">${defs}${cube}</svg>`)}${panel('Flat boards', 'Classic 2D grids', flat)}</div>
     <div class="glass" style="display:flex;align-items:center;gap:40px;padding:34px 50px 34px 34px;width:${wide ? 1080 : 1160}px;border-radius:999px">
       <img src="../../iap-larger-boards-1024.png" width="${wide ? 150 : 200}" style="border-radius:${wide ? 34 : 46}px;box-shadow:0 20px 50px rgba(0,0,0,.45)">
       <div><div style="font-size:${wide ? 48 : 60}px;font-weight:900">Larger Boards</div><div style="font-size:${wide ? 30 : 38}px;font-weight:600;color:${C.muted};margin-top:6px;line-height:1.25">One-time in-app purchase.<br>No subscription.</div></div>
     </div>
   </div>`);
});

// 7: haptics + sound
names.push('7-feel');
slides.push((d) => {
  const wide = d.raw === 'pad';
  // The real haptic patterns from ArcadeHaptics.swift: [time(s), intensity, sharpness] ticks and humming bodies.
  const patterns = [
    { name: 'Select', note: 'A light, crisp tick', color: C.teal, ticks: [[0, .45, .9]], hum: null },
    { name: 'Place', note: 'A firm, weighty thump', color: C.red, ticks: [[0, .9, .35]], hum: [0, .05, .5] },
    { name: 'Win', note: 'A rising run with a shimmering tail', color: C.orange,
      ticks: [[0, .5, .5], [.12, .65, .65], [.24, .8, .8], [.36, 1, .95], [.5, .45, 1], [.62, .38, 1], [.75, .3, 1], [.9, .22, 1]], hum: [.36, .7, .9, 'fade'] },
    { name: 'Lose', note: 'A heavy thud that sinks away', color: '#8d7bff', ticks: [[0, 1, .1], [.38, .5, .1]], hum: [0, .9, .85, 'fade'] },
  ];
  const card = (p) => {
    const W = 560, H = wide ? 240 : 260, T = 1.05;
    let o = '';
    if (p.hum) { const [t0, dur, lvl, fade] = p.hum, x0 = (t0 / T) * W, w = (dur / T) * W, h = lvl * H * .5;
      o += `<polygon points="${x0},${H} ${x0},${H - h} ${x0 + w},${H - (fade ? 4 : h)} ${x0 + w},${H}" fill="${p.color}" opacity=".28"/>`; }
    for (const [t, i, sh] of p.ticks) { const x = (t / T) * W + 6, h = i * H * .96, wd = 8 + sh * 6;
      o += `<rect x="${x - wd / 2}" y="${H - h}" width="${wd}" height="${h}" rx="${wd / 2}" fill="${p.color}" filter="url(#glowO)"/>`; }
    return `<div class="glass" style="padding:34px 36px;display:flex;align-items:center;justify-content:space-between;gap:24px;width:${wide ? 620 : 1100}px;height:${wide ? 430 : 410}px">
      <div style="width:${wide ? 240 : 340}px"><div style="font-size:${wide ? 64 : 76}px;font-weight:900;color:${p.color}">${p.name}</div><div style="font-size:${wide ? 34 : 40}px;font-weight:600;color:${C.muted};margin-top:8px;line-height:1.2">${p.note}</div></div>
      <svg viewBox="0 0 ${W + 12} ${H}" width="${wide ? 290 : 600}">${defs}${o}</svg></div>`;
  };
  return page(d, C.teal, `${head('Hear it.<br><em>Feel</em> it.', 'Every move has its own sound and its own haptic touch.')}
   <div class="content" style="top:${wide ? 590 : 780}px;display:grid;grid-template-columns:${wide ? '1fr 1fr' : '1fr'};gap:${wide ? 36 : 48}px;justify-items:center;left:${wide ? 30 : 0}px;right:${wide ? 30 : 0}px">${patterns.map(card).join('')}</div>`);
});

// 8: play your way
names.push('8-modes');
slides.push((d) => {
  const wide = d.raw === 'pad';
  const icon = {
    cpu: '<rect x="16" y="16" width="32" height="32" rx="7" fill="none" stroke="#fff" stroke-width="5"/><rect x="25" y="25" width="14" height="14" rx="3" fill="#fff"/><path d="M24 6v8M40 6v8M24 50v8M40 50v8M6 24h8M6 40h8M50 24h8M50 40h8" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
    people: '<circle cx="24" cy="22" r="10" fill="#fff"/><circle cx="46" cy="26" r="8" fill="#fff" opacity=".8"/><path d="M6 54c0-11 8-18 18-18s18 7 18 18z" fill="#fff"/><path d="M44 54c0-7-2-12-6-15 3-2 6-3 9-3 8 0 14 6 14 18z" fill="#fff" opacity=".8"/>',
    globe: '<circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-width="5"/><ellipse cx="32" cy="32" rx="10" ry="24" fill="none" stroke="#fff" stroke-width="5"/><path d="M8 32h48M12 20h40M12 44h40" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
    trophy: '<path d="M20 8h24v18a12 12 0 0 1-24 0z" fill="#fff"/><path d="M20 14H8c0 10 4 16 12 18M44 14h12c0 10-4 16-12 18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M32 38v10M20 56h24M24 48h16" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
  };
  const row = (ic, title, text, bg, border) => `<div style="display:flex;align-items:center;gap:48px;padding:0 70px;width:${wide ? 940 : 1120}px;height:${wide ? 200 : 360}px;border-radius:999px;background:${bg};border:2px solid ${border};box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 30px 70px rgba(0,0,0,.35)">
      <svg viewBox="0 0 64 64" width="${wide ? 84 : 140}" height="${wide ? 84 : 140}">${icon[ic]}</svg>
      <div><div style="font-size:${wide ? 56 : 88}px;font-weight:900">${title}</div><div style="font-size:${wide ? 32 : 44}px;font-weight:600;color:rgba(255,255,255,.72);margin-top:4px">${text}</div></div></div>`;
  return page(d, C.red, `${head('Play it<br>your <em>way</em>', 'Solo, side by side, or across the world.')}
   <div class="content" style="top:${wide ? 590 : 800}px;gap:${wide ? 26 : 50}px">
     ${row('cpu', 'Play vs AI', 'A search-based opponent that finds forks', 'linear-gradient(180deg,#ff5a68,#e23a4a)', 'rgba(255,255,255,.25)')}
     ${row('people', '2 Player', 'Pass and play on one device', 'linear-gradient(180deg,rgba(59,232,224,.55),rgba(36,160,155,.55))', 'rgba(59,232,224,.5)')}
     ${row('globe', 'Play online', 'Rooms, invite links and live matches', 'linear-gradient(180deg,rgba(59,232,224,.55),rgba(36,160,155,.55))', 'rgba(59,232,224,.5)')}
     ${row('trophy', 'Leaderboard', 'Rank points for every online win', 'linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.07))', 'rgba(255,255,255,.18)')}
   </div>`);
});

// ---------------------------------------------------------------- render

const only = process.argv[2];
for (const [device, d] of Object.entries(DEVICES)) {
  const dir = join(here, 'out', device);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(here, 'html'), { recursive: true });
  slides.forEach((build, i) => {
    const name = names[i];
    if (only && !name.startsWith(only)) return;
    const html = join(here, 'html', `${device}-${name}.html`);
    const png = join(dir, `${name}.png`);
    writeFileSync(html, build({ ...d, raw: d.raw }));
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${d.scale}`,
      `--window-size=${d.width},${d.height}`, `--screenshot=${png}`, `file://${html}`], { stdio: 'ignore' });
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '95', png, '--out', png.replace('.png', '.jpg')], { stdio: 'ignore' });
    execFileSync('rm', [png]);
    console.log(`${device}/${name}.jpg`);
  });
}
