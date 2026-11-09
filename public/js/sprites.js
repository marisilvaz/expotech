// =====================================================================
//  SPRITES PIXEL ART - tudo desenhado por código (sem imagens externas)
//  Cada sprite é um "mapa" de letras; cada letra é uma cor da paleta.
// =====================================================================

export const OUTLINE = "#1b1b2f";

// ---------- utilidades de cor ----------
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return c;
}

// Desenha um mapa de letras num canvas. outline=true adiciona contorno de 1px.
export function fromMap(rows, palette, { outline = true, width } = {}) {
  const w = width ?? Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const o = outline ? 1 : 0;
  const c = makeCanvas(w + o * 2, h + o * 2);
  const ctx = c.getContext("2d");
  const filled = new Set();
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ".";
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + o, y + o, 1, 1);
      filled.add(`${x},${y}`);
    }
  });
  if (outline) {
    ctx.fillStyle = OUTLINE;
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (filled.has(`${x},${y}`)) continue;
        if (filled.has(`${x + 1},${y}`) || filled.has(`${x - 1},${y}`) ||
            filled.has(`${x},${y + 1}`) || filled.has(`${x},${y - 1}`)) {
          ctx.fillRect(x + o, y + o, 1, 1);
        }
      }
    }
  }
  return c;
}

// =====================================================================
//  HERÓI (personagem original da Expotech)
// =====================================================================
export const CORES_PADRAO = {
  personagem: "menino",
  cabelo: "curto",
  roupa: "calca",
  acessorio: "gorro",
  cor_acessorio: "#ff7a1a",
  cor_cabelo: "#4a2a17",
  cor_pele: "#f1c27d",
  cor_jaqueta: "#13b5a6",
  cor_calca: "#2b3a8c",
  cor_tenis: "#e8384f",
};

const HEAD = [
  "................",
  ".....KKKKKK.....",
  "....KKKKKKKK....",
  "...KKKKKKKKKK...",
  "...KKSSSSSSSS...",
  "...KSSSWESSWE...",
  "...KSSSWESSWE...",
  "...sSSSSSSSSS...",
  "....SSSSSSmmS...",
  ".....SSSSSSS....",
];
const BODY = [
  "....JJJJZZJJ....",
  "...JJJJJZZJJJ...",
  "..SjJJJJZZJJjS..",
  "..SjJJJJZZJJjS..",
  "...jjjjjjjjjj...",
];
const BODY_UP = [
  "..S.JJJJZZJJ.S..",
  "..SJJJJJZZJJJS..",
  "...jJJJJZZJJj...",
  "...jJJJJZZJJj...",
  "...jjjjjjjjjj...",
];
const LEGS = {
  idle: [
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....pPP..pPP....",
    "....BBBB..BBBB..",
    "....bbbb..bbbb..",
  ],
  walk1: [
    "....PPPPPPPP....",
    "...PPP....PPP...",
    "..PPp......PPp..",
    ".BBBB......BBBB.",
    ".bbbb......bbbb.",
  ],
  walk2: [
    "....PPPPPPPP....",
    ".....PPPPPP.....",
    ".....pPPPPp.....",
    ".....BBBBBBB....",
    ".....bbbbbbb....",
  ],
  jump: [
    "....PPPPPPPP....",
    "...PPP...PPPP...",
    "..BBBB....pPP...",
    "..bbbb...BBBB...",
    ".........bbbb...",
  ],
};
// '_' = mantém o desenho de baixo
const ACESSORIOS = {
  gorro: [
    ".......WW.......",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "...hhhhhhhhhh...",
  ],
  bone: [
    "................",
    ".....HHHWHH.....",
    "....HHHHHHHH....",
    ".hhhHHHHHHHHK...",
  ],
  fone: [
    "....hhhhhhhh....",
    "...h.KKKKKK.h...",
    "...hKKKKKKKKh...",
    "..HHKKKKKKKKHH..",
    "..HHKSSSSSSSHH..",
  ],
  coroa: [
    "....H..HH..H....",
    "....HHHHHHHH....",
    "....HHGHHGHH....",
    "...KhhhhhhhhK...",
  ],
};

