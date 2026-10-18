// Builds a child-friendly EU map: interactive HTML, static SVG and PNG.
const fs = require('fs');
const topo = require('topojson-client');
const world = require('world-atlas/countries-50m.json');
const { geoConicConformal, geoPath } = require('d3-geo');
const { Resvg } = require('@resvg/resvg-js');

const W = 1100, TOP = 70, MAP_H = 860, H = TOP + MAP_H;
const FONT = 'Trebuchet MS, Verdana, DejaVu Sans, Arial, sans-serif';

const PHASES = [
  { id: 0, year: 1957, title: 'The Founders', color: '#ff6b57', fact: 'Six countries signed the Treaty of Rome in 1957 and started working together.' },
  { id: 1, year: 1973, title: 'First Big Join', color: '#ffb703', fact: 'Denmark, Ireland and the United Kingdom joined. The UK left in 2020.' },
  { id: 2, year: 1981, title: 'Greece Says Hello', color: '#8ac926', fact: 'Greece became the 10th member.' },
  { id: 3, year: 1986, title: 'Sunny Newcomers', color: '#2ec4b6', fact: 'Spain and Portugal joined, bringing the total to 12.' },
  { id: 4, year: 1995, title: 'Northern Lights', color: '#7b68ee', fact: 'Austria, Finland and Sweden joined, making 15 members.' },
  { id: 5, year: 2004, title: 'The Big Party', color: '#ff70a6', fact: 'The biggest expansion ever: 10 countries joined at once, reaching 25.' },
  { id: 6, year: 2007, title: 'Black Sea Friends', color: '#f4a261', fact: 'Bulgaria and Romania joined, making 27 members.' },
  { id: 7, year: 2013, title: 'Adriatic Arrival', color: '#00b4d8', fact: 'Croatia became the 28th member. The UK left in 2020, so there are 27 today.' },
];

