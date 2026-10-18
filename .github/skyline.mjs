import { mkdirSync, writeFileSync } from "node:fs";

const ACCENT = "#0560DE";
const BULB = "#cfe3ff";
const FONT = "-apple-system,Segoe UI,Helvetica,Arial,sans-serif";
const W = 880, H = 228, GROUND = 184, ROAD = 28, COL = 16, FLOOR = 5, LOBBY = 6;
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const LIT = [0, 0.35, 0.55, 0.8, 1];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const THEMES = {
  light: { back: "#eaeef2", building: "#d0d7de", shade: "#bfc8d1", cap: "#e1e6eb", glow: 0.07, window: "#f6f8fa", road: "#d8dee4", lane: "#ffffff", text: "#57606a", wheel: "#57606a", pole: "#8c959f", night: false },
  dark: { back: "#11161d", building: "#1a212b", shade: "#141a22", cap: "#252e3a", glow: 0.16, window: "#0f141a", road: "#161b22", lane: "#30363d", text: "#a2a9b1", wheel: "#0d1117", pole: "#56606c", night: true },
};

async function fetchCalendar(login, token) {
  const query = "query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount contributionLevel date weekday}}}}}}";
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login } }),
  });

  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));

  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ count: d.contributionCount, level: LEVELS[d.contributionLevel], date: d.date, weekday: d.weekday }))),
  };
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (n) => +n.toFixed(1);
const month = (date) => +date.slice(5, 7) - 1;

const bus = (t) => `<g class="bus"><g transform="translate(0 ${GROUND + 2}) scale(.85)" opacity=".75">
<g class="bob" style="animation-duration:1.1s;animation-delay:-.3s">
${t.night ? `<path d="M0 6 -40 0 -40 13Z" fill="url(#beamL)"/>` : ""}
<rect width="38" height="11" rx="2" fill="${ACCENT}"/>
${[5, 11, 17, 23, 29].map((x) => `<rect x="${x}" y="2" width="4" height="4" fill="${BULB}" opacity=".85"/>`).join("")}
<rect y="7" width="2" height="2" fill="${t.night ? BULB : t.window}"/>
</g>
<circle cx="8" cy="11.5" r="2.4" fill="${t.wheel}"/><circle cx="30" cy="11.5" r="2.4" fill="${t.wheel}"/>
</g></g>`;

const car = (t) => `<g class="car"><g transform="translate(0 ${GROUND + 12})">
<g class="bob">
${t.night ? `<path d="M27 8 72 1 72 16Z" fill="url(#beam)"/>` : ""}
<rect x="6" y="1" width="13" height="7" rx="2" fill="${ACCENT}"/>
<rect x="8" y="2.5" width="4" height="4" fill="${t.window}"/><rect x="13" y="2.5" width="4" height="4" fill="${t.window}"/>
<rect y="6" width="27" height="6" rx="1.5" fill="${ACCENT}"/>
<rect x="25" y="7" width="2" height="2" fill="${t.night ? BULB : t.window}"/>
<rect y="7.5" width="1.5" height="2" fill="#8ab8ff"/>
</g>
<circle cx="6" cy="12.5" r="2.6" fill="${t.wheel}"/><circle cx="20" cy="12.5" r="2.6" fill="${t.wheel}"/>
</g></g>`;

const plane = `<g class="plane"><circle cx="0" cy="24" r=".9" fill="#d6e2f0"/><circle class="b" cx="4" cy="24" r="1.2" fill="${ACCENT}"/></g>`;

const clouds = (t) => [[22, 0, 0.8], [34, -40, 0.6], [26, -75, 0.9]].map(([y, delay, k]) =>
  `<g class="cloud" style="animation-delay:${delay}s"><g transform="translate(0 ${y}) scale(${k})" fill="${t.cap}"><ellipse cx="20" cy="8" rx="20" ry="6"/><ellipse cx="14" cy="4" rx="9" ry="6"/><ellipse cx="26" cy="3" rx="8" ry="6"/></g></g>`).join("\n");

function lamp(x, t) {
  const top = GROUND - 22;
  return `${t.night ? `<path d="M${x + 5} ${top + 2}L${x - 5} ${GROUND + ROAD}H${x + 15}Z" fill="url(#cone)"/>` : ""}
<path d="M${x} ${GROUND}V${top}H${x + 5}" stroke="${t.pole}" stroke-width="1.2" fill="none"/>
<rect x="${x + 3}" y="${top}" width="5" height="2" rx="1" fill="${t.night ? BULB : t.pole}"/>`;
}