export const HERO_FRAMES = ["idle", "walk1", "walk2", "jump"];

function heroPalette(c) {
  return {
    H: c.cor_acessorio, h: shade(c.cor_acessorio, -0.28),
    G: "#3ad1ff", W: "#ffffff", E: "#1b1b2f",
    K: c.cor_cabelo, S: c.cor_pele, s: shade(c.cor_pele, -0.18), m: "#9c3b2e",
    J: c.cor_jaqueta, j: shade(c.cor_jaqueta, -0.3), Z: shade(c.cor_jaqueta, 0.55),
    P: c.cor_calca, p: shade(c.cor_calca, -0.3),
    B: c.cor_tenis, b: "#f4f4f4",
    r: "#e8556d", c: mistura(c.cor_pele, "#ff7b9c", 0.45),
  };
}
function mistura(a, b, t) {
  const n1 = parseInt(a.slice(1), 16), n2 = parseInt(b.slice(1), 16);
  const ch = (n, sh) => (n >> sh) & 255;
  const m = (sh) => Math.round(ch(n1, sh) * (1 - t) + ch(n2, sh) * t);
  return "#" + ((1 << 24) | (m(16) << 8 * 2) | (m(8) << 8) | m(0)).toString(16).slice(1);
}

// ---------- penteados ('_' mantém o desenho de baixo) ----------
const CABELOS = {
  curto: [],
  longo: [
    "________________",
    "________________",
    "________________",
    "..K_____________",
    "..K_____________",
    "..KK____________",
    "..KK____________",
    "..KK____________",
    "..KKK___________",
    "..KKK___________",
    "..KK____________",
    "...K____________",
  ],
  rabo: [
    "________________",
    "________________",
    "..K_____________",
    ".KJ_____________",
    "KKK_____________",
    "KK______________",
    ".KK_____________",
    "..K_____________",
  ],
  coque: [
    "__KKK___________",
    "_KKKKK__________",
    "__KKK___________",
  ],
  afro: [
    "....KKKKKKK.....",
    "..KKKKKKKKKKK...",
    ".KKKKKKKKKKKKK..",
    ".KKKKKKKKKKKKKK.",
    ".KKK__________K.",
    ".KKK__________K.",
    "..KK____________",
    "..K_____________",
  ],
};
// rosto da menina: cílios, bochechas e batom
const ROSTO_MENINA = [
  "________________",
  "________________",
  "________________",
  "________________",
  "________E___E___",
  "________________",
  "________________",
  "______c____c____",
  "__________rr____",
];
// saia (substitui as linhas 15-17 das pernas)
const SAIA = {
  idle: ["....PPPPPPPP....", "...pPPPPPPPPp...", "....SS....SS...."],
  walk1: ["....PPPPPPPP....", "...pPPPPPPPPp...", "..SS.......SS..."],
  walk2: ["....PPPPPPPP....", "...pPPPPPPPPp...", ".....SSSSS......"],
  jump: ["....PPPPPPPP....", "...pPPPPPPPPp...", "..BBBB....SS...."],
};

function heroRows(entrada, frame) {
  const cores = { ...CORES_PADRAO, ...entrada };
  const legs = [...(LEGS[frame] ?? LEGS.idle)];
  if (cores.roupa === "saia") SAIA[frame].forEach((r, i) => { legs[i] = r; });
  const body = frame === "jump" ? BODY_UP : BODY;
  const rows = [...HEAD, ...body, ...legs].map((r) => r.split(""));
  const aplicar = (over) => over.forEach((r, y) => {
    for (let x = 0; x < 16; x++) if (r[x] && r[x] !== "_") rows[y][x] = r[x];
  });
  if (cores.personagem === "menina") aplicar(ROSTO_MENINA);
  aplicar(CABELOS[cores.cabelo] ?? []);
  if (cores.acessorio !== "nenhum") aplicar(ACESSORIOS[cores.acessorio] ?? ACESSORIOS.gorro);
  return rows.map((r) => r.join(""));
}