// src = name in the world-atlas data; cl = capital [lon, lat]; at = label position [lon, lat]
const MEMBERS = [
  { src: 'Belgium', name: 'BELGIUM', cap: 'Brussels', cl: [4.35, 50.85], at: [2.6, 52.6], year: 1957, phase: 0 },
  { src: 'France', name: 'FRANCE', cap: 'Paris', cl: [2.35, 48.86], at: [2.2, 45.8], year: 1957, phase: 0 },
  { src: 'Germany', name: 'GERMANY', cap: 'Berlin', cl: [13.4, 52.52], at: [12.6, 51.2], year: 1957, phase: 0 },
  { src: 'Italy', name: 'ITALY', cap: 'Rome', cl: [12.5, 41.9], at: [12.4, 42.6], year: 1957, phase: 0 },
  { src: 'Luxembourg', name: 'LUXEMBOURG', cap: 'Luxembourg City', cl: [6.13, 49.61], at: [6.6, 49.2], year: 1957, phase: 0 },
  { src: 'Netherlands', name: 'NETHERLANDS', cap: 'Amsterdam', cl: [4.9, 52.37], at: [5.8, 54.6], year: 1957, phase: 0 },
  { src: 'Denmark', name: 'DENMARK', cap: 'Copenhagen', cl: [12.57, 55.68], at: [9.6, 57.6], year: 1973, phase: 1 },
  { src: 'Ireland', name: 'IRELAND', cap: 'Dublin', cl: [-6.26, 53.35], at: [-13.8, 53.8], year: 1973, phase: 1 },
  { src: 'United Kingdom', name: 'UNITED KINGDOM', cap: 'London', cl: [-0.13, 51.51], at: [-2.5, 58.2], year: 1973, phase: 1, left: true },
  { src: 'Greece', name: 'GREECE', cap: 'Athens', cl: [23.73, 37.98], at: [21.6, 36.8], year: 1981, phase: 2 },
  { src: 'Spain', name: 'SPAIN', cap: 'Madrid', cl: [-3.7, 40.42], at: [-3.6, 40.4], year: 1986, phase: 3 },
  { src: 'Portugal', name: 'PORTUGAL', cap: 'Lisbon', cl: [-9.14, 38.72], at: [-11.2, 39.8], year: 1986, phase: 3 },
  { src: 'Austria', name: 'AUSTRIA', cap: 'Vienna', cl: [16.37, 48.21], at: [13.6, 47.6], year: 1995, phase: 4 },
  { src: 'Finland', name: 'FINLAND', cap: 'Helsinki', cl: [24.94, 60.17], at: [25.5, 63.8], year: 1995, phase: 4 },
  { src: 'Sweden', name: 'SWEDEN', cap: 'Stockholm', cl: [18.07, 59.33], at: [15.2, 61.8], year: 1995, phase: 4 },
  { src: 'Cyprus', name: 'CYPRUS', cap: 'Nicosia', cl: [33.38, 35.17], at: [32.6, 33.9], year: 2004, phase: 5 },
  { src: 'Czechia', name: 'CZECHIA', cap: 'Prague', cl: [14.42, 50.08], at: [16.8, 50.0], year: 2004, phase: 5 },
  { src: 'Estonia', name: 'ESTONIA', cap: 'Tallinn', cl: [24.75, 59.44], at: [23.2, 59.8], year: 2004, phase: 5 },
  { src: 'Hungary', name: 'HUNGARY', cap: 'Budapest', cl: [19.04, 47.5], at: [19.6, 46.6], year: 2004, phase: 5 },
  { src: 'Latvia', name: 'LATVIA', cap: 'Riga', cl: [24.11, 56.95], at: [26.8, 57.0], year: 2004, phase: 5 },
  { src: 'Lithuania', name: 'LITHUANIA', cap: 'Vilnius', cl: [25.28, 54.69], at: [22.4, 54.4], year: 2004, phase: 5 },
  { src: 'Malta', name: 'MALTA', cap: 'Valletta', cl: [14.51, 35.9], at: [11.8, 35.6], year: 2004, phase: 5 },
  { src: 'Poland', name: 'POLAND', cap: 'Warsaw', cl: [21.01, 52.23], at: [19.6, 52.4], year: 2004, phase: 5 },
  { src: 'Slovakia', name: 'SLOVAKIA', cap: 'Bratislava', cl: [17.11, 48.15], at: [20.6, 48.6], year: 2004, phase: 5 },
  { src: 'Slovenia', name: 'SLOVENIA', cap: 'Ljubljana', cl: [14.51, 46.06], at: [14.2, 44.1], year: 2004, phase: 5 },
  { src: 'Bulgaria', name: 'BULGARIA', cap: 'Sofia', cl: [23.32, 42.7], at: [27.6, 42.8], year: 2007, phase: 6 },
  { src: 'Romania', name: 'ROMANIA', cap: 'Bucharest', cl: [26.1, 44.43], at: [26.2, 46.0], year: 2007, phase: 6 },
  { src: 'Croatia', name: 'CROATIA', cap: 'Zagreb', cl: [15.98, 45.81], at: [17.8, 43.6], year: 2013, phase: 7 },
];

// Label positions [lon, lat] placed in clear sea/border areas, in two stacks (west and east) plus a few nearby
const ANCHOR_OVERRIDE = {
  'United Kingdom': [-14.5, 61.5], 'Ireland': [-14.5, 57.5], 'Netherlands': [-14.5, 53.5],
  'Belgium': [-14.5, 49.5], 'France': [-14.5, 45.5], 'Spain': [-14.5, 41.5], 'Portugal': [-14.5, 37.5],
  'Finland': [44, 66], 'Sweden': [44, 61.5], 'Estonia': [44, 57.5], 'Latvia': [44, 53.5],
  'Lithuania': [44, 49.5], 'Poland': [44, 45.5], 'Czechia': [44, 41.5], 'Slovakia': [44, 37.5], 'Hungary': [44, 33.5],
  'Luxembourg': [-14.5, 33.5], 'Germany': [10.5, 51.3], 'Austria': [13.4, 47.6], 'Denmark': [9.5, 56.4],
  'Italy': [12.3, 42.2], 'Slovenia': [14.8, 44.6], 'Croatia': [19.5, 41.6],
  'Greece': [23.5, 34.2], 'Malta': [4.5, 34.2], 'Cyprus': [33, 34.2],
  'Bulgaria': [27.6, 42.6], 'Romania': [25.4, 47.5],
};

// Projection: conic conformal centred on Europe (accurate shapes and areas)
const proj = geoConicConformal().parallels([35, 65]).rotate([-12, 0]);
proj.fitExtent([[12, 12], [W - 12, MAP_H - 12]], {
  type: 'MultiPoint', coordinates: [[-20, 30], [52, 30], [52, 72], [-20, 72]],
});
console.log('check Paris ->', proj([2.35, 48.86]), 'Zagreb ->', proj([15.98, 45.81]), 'scale', proj.scale());
const path = geoPath(proj);