function crane(x, base, t) {
  const top = base - 34, hookX = x - 14;

  const mast = `<g stroke="${ACCENT}" stroke-width="1.5" fill="none">
<line x1="${x + 10}" y1="${base}" x2="${x + 10}" y2="${top}"/>
<line x1="${x - 26}" y1="${top + 3}" x2="${x + 20}" y2="${top + 3}"/>
<line x1="${x + 10}" y1="${top - 4}" x2="${x - 26}" y2="${top + 3}" stroke-width=".8"/>
<line x1="${x + 10}" y1="${top - 4}" x2="${x + 20}" y2="${top + 3}" stroke-width=".8"/>
</g>
<rect x="${x + 15}" y="${top + 3}" width="5" height="5" fill="${ACCENT}"/>`;

  return `${mast}
<g class="hook" style="transform-origin:${hookX}px ${top + 3}px">
<line x1="${hookX}" y1="${top + 3}" x2="${hookX}" y2="${top + 20}" stroke="${t.text}" stroke-width=".8"/>
<rect x="${hookX - 3}" y="${top + 20}" width="6" height="4" fill="${ACCENT}"/>
</g>
<circle class="b" cx="${x + 10}" cy="${top - 5}" r="1.6" fill="${ACCENT}"/>`;
}

function scaffold(x, from, to, t) {
  const lines = [`<line x1="${x + 1}" y1="${to}" x2="${x + 1}" y2="${from}"/>`, `<line x1="${x + 13}" y1="${to}" x2="${x + 13}" y2="${from}"/>`];
  for (let y = from; y > to; y -= 10) lines.push(`<line x1="${x + 1}" y1="${y - 10}" x2="${x + 13}" y2="${y - 10}"/>`, `<line x1="${x + 1}" y1="${y}" x2="${x + 13}" y2="${y - 10}"/>`);
  return `<g stroke="${t.text}" stroke-width=".6" opacity=".45">${lines.join("")}</g>`;
}

function roof(x, top, floors, best, rand, t) {
  const r = rand();
  if (best) return `<path d="M${x + 3} ${top}L${x + 7} ${top - 18}L${x + 11} ${top}Z" fill="${t.building}"/><circle class="b" cx="${x + 7}" cy="${top - 19}" r="1.6" fill="${ACCENT}"/>`;
  if (floors >= 18 && r < 0.5) return `<line x1="${x + 7}" y1="${top}" x2="${x + 7}" y2="${top - 9}" stroke="${t.building}" stroke-width="1.5"/><circle class="b" cx="${x + 7}" cy="${top - 10}" r="1.4" fill="${ACCENT}" style="animation-delay:-${round1(r * 3)}s"/>`;
  if (r < 0.25) return `<path d="M${x + 5} ${top}V${top - 4}M${x + 9} ${top}V${top - 4}" stroke="${t.building}"/><rect x="${x + 4}" y="${top - 9}" width="6" height="5" rx="1" fill="${t.building}"/>`;
  if (r < 0.55) return `<rect x="${x + 3}" y="${top - 6}" width="8" height="6" fill="${t.building}"/><rect x="${x + 9}" y="${top - 6}" width="2" height="6" fill="${t.shade}"/>`;
  return `<rect x="${x - 0.5}" y="${top}" width="15" height="2" fill="${t.cap}"/>`;
}

function sky(t, rand) {
  const twinkle = () => `class="t${Math.floor(rand() * 3)}" style="animation-delay:-${round1(rand() * 6)}s"`;
  const out = [];

  out.push(`<rect width="${W}" height="${GROUND}" fill="url(#glow)"/>`);
  if (t.night) {
    out.push(plane);
    for (let i = 0; i < 60; i++) {
      out.push(`<circle cx="${round1(rand() * W)}" cy="${round1(24 + rand() * 100)}" r="${round1(0.4 + rand() * 0.8)}" fill="${t.text}" ${twinkle()}/>`);
    }
  } else {
    out.push(clouds(t));
  }

  for (let x = 0; x < W;) {
    const w = 14 + Math.floor(rand() * 18), h = 20 + rand() * 55;
    out.push(`<rect x="${x}" y="${round1(GROUND - h)}" width="${w}" height="${round1(h)}" fill="${t.back}"/>`);
    x += w;
  }
  return out;
}

function street(x0, t) {
  return [`<rect y="${GROUND}" width="${W}" height="${ROAD}" fill="${t.road}"/>`,
    `<line y1="${GROUND + 0.5}" x2="${W}" y2="${GROUND + 0.5}" stroke="${t.cap}"/>`,
    `<line y1="${GROUND + 14}" x2="${W}" y2="${GROUND + 14}" stroke="${t.lane}" stroke-width="1.5" stroke-dasharray="10 12"/>`,
    ...Array.from({ length: 8 }, (_, k) => lamp(round1(x0 + 50 + k * 110), t)),
    bus(t),
    car(t)];
}