export function heroFrame(cores, frame = "idle") {
  return fromMap(heroRows(cores, frame), heroPalette({ ...CORES_PADRAO, ...cores }));
}

// Folha com todos os quadros lado a lado (18x22 cada, já com contorno)
export function heroSheet(cores) {
  const frames = HERO_FRAMES.map((f) => heroFrame(cores, f));
  const fw = frames[0].width, fh = frames[0].height;
  const sheet = makeCanvas(fw * frames.length, fh);
  const ctx = sheet.getContext("2d");
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  return { canvas: sheet, fw, fh, names: HERO_FRAMES };
}

// Desenha um canvas pequeno ampliado (pixels nítidos)
export function drawScaled(target, src, { scale, x = 0, y = 0, flip = false, clear = true } = {}) {
  const ctx = target.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (clear) ctx.clearRect(0, 0, target.width, target.height);
  const s = scale ?? Math.floor(Math.min(target.width / src.width, target.height / src.height));
  const dx = x || Math.floor((target.width - src.width * s) / 2);
  const dy = y || Math.floor((target.height - src.height * s) / 2);
  ctx.save();
  if (flip) { ctx.translate(dx * 2 + src.width * s, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, dx, dy, src.width * s, src.height * s);
  ctx.restore();
}

// =====================================================================
//  TILES E OBJETOS DO MUNDO
// =====================================================================
function canvasDraw(w, h, fn) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const p = (x, y, col, ww = 1, hh = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
  fn(p, ctx);
  return c;
}
// gerador pseudo-aleatório com semente (pra textura ficar sempre igual)
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function tileGrass() {
  const r = rng(7);
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#c8743a", 16, 16);
    for (let i = 0; i < 7; i++) p(Math.floor(r() * 15), 6 + Math.floor(r() * 9), "#9b5426", 2, 1);
    for (let i = 0; i < 4; i++) p(Math.floor(r() * 15), 6 + Math.floor(r() * 9), "#e39a5c");
    p(0, 0, "#6bdc4a", 16, 4);
    p(0, 0, "#9ff27a", 16, 1);
    for (let x = 0; x < 16; x++) {
      const d = (x * 7) % 3;
      p(x, 4, "#3fae35", 1, 1 + d);
    }
    p(3, 1, "#3fae35"); p(10, 2, "#3fae35"); p(13, 1, "#3fae35");
  });
}
export function tileDirt() {
  const r = rng(13);
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#c8743a", 16, 16);
    for (let i = 0; i < 9; i++) p(Math.floor(r() * 15), Math.floor(r() * 15), "#9b5426", 2, 1);
    for (let i = 0; i < 5; i++) p(Math.floor(r() * 16), Math.floor(r() * 16), "#e39a5c");
  });
}
// Bloco de pedra sólido (plataformas)
export function tileStone() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#8e7cc3", 14, 14);
    p(1, 1, "#b9a9f0", 14, 2); p(1, 1, "#b9a9f0", 2, 14);
    p(13, 3, "#5d4b98", 2, 12); p(3, 13, "#5d4b98", 12, 2);
    p(5, 5, "#a594e0", 2, 2); p(9, 8, "#6f5daf", 2, 2);
  });
}
// Prancha "leve": dá pra atravessar por baixo e subir em cima
export function tilePlank() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 7);
    p(0, 1, "#ffd29a", 16, 1);
    p(0, 2, "#e8964f", 16, 3);
    p(0, 5, "#b8662e", 16, 1);
    [3, 12].forEach((x) => { p(x, 2, "#8a4a1f", 1, 1); p(x, 4, "#8a4a1f", 1, 1); });
    p(5, 7, OUTLINE, 2, 3); p(9, 7, OUTLINE, 2, 3);
    p(5, 7, "#b8662e", 1, 2); p(9, 7, "#b8662e", 1, 2);
  });
}
// Bloco rachado: quebra com uma cabeçada
export function tileCracked() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#e3a857", 14, 14);
    p(1, 1, "#ffd08a", 14, 2); p(1, 1, "#ffd08a", 2, 14);
    p(13, 3, "#b8762e", 2, 12); p(3, 13, "#b8762e", 12, 2);
    [[7, 3], [6, 4], [6, 5], [7, 6], [8, 7], [8, 8], [9, 9], [5, 8], [4, 9], [10, 10], [10, 11], [3, 10]].forEach(([x, y]) => p(x, y, "#6b3d14"));
  });
}
export function caco() {
  return canvasDraw(5, 5, (p) => { p(0, 0, OUTLINE, 5, 5); p(1, 1, "#e3a857", 3, 3); p(1, 1, "#ffd08a", 2, 1); });
}