const countries = topo.feature(world, world.objects.countries).features;
const EU = new Set(MEMBERS.map(m => m.src));
let bgPaths = '', euPaths = '';
for (const f of countries) {
  const name = f.properties.name;
  const d = path(f);
  if (!d) continue;
  if (EU.has(name)) {
    const m = MEMBERS.find(x => x.src === name);
    const color = PHASES[m.phase].color;
    const style = m.left ? 'fill-opacity="0.45" stroke-dasharray="5 3"' : '';
    euPaths += `<path class="eu" data-phase="${m.phase}" data-src="${name}" d="${d}" fill="${color}" ${style} stroke="#fff" stroke-width="1.2"/>`;
  } else {
    bgPaths += `<path d="${d}" fill="#ece7dc" stroke="#fff" stroke-width="0.6"/>`;
  }
}

let labels = '';
for (const m of MEMBERS) {
  const [dx, dy] = proj(m.cl);
  const [ax, ay] = proj(ANCHOR_OVERRIDE[m.src] || m.at);
  const yearLine = m.left ? `Joined: ${m.year} · Left: 2020` : `Joined: ${m.year}`;
  const w = Math.max(m.name.length * 8.4, m.cap.length * 6.6, yearLine.length * 6.0) + 18;
  const h = 46, x = ax - w / 2, y = ay - h / 2;
  const color = PHASES[m.phase].color;
  labels += `<g class="lab" data-phase="${m.phase}" data-src="${m.src}">
<line x1="${dx.toFixed(1)}" y1="${dy.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="#333" stroke-width="1.2"/>
<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4.5" fill="#fff" stroke="#222" stroke-width="1.6"/>
<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="12" fill="#fff" stroke="${color}" stroke-width="3"/>
<text x="${ax.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="800" fill="#1b1b3a">${m.name}</text>
<text x="${ax.toFixed(1)}" y="${(y + 31).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#333">${m.cap}</text>
<text x="${ax.toFixed(1)}" y="${(y + 42).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#555">${yearLine}</text>
</g>`;
}

// Legend (top-left of the map area)
let legendItems = '';
PHASES.forEach((p, i) => {
  legendItems += `<circle cx="18" cy="${24 + i * 22}" r="7" fill="${p.color}" stroke="#222" stroke-width="1"/>
<text x="32" y="${29 + i * 22}" font-family="${FONT}" font-size="13" fill="#1b1b3a">${p.year} · ${p.title}</text>`;
});
const legend = `<g transform="translate(14,14)">
<rect width="240" height="${PHASES.length * 22 + 14}" rx="12" fill="#fff" opacity="0.93" stroke="#ccc"/>
<g transform="translate(0,0)">${legendItems}</g></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<defs><clipPath id="mapclip"><rect width="${W}" height="${MAP_H}"/></clipPath></defs>
<rect y="${TOP}" width="${W}" height="${MAP_H}" fill="#bfe5f7"/>
<g transform="translate(0,${TOP})">
<g clip-path="url(#mapclip)">${bgPaths}${euPaths}</g>
${labels}
${legend.replace('translate(14,14)', `translate(14,${TOP + 0}) translate(14,14)`).replace(/translate\(14,\d+\) translate\(14,14\)/, `translate(14,14)`)}
</g>
<rect width="${W}" height="${TOP}" fill="#1f3c88"/>
<text x="24" y="42" font-family="${FONT}" font-size="28" font-weight="800" fill="#fff">The European Union: who joined, and when?</text>
<text x="24" y="62" font-family="${FONT}" font-size="14" fill="#dfe8ff">Each colour is one wave of new members. Map data: Natural Earth (via world-atlas).</text>
</svg>`;

