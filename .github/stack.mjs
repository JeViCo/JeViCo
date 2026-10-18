import { mkdirSync, writeFileSync } from "node:fs";

const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons";
const SECTIONS = {
  stack: ["typescript", "javascript", "nodejs", "react", "redux", "vitejs", "vitest", "electron", "styledcomponents", "sass", "fastify", "postgresql", "mongodb", "jest"],
  servers: ["docker", "ansible", "jenkins", "grafana", "prometheus", "linux:plain"],
  binaries: ["c", "cplusplus", "cmake", "sdl", "llvm:plain", "python", "visualstudio"],
  playground: ["csharp", "dotnetcore", "unity", "godot", "blender"],
};
const TILE = 48, ICON = 30, GAP = 10, PER_LINE = 7;

async function icon(spec) {
  const [name, pinned] = spec.split(":");
  for (const variant of pinned ? [pinned] : ["original", "plain"]) {
    const res = await fetch(`${DEVICON}/${name}/${name}-${variant}.svg`);
    if (res.ok) return Buffer.from(await res.text()).toString("base64");
  }
  throw new Error(`no devicon for ${spec}`);
}

function render(icons) {
  const cols = Math.min(PER_LINE, icons.length), rows = Math.ceil(icons.length / PER_LINE);
  const w = cols * TILE + (cols - 1) * GAP + 2, h = rows * TILE + (rows - 1) * GAP + 2;
  const pad = (TILE - ICON) / 2;

  const tiles = icons.map((data, i) => {
    const row = Math.floor(i / PER_LINE);
    const inRow = Math.min(PER_LINE, icons.length - row * PER_LINE);
    const x = 1 + ((i % PER_LINE) + (cols - inRow) / 2) * (TILE + GAP), y = 1 + row * (TILE + GAP);
    return `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="12" fill="#f6f8fa" stroke="#0560DE" stroke-opacity=".35"/>
<image x="${x + pad}" y="${y + pad}" width="${ICON}" height="${ICON}" href="data:image/svg+xml;base64,${data}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n${tiles.join("\n")}\n</svg>\n`;
}

const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });
for (const [section, names] of Object.entries(SECTIONS)) {
  writeFileSync(new URL(`${section}.svg`, OUT), render(await Promise.all(names.map(icon))));
}