// Bloco de energia ⚡ (dá moeda ou turbo quando batido por baixo)
const BOLT = [
  "....YY",
  "...YY.",
  "..YY..",
  ".YYYYY",
  "...YY.",
  "..YY..",
  ".YY...",
  "YY....",
];
export function tileEnergy(frame = 0) {
  const glow = ["#2fe0d0", "#59f5e6", "#2fe0d0", "#1fc1b3"][frame % 4];
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#0f7f9e", 14, 14);
    p(2, 2, glow, 12, 12);
    p(2, 2, "#c8fffa", 12, 1); p(2, 2, "#c8fffa", 1, 12);
    p(13, 2, "#0b6a85", 1, 12); p(2, 13, "#0b6a85", 12, 1);
    [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => p(x, y, "#0b4f63"));
    BOLT.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "Y") { p(5 + x, 4 + y, "#fff35c"); }
    }));
    BOLT.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "Y" && (row[x + 1] !== "Y")) p(6 + x, 4 + y, "#c47a00");
    }));
  });
}
export function tileUsed() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#6b5a52", 14, 14);
    p(2, 2, "#8a776d", 12, 12);
    [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => p(x, y, "#4a3c36"));
  });
}
export function tileSpikes() {
  return canvasDraw(16, 16, (p) => {
    for (let k = 0; k < 2; k++) {
      const cx = 4 + k * 8;
      for (let y = 4; y < 16; y++) {
        const half = (y - 4) * 0.36 + 0.4;
        for (let x = k * 8; x < k * 8 + 8; x++) {
          const d = Math.abs(x + 0.5 - cx);
          if (d < half) p(x, y, x + 0.5 < cx ? "#ffffff" : "#aab6cc");
          else if (d < half + 1) p(x, y, OUTLINE);
        }
      }
    }
    p(0, 14, OUTLINE, 16, 2); p(0, 14, "#5b6378", 16, 1);
  });
}
// Mola (trampolim)
export function spring(compressed = false) {
  return canvasDraw(16, 16, (p) => {
    const top = compressed ? 9 : 3;
    p(1, top, OUTLINE, 14, 4); p(2, top + 1, "#ff3d6e", 12, 2); p(2, top + 1, "#ff9ab3", 12, 1);
    for (let y = top + 4; y < 13; y += 2) { p(4, y, OUTLINE, 8, 2); p(5, y, "#d7dde8", 6, 1); }
    p(1, 13, OUTLINE, 14, 3); p(2, 14, "#5b6378", 12, 1);
  });
}