// Interactive HTML: same map, plus buttons that light up each expansion group
const publicMembers = MEMBERS.map(m => ({ name: m.name, cap: m.cap, year: m.year, phase: m.phase, left: !!m.left }));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The European Union Family Map</title>
<style>
body{margin:0;font-family:"Trebuchet MS",Verdana,system-ui,sans-serif;background:#eef6fb;color:#1b1b3a}
header{padding:18px 20px 4px;text-align:center}
h1{margin:0;font-size:clamp(22px,4vw,34px);color:#1f3c88}
p.sub{margin:6px 0 0;color:#445}
.phases{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:12px}
.phase-btn{border:0;border-radius:999px;padding:9px 14px;font-weight:700;color:#1b1b3a;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.15);font-size:14px;font-family:inherit}
.phase-btn.all{background:#fff}
.phase-btn.active{outline:3px solid #1b1b3a;outline-offset:2px}
main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;max-width:1400px;margin:0 auto;padding:0 12px 24px}
@media(max-width:900px){main{grid-template-columns:1fr}}
.mapbox{background:#fff;border-radius:18px;padding:8px;box-shadow:0 4px 14px rgba(0,0,0,.1)}
.mapbox svg{width:100%;height:auto;display:block}
[data-phase]{transition:opacity .35s}
[data-phase].dim{opacity:.15}
.eu,.lab{cursor:pointer}
.panel{background:#fff;border-radius:18px;padding:16px;box-shadow:0 4px 14px rgba(0,0,0,.1);align-self:start}
.panel h2{margin:0 0 6px;font-size:20px}
.fact{background:#fff7e0;border-radius:12px;padding:10px;margin:8px 0 12px;font-size:15px}
.item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed #ddd}
.dot{width:14px;height:14px;border-radius:50%;flex:none;border:2px solid #222}
.item b{display:block}
.item small{color:#555}
footer{text-align:center;color:#556;font-size:13px;padding:0 12px 24px}
</style>
</head>
<body>
<header>
  <h1>🇪🇺 The European Union Family Map</h1>
  <p class="sub">Tap a button or a country to see who joined together. Each colour is one wave of new members!</p>
</header>
<nav class="phases" id="phases"></nav>
<main>
  <div class="mapbox">${svg}</div>
  <aside class="panel" id="panel"></aside>
</main>
<footer>Joined dates are the years each country became an EU member. The UK left the EU in 2020. Map data: Natural Earth (via world-atlas).</footer>
<script>
const PHASES = ${JSON.stringify(PHASES)};
const MEMBERS = ${JSON.stringify(publicMembers)};
const nav = document.getElementById('phases');
const panel = document.getElementById('panel');

function addButton(label, id, color) {
  const b = document.createElement('button');
  b.className = 'phase-btn' + (id === 'all' ? ' all' : '');
  b.dataset.phase = String(id);
  b.textContent = label;
  if (color) b.style.background = color;
  b.addEventListener('click', () => select(id));
  nav.appendChild(b);
}
addButton('Show everyone', 'all');
PHASES.forEach(p => addButton(p.year + ' · ' + p.title, p.id, p.color));

function item(m) {
  return '<div class="item"><span class="dot" style="background:' + PHASES[m.phase].color + '"></span>' +
    '<div><b>' + m.name + '</b><small>Capital: ' + m.cap + ' · Joined ' + m.year + (m.left ? ' · Left 2020' : '') + '</small></div></div>';
}

function render(id) {
  if (id === 'all') {
    const sorted = [...MEMBERS].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
    panel.innerHTML = '<h2>Everyone</h2>' +
      '<div class="fact">Eight waves of countries joined between 1957 and 2013. The EU has 27 members today.</div>' +
      sorted.map(item).join('');
  } else {
    const p = PHASES[id];
    const group = MEMBERS.filter(m => m.phase === id);
    panel.innerHTML = '<h2>' + p.year + ' · ' + p.title + '</h2>' +
      '<div class="fact">' + p.fact + '</div>' + group.map(item).join('');
  }
}

function select(id) {
  document.querySelectorAll('.eu, .lab').forEach(el => {
    const on = id === 'all' || Number(el.dataset.phase) === id;
    el.classList.toggle('dim', !on);
  });
  nav.querySelectorAll('.phase-btn').forEach(b => b.classList.toggle('active', b.dataset.phase === String(id)));
  render(id);
}

document.querySelectorAll('.eu, .lab').forEach(el => {
  el.addEventListener('click', () => select(Number(el.dataset.phase)));
});
select('all');
</script>
</body>
</html>
`;

// Static PNG for sharing
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 2200 },
  font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
}).render().asPng();

fs.writeFileSync('index.html', html);
fs.writeFileSync('eu-map.svg', svg);
fs.writeFileSync('eu-map.png', png);
console.log('Built index.html, eu-map.svg, eu-map.png');