function defs(t) {
  return `<defs>
<linearGradient id="glow" x2="0" y2="1"><stop offset=".3" stop-color="${ACCENT}" stop-opacity="0"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="${t.glow}"/></linearGradient>
<linearGradient id="beamL" x1="1" x2="0"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".35"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient>
<linearGradient id="cone" x2="0" y2="1"><stop offset="0" stop-color="#9ec5ff" stop-opacity=".28"/><stop offset="1" stop-color="#9ec5ff" stop-opacity="0"/></linearGradient>
<linearGradient id="beam"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".45"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient></defs>`;
}

function style(t) {
  return `<style>
.t0,.t1,.t2{animation:tw 3s ease-in-out infinite}.t1{animation-duration:4.3s}.t2{animation-duration:6.1s}
.b{animation:tw 1.6s steps(1) infinite}
.p{animation:tw 1.2s ease-in-out infinite}
.hook{animation:sway 4s ease-in-out infinite}
.bob{animation:bob .7s ease-in-out infinite}
.wave{animation:wave ${t.night ? 7 : 11}s ease-in-out infinite}
.f0,.f1,.f2{animation:flick 7s linear infinite}.f1{animation-duration:11s;animation-delay:-4s}.f2{animation-duration:13s;animation-delay:-9s}
.car{animation:drive 16s linear infinite}
.bus{animation:back 26s linear infinite;animation-delay:-9s}
.plane{animation:back 48s linear infinite;animation-delay:-20s}
.cloud{animation:drive 110s linear infinite}
@keyframes tw{50%{opacity:.15}}
@keyframes bob{50%{transform:translateY(-.4px)}}
@keyframes wave{50%{opacity:${t.night ? 0.55 : 0.8}}}
@keyframes flick{0%,90%,100%{fill-opacity:1}92%{fill-opacity:.15}94%{fill-opacity:1}95.5%{fill-opacity:.25}}
@keyframes sway{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-6deg)}}
@keyframes drive{from{transform:translateX(-80px)}to{transform:translateX(${W + 10}px)}}
@keyframes back{from{transform:translateX(${W + 50}px)}to{transform:translateX(-60px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
}

function svgDocument(t, body) {
  return [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`, defs(t), style(t), body, "</svg>"].join("\n");
}

function render({ total, weeks }, t) {
  const rand = rng(0x0560de);
  const towers = weeks.map((w) => w.toSorted((a, b) => a.weekday - b.weekday).flatMap((d) => Array(d.level).fill(d)));
  const last = weeks.length - 1;
  const best = towers.reduce((b, f, i) => (i < last && f.length > towers[b].length ? i : b), 0);
  const today = weeks[last].at(-1);
  const out = sky(t, rand);

  const x0 = (W - weeks.length * COL) / 2;
  towers.forEach((floors, i) => {
    const x = round1(x0 + i * COL);
    const days = weeks[i];

    if (i > 0 && month(days[0].date) !== month(weeks[i - 1][0].date)) {
      out.push(`<text x="${x}" y="${H - 4}" fill="${t.text}" font-size="9" font-family="${FONT}" opacity=".8">${MONTHS[month(days[0].date)]}</text>`);
    }

    const top = GROUND - LOBBY - floors.length * FLOOR - 1;
    out.push(`<rect x="${x}" y="${top}" width="14" height="${GROUND - top}" fill="${t.building}"/>`,
      `<rect x="${x + 11}" y="${top}" width="3" height="${GROUND - top}" fill="${t.shade}"/>`,
      `<rect x="${x + 5}" y="${GROUND - 4}" width="4" height="4" fill="${t.window}"/>`,
      i === last ? scaffold(x, top, top - 20, t) + crane(x, top - 20, t) : roof(x, top, floors.length, i === best, rand, t));

    out.push(`<g class="wave" style="animation-delay:-${round1((1 - i / weeks.length) * 7)}s">`);
    floors.forEach((day, f) => {
      const y = GROUND - LOBBY - (f + 1) * FLOOR + 1;
      for (const dx of [3, 8]) {
        const flicker = rand() < 0.05 ? ` class="f${Math.floor(rand() * 3)}"` : "";
        const cls = t.night ? (day === today ? ' class="p"' : flicker) : "";
        out.push(`<rect x="${x + dx}" y="${y}" width="3" height="3" fill="${ACCENT}" opacity="${LIT[day.level]}"${cls}/>`);
      }
    });
    out.push("</g>");
  });

  const [y, , d] = today.date.split("-");
  out.push(...street(x0, t), `<text x="${x0}" y="14" fill="${t.text}" font-family="${FONT}" font-size="11">${total.toLocaleString("en-US")} contributions · updated ${MONTHS[month(today.date)]} ${+d}, ${y}</text>`);

  return svgDocument(t, out.join("\n"));
}

const [login, outDir = "dist"] = process.argv.slice(2);
const cal = await fetchCalendar(login, process.env.GITHUB_TOKEN);
mkdirSync(outDir, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) writeFileSync(`${outDir}/skyline-${name}.svg`, render(cal, theme));