// Moeda girando (4 quadros)
export function coinFrames() {
  const widths = [10, 7, 3, 7];
  return widths.map((w) => canvasDraw(12, 14, (p) => {
    const cx = 6, cy = 7, ry = 6.2, rx = w / 2;
    for (let y = 0; y < 14; y++) for (let x = 0; x < 12; x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.6), dy = (y + 0.5 - cy) / (ry + 0.6);
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        const inner = ((x + 0.5 - cx) / Math.max(rx - 0.8, 0.5)) ** 2 + ((y + 0.5 - cy) / (ry - 0.8)) ** 2;
        let col = inner <= 1 ? "#ffd23f" : OUTLINE;
        if (inner <= 1 && x + 0.5 < cx - rx / 3) col = "#fff2a8";
        if (inner <= 1 && x + 0.5 > cx + rx / 3) col = "#e89a00";
        p(x, y, col);
      }
    }
    if (w >= 7) { p(cx - 1, 4, "#e89a00", 2, 6); p(cx - 1, 4, "#fff2a8", 1, 6); }
  }));
}

// Inimigo "Bugzinho" (besouro que anda)
const BUG = [
  [
    "..E.........E...",
    "...E.......E....",
    "....VVVVVVVV....",
    "..VVvVVVVVVvVV..",
    ".VWWVVLVVLVVWWV.",
    ".VWEVVVVVVVVWEV.",
    "VVVVLVVVVVVLVVVV",
    "VvVVVVVVVVVVVVvV",
    ".vvvvvvvvvvvvvv.",
    "..k..k....k..k..",
    ".k..k......k..k.",
  ],
  [
    "...E.......E....",
    "...E.......E....",
    "....VVVVVVVV....",
    "..VVvVVVVVVvVV..",
    ".VWWVVLVVLVVWWV.",
    ".VWEVVVVVVVVWEV.",
    "VVVVLVVVVVVLVVVV",
    "VvVVVVVVVVVVVVvV",
    ".vvvvvvvvvvvvvv.",
    "...k..k..k..k...",
    "...k..k..k..k...",
  ],
];
const BUG_SQUASH = [
  "....VVVVVVVV....",
  ".VVVVLVVVVLVVVV.",
  "VXXVVVVVVVVVVXXV",
  "vvvvvvvvvvvvvvvv",
];
const BUG_PAL = { E: OUTLINE, V: "#9b4dff", v: "#5f22b8", L: "#d6b3ff", W: "#ffffff", k: OUTLINE, X: OUTLINE };
export function bugFrames() { return BUG.map((m) => fromMap(m, BUG_PAL)); }
export function bugSquash() { return fromMap(BUG_SQUASH, BUG_PAL); }

// Inimigo "Vírus" (bola espinhosa que pula - não dá pra pisar!)
export function virusFrames() {
  return [0, 1].map((f) => canvasDraw(16, 16, (p) => {
    const cx = 8, cy = 8;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + (f ? Math.PI / 8 : 0);
      for (let r = 5; r < 8; r++) {
        p(Math.round(cx - 0.5 + Math.cos(ang) * r), Math.round(cy - 0.5 + Math.sin(ang) * r), r === 7 ? OUTLINE : "#ff5a7a");
      }
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 5.6) p(x, y, d > 4.6 ? OUTLINE : (x < 7 && y < 7 ? "#ff9db0" : "#e8264e"));
    }
    p(5, 6, "#fff", 2, 3); p(9, 6, "#fff", 2, 3);
    p(6, 7, OUTLINE, 1, 2); p(10, 7, OUTLINE, 1, 2);
    p(6, 11, OUTLINE, 4, 1);
  }));
}

// Power-up "Chip Turbo" (bateria)
export function battery() {
  return fromMap([
    "....kkkk....",
    "...kkkkkk...",
    ".WWWWWWWWWW.",
    ".WggggggggW.",
    ".WggggYgggW.",
    ".WgggYYgggW.",
    ".WggYYgggGW.",
    ".WgYYYYYgGW.",
    ".WgggYYggGW.",
    ".WgggYgggGW.",
    ".WggYggggGW.",
    ".WGGGGGGGGW.",
    ".WWWWWWWWWW.",
  ], { k: "#c9d3e6", W: "#eef3ff", g: "#45e070", G: "#22a64a", Y: "#fff35c" });
}

// Ícones do HUD
export function heartIcon(full = true) {
  return fromMap([
    ".RR.RR.",
    "RWRRRRR",
    "RRRRRRR",
    ".RRRRR.",
    "..RRR..",
    "...R...",
  ], full ? { R: "#ff3d6e", W: "#ffd0dc" } : { R: "#5b5470", W: "#77708c" });
}

// Nuvem fofinha
export function cloud(w = 48) {
  const h = Math.round(w * 0.5);
  return canvasDraw(w, h, (p) => {
    const blobs = [
      [w * 0.25, h * 0.68, h * 0.32], [w * 0.45, h * 0.45, h * 0.42],
      [w * 0.68, h * 0.55, h * 0.36], [w * 0.82, h * 0.72, h * 0.25],
    ];
    const inside = (x, y, grow = 0) => blobs.some(([bx, by, r]) => Math.hypot(x - bx, y - by) < r + grow) && y < h - 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (inside(x + 0.5, y + 0.5)) p(x, y, y > h * 0.7 ? "#d7ecff" : "#ffffff");
      else if (inside(x + 0.5, y + 0.5, 1.2)) p(x, y, "#9fd3ff");
    }
  });
}

// Colinas de fundo com árvores pixel (faixa repetível)
export function hillsStrip(w, h, cor, corEscura, seed = 3, amp = 0.35) {
  const r = rng(seed);
  const fases = [r() * 6, r() * 6, r() * 6];
  return canvasDraw(w, h, (p) => {
    for (let x = 0; x < w; x++) {
      const t = (x / w) * Math.PI * 2;
      const yTop = Math.round(h * (0.45 + amp * 0.5 * (Math.sin(t * 2 + fases[0]) * 0.6 + Math.sin(t * 3 + fases[1]) * 0.4)));
      p(x, yTop, corEscura, 1, 2);
      p(x, yTop + 2, cor, 1, h - yTop);
      if ((x + seed) % 23 === 0) {
        for (let k = 0; k < 7; k++) p(x - 3 + k, yTop - 3, corEscura, 1, 6);
        p(x - 2, yTop - 7, corEscura, 5, 4); p(x - 1, yTop - 9, corEscura, 3, 2);
      }
    }
  });
}

// Cidade/expo ao longe (silhueta com janelas acesas)
export function skylineStrip(w, h, seed = 5) {
  const r = rng(seed);
  return canvasDraw(w, h, (p) => {
    let x = 0;
    while (x < w) {
      const bw = 10 + Math.floor(r() * 18);
      const bh = Math.floor(h * (0.25 + r() * 0.55));
      const col = r() > 0.5 ? "#7f9ee8" : "#8db0f0";
      p(x, h - bh, col, bw, bh);
      p(x, h - bh, "#a9c4ff", bw, 1);
      if (r() > 0.6) { p(x + Math.floor(bw / 2), h - bh - 6, col, 1, 6); p(x + Math.floor(bw / 2), h - bh - 7, "#ff6b8b"); }
      for (let wy = h - bh + 3; wy < h - 2; wy += 4)
        for (let wx = x + 2; wx < x + bw - 2; wx += 3)
          if (r() > 0.55) p(wx, wy, "#d6e4ff");
      x += bw + 2 + Math.floor(r() * 6);
    }
    // cúpula da expo
    const dx = Math.floor(w * 0.55), dr = Math.floor(h * 0.42);
    for (let y = 0; y < dr; y++) {
      const half = Math.round(Math.sqrt(dr * dr - y * y));
      p(dx - half, h - y - 1, y % 4 === 0 ? "#b7cdff" : "#9bbcff", half * 2, 1);
    }
  });
}

// Casinha da Vila
export function house(cor = "#ff5a5a", seed = 1) {
  const r = rng(seed + 11);
  const parede = ["#fff1d6", "#ffe0b8", "#e6f0ff", "#f4e1ff"][Math.floor(r() * 4)];
  return canvasDraw(48, 48, (p) => {
    // telhado
    for (let y = 0; y < 18; y++) {
      const half = Math.min(24, 6 + y * 1.1);
      p(Math.round(24 - half) - 1, y + 2, OUTLINE, Math.round(half * 2) + 2, 1);
      p(Math.round(24 - half), y + 2, y % 3 === 0 ? shade(cor, -0.25) : cor, Math.round(half * 2), 1);
    }
    p(34, 2, OUTLINE, 6, 10); p(35, 3, "#9c6b4a", 4, 9);
    // paredes
    p(4, 20, OUTLINE, 40, 28); p(5, 20, parede, 38, 27);
    p(5, 20, shade(parede, -0.12), 38, 2);
    // porta
    p(20, 30, OUTLINE, 10, 18); p(21, 31, "#8a5532", 8, 17); p(27, 39, "#ffd23f", 1, 2);
    // janelas
    [[9, 26], [33, 26]].forEach(([x, y]) => {
      p(x, y, OUTLINE, 8, 8); p(x + 1, y + 1, "#7fd6ff", 6, 6);
      p(x + 1, y + 1, "#d9f4ff", 2, 2); p(x + 4, y + 1, OUTLINE, 1, 6); p(x + 1, y + 4, OUTLINE, 6, 1);
    });
  });
}

export function tree(seed = 2) {
  return canvasDraw(24, 32, (p) => {
    p(10, 20, OUTLINE, 5, 12); p(11, 20, "#8a5532", 3, 12);
    const blobs = [[12, 10, 9], [7, 15, 6], [17, 15, 6]];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.min(...blobs.map(([bx, by, r]) => Math.hypot(x + 0.5 - bx, y + 0.5 - by) - r));
      if (d < -1) p(x, y, (x + y + seed) % 7 === 0 ? "#7ee05a" : (y > 14 ? "#2f9c3a" : "#45c04a"));
      else if (d < 0) p(x, y, OUTLINE);
    }
  });
}

export function bush() {
  return canvasDraw(32, 14, (p) => {
    const blobs = [[8, 10, 7], [16, 7, 8], [24, 10, 7]];
    for (let y = 0; y < 14; y++) for (let x = 0; x < 32; x++) {
      const d = Math.min(...blobs.map(([bx, by, r]) => Math.hypot(x + 0.5 - bx, y + 0.5 - by) - r));
      if (y >= 13) continue;
      if (d < -1) p(x, y, y < 6 ? "#7ee05a" : "#45c04a");
      else if (d < 0) p(x, y, OUTLINE);
    }
  });
}

export function flower(cor = "#ff5a7a") {
  return fromMap([".C.", "CYC", ".C.", ".g.", "gg."], { C: cor, Y: "#fff35c", g: "#2f9c3a" });
}

// Portal de chegada (moldura) - o redemoinho é animado no Phaser
export function portalFrame() {
  return canvasDraw(40, 56, (p) => {
    for (let y = 0; y < 56; y++) for (let x = 0; x < 40; x++) {
      const cx = 20, cy = 22;
      const inArch = y >= cy ? Math.abs(x + 0.5 - cx) < 20 : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 20;
      const inHole = y >= cy ? Math.abs(x + 0.5 - cx) < 13 : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 13;
      const inEdge = y >= cy ? Math.abs(x + 0.5 - cx) < 19 : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 19;
      if (!inArch || inHole) continue;
      if (!inEdge) { p(x, y, OUTLINE); continue; }
      const brick = ((Math.floor(y / 4) % 2) * 3 + x) % 6 === 0 || y % 4 === 0;
      p(x, y, brick ? "#5d4b98" : "#b9a9f0");
    }
    // luzes
    [[4, 30], [35, 30], [4, 44], [35, 44], [20, 3]].forEach(([x, y]) => { p(x - 1, y - 1, OUTLINE, 3, 3); p(x, y, "#fff35c"); });
  });
}
export function portalSwirl() {
  return canvasDraw(26, 40, (p) => {
    for (let y = 0; y < 40; y++) for (let x = 0; x < 26; x++) {
      const dx = x + 0.5 - 13, dy = y + 0.5 - 20;
      const r = Math.hypot(dx / 13, dy / 20);
      if (r > 1) continue;
      const ang = Math.atan2(dy, dx);
      const v = Math.sin(ang * 3 + r * 10);
      p(x, y, v > 0.4 ? "#ffffff" : v > -0.2 ? "#5ef0ff" : r < 0.5 ? "#b26bff" : "#7a3cff");
    }
  });
}

// =====================================================================
//  FONTE PIXEL 5x7 (desenhada à mão) - fica nítida em qualquer tamanho
// =====================================================================
const G = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "★": ["..#..", "..#..", "#####", ".###.", ".###.", "##.##", "#...#"],
  "♥": [".....", ".#.#.", "#####", "#####", ".###.", "..#..", "....."],
};
// acentos: a letra é "achatada" para 5 linhas e o acento vai em cima
const ACENTOS = { "´": ["...#.", "..#.."], "`": [".#...", "..#.."], "^": ["..#..", ".#.#."], "~": [".##.#", "#.##."] };
const achatar = (l) => [0, 2, 3, 5, 6].map((i) => G[l][i]);
for (const [ch, base, ac] of [["Á", "A", "´"], ["À", "A", "`"], ["Â", "A", "^"], ["Ã", "A", "~"], ["É", "E", "´"],
  ["Ê", "E", "^"], ["Í", "I", "´"], ["Ó", "O", "´"], ["Ô", "O", "^"], ["Õ", "O", "~"], ["Ú", "U", "´"]]) {
  G[ch] = [...ACENTOS[ac], ...achatar(base)];
}
G["Ç"] = [G.C[0], G.C[1], G.C[3], G.C[5], G.C[6], "..#..", ".##.."];

export const FONTE_CHARS = Object.keys(G).join("");
export const FONTE_CEL = { w: 7, h: 9, porLinha: 16 };

// Gera a imagem da fonte: letras brancas com contorno escuro (dá pra tingir no Phaser)
export function fonteCanvas() {
  const { w, h, porLinha } = FONTE_CEL;
  const chars = [...FONTE_CHARS];
  const c = makeCanvas(w * porLinha, h * Math.ceil(chars.length / porLinha));
  const ctx = c.getContext("2d");
  chars.forEach((ch, i) => {
    const ox = (i % porLinha) * w, oy = Math.floor(i / porLinha) * h;
    const rows = G[ch];
    const on = (x, y) => rows[y]?.[x] === "#";
    ctx.fillStyle = OUTLINE;
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 5; x++) {
      if (on(x, y)) continue;
      let viz = false;
      for (let dy = -1; dy <= 1 && !viz; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) { viz = true; break; }
      if (viz) ctx.fillRect(ox + 1 + x, oy + 1 + y, 1, 1);
    }
    ctx.fillStyle = "#ffffff";
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (on(x, y)) ctx.fillRect(ox + 1 + x, oy + 1 + y, 1, 1);
  });
  return c;
}

// Normaliza qualquer texto para os caracteres que a fonte tem
export function textoPixel(s) {
  return [...String(s).toUpperCase()].map((ch) => (G[ch] ? ch : (ch.normalize("NFD")[0] in G ? ch.normalize("NFD")[0] : " "))).join("");
}
