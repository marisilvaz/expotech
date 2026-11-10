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
  const ctx = c.getContext("2d", { willReadFrequently: true });
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

// O herói é montado em camadas: cabeça + expressão + corpo (braços) + pernas,
// depois cabelo, rosto e acessório por cima. Cada letra é uma cor da paleta.
const HEAD = [
  "................",
  ".....KKKKKK.....",
  "....KkkKKKKK....",
  "...KKkKKKKKKK...",
  "...KKSSSSSSSS...",
  "...KSSSWESSWE...",
  "...KSSSWESSWE...",
  "...sSSSSSSSSS...",
  "....sSSSSSmmS...",
  ".....ssSSSSS....",
];
// expressões: trocam linhas da cabeça (olhos e boca)
const EXPRESSOES = {
  pisca: { 5: "...KSSSSSSSSS...", 6: "...KSSSEESSEE..." },
  feliz: { 5: "...KSSSEESSEE...", 6: "...KSSSSSSSSS...", 8: "....sSSSmmmmS..." },
  susto: { 5: "...KSSSWWSSWW...", 6: "...KSSSWESSWE...", 8: "....sSSSSmmSS...", 9: ".....ssSSmmS...." },
};
const CORPOS = {
  parado: [
    "....JJJJZZJJ....",
    "...JJJJJZZJJJ...",
    "..jjJJJJZZJJjj..",
    "..SSjJJJZZJjSS..",
    "...jjjjjjjjjj...",
  ],
  // braço da frente adiantado, braço de trás recuado
  correndoA: [
    "....JJJJZZJJ....",
    "...JJJJJZZJJjjS.",
    ".sjjJJJJZZJJ....",
    "...jJJJJZZJj....",
    "...jjjjjjjjjj...",
  ],
  correndoB: [
    "....JJJJZZJJ....",
    "...JJJJJZZJJjjs.",
    ".SjjJJJJZZJJ....",
    "...jJJJJZZJj....",
    "...jjjjjjjjjj...",
  ],
  bracosCima: [
    "..S.JJJJZZJJ.S..",
    "..jJJJJJZZJJJj..",
    "...JJJJJZZJJJ...",
    "...jJJJJZZJJj...",
    "...jjjjjjjjjj...",
  ],
  bracosAbertos: [
    "....JJJJZZJJ....",
    "SjjJJJJJZZJJJjjS",
    "...JJJJJZZJJJ...",
    "...jJJJJZZJJj...",
    "...jjjjjjjjjj...",
  ],
};
const PERNAS = {
  parado: [
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....pPP..pPP....",
    "....BBBB..BBBB..",
    "....bbbb..bbbb..",
  ],
  // passada aberta: perna de trás (mais escura) recuada
  passadaA: [
    "....PPPPPPPP....",
    "...ppp....PPP...",
    "..ppp......PPP..",
    ".BBBB......BBBB.",
    ".bbb.......bbbb.",
  ],
  // passagem: uma perna apoiada, joelho da outra levantado
  passagemA: [
    "....PPPPPPPP....",
    ".....PPPppp.....",
    ".....PPP.ppp....",
    ".....BBBB.BBB...",
    ".....bbbb.......",
  ],
  passadaB: [
    "....PPPPPPPP....",
    "...PPP....ppp...",
    "..PPP......ppp..",
    ".BBBB......BBBB.",
    ".bbbb.......bbb.",
  ],
  passagemB: [
    "....PPPPPPPP....",
    ".....pppPPP.....",
    ".....ppp.PPP....",
    ".....BBBB.BBB...",
    ".....bbbb.......",
  ],
  pulo: [
    "....PPPPPPPP....",
    "...PPP...PPPP...",
    "..BBBB....pPP...",
    "..bbbb...BBBB...",
    ".........bbbb...",
  ],
  queda: [
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "...pPP....PPp...",
    "...BBB....BBB...",
    "..bbb......bbb..",
  ],
};
// receita de cada quadro: corpo, pernas, expressão e "afunda" (desce 1px, dá peso à passada)
const QUADROS = {
  idle:  { corpo: "parado", pernas: "parado" },
  idleB: { corpo: "parado", pernas: "parado", afunda: true },
  blink: { corpo: "parado", pernas: "parado", rosto: "pisca" },
  run1:  { corpo: "correndoA", pernas: "passadaA", afunda: true },
  run2:  { corpo: "parado", pernas: "passagemA" },
  run3:  { corpo: "correndoB", pernas: "passadaB", afunda: true },
  run4:  { corpo: "parado", pernas: "passagemB" },
  jump:  { corpo: "bracosCima", pernas: "pulo" },
  fall:  { corpo: "bracosAbertos", pernas: "queda", rosto: "susto" },
  hurt:  { corpo: "bracosAbertos", pernas: "pulo", rosto: "susto" },
  win:   { corpo: "bracosCima", pernas: "parado", rosto: "feliz" },
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

export const HERO_FRAMES = Object.keys(QUADROS);

function heroPalette(c) {
  return {
    H: c.cor_acessorio, h: shade(c.cor_acessorio, -0.28),
    G: "#3ad1ff", W: "#ffffff", E: "#1b1b2f",
    K: c.cor_cabelo, k: shade(c.cor_cabelo, 0.22), S: c.cor_pele, s: shade(c.cor_pele, -0.18), m: "#9c3b2e",
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
  parado: "....SS....SS....",
  passadaA: "..SS.......SS...",
  passagemA: ".....SS..SS.....",
  passadaB: "..SS.......SS...",
  passagemB: ".....SS..SS.....",
  pulo: "..BBBB....SS....",
  queda: "...SS.....SS....",
};
function heroRows(entrada, frame) {
  const cores = { ...CORES_PADRAO, ...entrada };
  const q = QUADROS[frame] ?? QUADROS.idle;
  const pernas = [...PERNAS[q.pernas]];
  if (cores.roupa === "saia") {
    pernas[0] = "....PPPPPPPP....";
    pernas[1] = "...pPPPPPPPPp...";
    pernas[2] = SAIA[q.pernas];
  }
  const cabeca = HEAD.map((r, i) => EXPRESSOES[q.rosto]?.[i] ?? r);
  let rows = [...cabeca, ...CORPOS[q.corpo], ...pernas].map((r) => r.split(""));
  const aplicar = (over) => over.forEach((r, y) => {
    for (let x = 0; x < 16; x++) if (r[x] && r[x] !== "_") rows[y][x] = r[x];
  });
  if (cores.personagem === "menina") {
    aplicar(ROSTO_MENINA.map((r, i) => (i === 8 && q.rosto && q.rosto !== "pisca" ? "________________" : r)));
  }
  aplicar(CABELOS[cores.cabelo] ?? []);
  if (cores.acessorio !== "nenhum") aplicar(ACESSORIOS[cores.acessorio] ?? ACESSORIOS.gorro);
  // "afunda": tudo acima da cintura desce 1 pixel
  if (q.afunda) rows = [Array(16).fill("."), ...rows.slice(0, 14), ...rows.slice(15)];
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

// v = variação (0-2) para o chão não ficar repetitivo; borda = "e" | "d" quando o
// bloco fica na beira de um buraco (ganha contorno e sombra na lateral)
function bordaLateral(p, borda, grama) {
  if (!borda) return;
  const x = borda === "e" ? 0 : 15, x2 = borda === "e" ? 1 : 14, x3 = borda === "e" ? 2 : 13;
  p(x, 0, OUTLINE, 1, 16);
  p(x2, grama ? 5 : 0, "#8f4a22", 1, 16);
  p(x3, grama ? 6 : 0, "#b0602c", 1, 16);
  if (grama) { p(x2, 1, "#6bdc4a", 1, 5); p(x2, 6, "#3fae35", 1, 2); p(x, 0, OUTLINE, 1, 1); }
}
export function tileGrass(v = 0, borda = null) {
  const r = rng(7 + v * 31);
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#c8743a", 16, 16);
    for (let i = 0; i < 7; i++) p(Math.floor(r() * 15), 7 + Math.floor(r() * 8), "#9b5426", 2, 1);
    for (let i = 0; i < 4; i++) p(Math.floor(r() * 15), 7 + Math.floor(r() * 8), "#e39a5c");
    if (v === 2) { p(4, 11, "#8f4a22", 3, 2); p(5, 11, "#b0602c", 1, 1); } // pedrinha
    p(0, 0, "#6bdc4a", 16, 4);
    p(0, 0, "#b6f78f", 16, 1);
    p(0, 1, "#8be86a", 16, 1);
    for (let x = 0; x < 16; x++) {
      const d = ((x + v * 5) * 7) % 3;
      p(x, 4, "#3fae35", 1, 1 + d);
      if (d === 2) p(x, 6, "#2f8f2a", 1, 1);
    }
    for (let i = 0; i < 3; i++) p(Math.floor(r() * 14) + 1, 2 + Math.floor(r() * 2), "#3fae35");
    if (v === 1) { p(11, 1, "#fff35c"); p(10, 2, "#ffffff"); p(12, 2, "#ffffff"); p(11, 3, "#ffffff"); } // florzinha
    bordaLateral(p, borda, true);
  });
}
export function tileDirt(v = 0, borda = null) {
  const r = rng(13 + v * 17);
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#c8743a", 16, 16);
    for (let i = 0; i < 9; i++) p(Math.floor(r() * 15), Math.floor(r() * 15), "#9b5426", 2, 1);
    for (let i = 0; i < 5; i++) p(Math.floor(r() * 16), Math.floor(r() * 16), "#e39a5c");
    if (v === 1) { p(8, 6, "#8f4a22", 4, 3); p(9, 6, "#b0602c", 2, 1); }
    if (v === 2) { p(3, 9, "#f4e2c4", 3, 1); p(2, 10, "#f4e2c4", 1, 1); p(6, 10, "#f4e2c4", 1, 1); } // ossinho
    bordaLateral(p, borda, false);
  });
}
// Bloco de pedra sólido (plataformas)
export function tileStone(v = 0) {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#8e7cc3", 14, 14);
    p(1, 1, "#b9a9f0", 14, 2); p(1, 1, "#b9a9f0", 2, 14);
    p(13, 3, "#5d4b98", 2, 12); p(3, 13, "#5d4b98", 12, 2);
    p(5, 5, "#a594e0", 2, 2); p(9, 8, "#6f5daf", 2, 2);
    if (v === 1) { p(1, 1, "#6bdc4a", 6, 1); p(1, 2, "#3fae35", 3, 1); p(9, 1, "#6bdc4a", 3, 1); p(4, 2, "#3fae35", 1, 2); }
    if (v === 2) { [[6, 9], [7, 10], [7, 11], [8, 12], [5, 10]].forEach(([x, y]) => p(x, y, "#4a3a80")); }
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
  return canvasDraw(16, 16, (p) => {
    p(0, 0, OUTLINE, 16, 16);
    p(1, 1, "#0f7f9e", 14, 14);
    p(2, 2, "#2fe0d0", 12, 12);
    // reflexo diagonal que atravessa o bloco
    const d = frame * 4 - 2;
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) {
      const k = x + y - d;
      if (k >= 0 && k < 3) p(x, y, k === 1 ? "#ffffff" : "#aefcf4");
    }
    p(2, 2, "#c8fffa", 12, 1); p(2, 2, "#c8fffa", 1, 12);
    p(13, 2, "#0b6a85", 1, 12); p(2, 13, "#0b6a85", 12, 1);
    [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => p(x, y, "#0b4f63"));
    BOLT.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "Y" && row[x + 1] !== "Y") p(6 + x, 4 + y, "#c47a00");
    }));
    BOLT.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "Y") p(5 + x, 4 + y, "#fff35c"); }));
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

// Moeda girando (6 quadros: frente, virando, de lado, verso...)
export function coinFrames() {
  const larguras = [10, 8, 5, 2, 5, 8];
  return larguras.map((w, f) => canvasDraw(12, 14, (p) => {
    const cx = 6, cy = 7, ry = 6.2, rx = w / 2;
    const verso = f === 4 || f === 5; // metade da volta mostra o verso, mais escuro
    for (let y = 0; y < 14; y++) for (let x = 0; x < 12; x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.6), dy = (y + 0.5 - cy) / (ry + 0.6);
      if (dx * dx + dy * dy > 1) continue;
      const dentro = ((x + 0.5 - cx) / Math.max(rx - 0.8, 0.5)) ** 2 + ((y + 0.5 - cy) / (ry - 0.8)) ** 2 <= 1;
      let cor = dentro ? (verso ? "#f2b020" : "#ffd23f") : OUTLINE;
      if (dentro && x + 0.5 < cx - rx / 3) cor = verso ? "#ffd23f" : "#fff2a8";
      if (dentro && x + 0.5 > cx + rx / 3) cor = "#e89a00";
      p(x, y, cor);
    }
    if (w >= 8) { p(cx - 1, 4, "#e89a00", 2, 6); p(cx - 1, 4, verso ? "#ffd23f" : "#fff2a8", 1, 6); }
    if (f === 0) { p(3, 3, "#ffffff", 2, 1); p(3, 4, "#ffffff", 1, 1); } // brilho
    if (w === 2) p(cx - 1, 2, "#fff2a8", 1, 10);
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
export function bugFrames() {
  const descer = (m) => ["................", ...m.slice(0, 8), ...m.slice(9)]; // corpo desce 1px
  const inverter = (m) => [...m.slice(0, 9), m[10], m[9]];
  const olhoFechado = (m) => m.map((r, i) => (i === 4 ? ".VVVVVLVVLVVVVV." : i === 5 ? ".VEEVVVVVVVVEEV." : r));
  return [BUG[0], descer(BUG[1]), inverter(BUG[0]), descer(BUG[1]), olhoFechado(BUG[0])].map((m) => fromMap(m, BUG_PAL));
}
export function bugSquash() { return fromMap(BUG_SQUASH, BUG_PAL); }

// Inimigo "Vírus" (bola espinhosa que pula - não dá pra pisar!)
export function virusFrames() {
  // 4 quadros: os espinhos giram e "respiram"; no último ele pisca
  return [0, 1, 2, 3].map((f) => canvasDraw(18, 18, (p) => {
    const cx = 9, cy = 9, longo = f % 2 === 0;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + f * (Math.PI / 16);
      const fim = longo ? 9 : 8;
      for (let r = 5; r < fim; r++) {
        p(Math.round(cx - 0.5 + Math.cos(ang) * r), Math.round(cy - 0.5 + Math.sin(ang) * r), r === fim - 1 ? OUTLINE : r === fim - 2 ? "#ff9db0" : "#ff5a7a");
      }
    }
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 5.8) p(x, y, d > 4.8 ? OUTLINE : (x < 8 && y < 8 ? "#ff9db0" : y > 11 ? "#b3123a" : "#e8264e"));
    }
    if (f === 3) { p(6, 8, OUTLINE, 2, 1); p(10, 8, OUTLINE, 2, 1); }
    else { p(6, 7, "#fff", 2, 3); p(10, 7, "#fff", 2, 3); p(7, 8, OUTLINE, 1, 2); p(11, 8, OUTLINE, 1, 2); p(5, 6, OUTLINE, 3, 1); p(10, 6, OUTLINE, 3, 1); }
    p(7, 12, OUTLINE, 4, 1); p(7, 13, "#ffffff", 1, 1); p(10, 13, "#ffffff", 1, 1);
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
      // faixa de luz pontilhada logo abaixo da crista (dá volume)
      for (let k = 0; k < 5; k++) if ((x + k) % 2 === 0) p(x, yTop + 2 + k, shade(cor, 0.22 - k * 0.04));
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

// =====================================================================
//  CHEFE: "REI GLITCH" (monitor com coroa em cima de um besouro-robô)
// =====================================================================
// poses: a1, a2 (andando), c1, c2 (investida), ar (salto), tiro, tonto, dano
// furia = true pinta de vermelho e adiciona falhas de imagem (glitch)
export const POSES_CHEFE = ["a1", "a2", "c1", "c2", "ar", "tiro", "tonto", "dano"];
export function chefe(pose = "a1", furia = false) {
  const passo = pose === "a2" || pose === "c2" ? 1 : 0;
  const carga = pose === "c1" || pose === "c2";
  const noAr = pose === "ar";
  const c = canvasDraw(52, 46, (p, ctx) => {
    // pernas (3 de cada lado): encolhidas no ar, esticadas na investida
    for (let i = 0; i < 3; i++) {
      const lx = 10 + i * 6 + (passo && i % 2 ? 2 : 0) + (carga ? 2 : 0), rx = 42 - i * 6 - (passo && i % 2 ? 2 : 0) + (carga ? 2 : 0);
      const ly = 36 + ((i + passo) % 2);
      const alt = noAr ? 5 : 9;
      p(lx - 3, ly, OUTLINE, 3, alt); p(lx - 2, ly + 1, "#3a3a5c", 1, alt - 2); p(lx - 5 + (noAr ? 2 : 0), ly + alt - 1, OUTLINE, 5, 2);
      p(rx, ly, OUTLINE, 3, alt); p(rx + 1, ly + 1, "#3a3a5c", 1, alt - 2); p(rx - (noAr ? 2 : 0), ly + alt - 1, OUTLINE, 5, 2);
    }
    // casco
    const corCasco = furia ? "#9c1f4a" : "#5a2a9c", luz = furia ? "#ff5a7a" : "#8b5cf6", sombra = furia ? "#5c0f2a" : "#35176b";
    for (let y = 22; y < 42; y++) for (let x = 0; x < 52; x++) {
      const d = ((x + 0.5 - 26) / 25) ** 2 + ((y + 0.5 - 32) / 10.5) ** 2;
      if (d <= 1) {
        const borda = ((x + 0.5 - 26) / 23.8) ** 2 + ((y + 0.5 - 32) / 9.3) ** 2 > 1;
        p(x, y, borda ? OUTLINE : y < 26 ? shade(luz, 0.25) : y < 29 ? luz : y > 37 ? sombra : corCasco);
      }
    }
    for (let x = 8; x < 44; x += 7) p(x, 27, sombra, 1, 11);
    [[12, 30], [24, 33], [36, 30]].forEach(([x, y]) => { p(x, y, OUTLINE, 4, 4); p(x + 1, y + 1, furia ? "#fff35c" : "#2fe0d0", 2, 2); });
    // monitor
    p(11, 5, OUTLINE, 30, 22); p(12, 6, "#c9d3e6", 28, 20); p(12, 6, "#eef3ff", 28, 2); p(12, 24, "#7b86a3", 28, 2); p(38, 8, "#9aa3b8", 2, 16);
    const tela = pose === "dano" ? "#ffffff" : pose === "tiro" ? "#fff35c" : furia ? "#ff3d6e" : "#2fe0d0";
    const linha = pose === "dano" ? "#e6ecff" : pose === "tiro" ? "#ffd23f" : furia ? "#e8264e" : "#1fc1b3";
    p(15, 9, OUTLINE, 22, 14); p(16, 10, tela, 20, 12);
    for (let y = 10; y < 22; y += 2) p(16, y, linha, 20, 1);
    p(17, 10, "#ffffff", 3, 1); p(17, 11, "#ffffff", 1, 1); // reflexo do vidro
    // rosto
    const E = OUTLINE;
    if (pose === "tonto") {
      [[18, 12], [28, 12]].forEach(([x, y]) => { p(x, y, E, 5, 1); p(x + 4, y, E, 1, 4); p(x, y + 4, E, 5, 1); p(x, y + 1, E, 1, 3); p(x + 2, y + 2, E, 1, 1); });
      for (let x = 19; x < 33; x++) p(x, 19 + ((x >> 1) % 2), E);
    } else if (pose === "dano") {
      [[18, 12], [29, 12]].forEach(([x, y]) => { for (let k = 0; k < 5; k++) { p(x + k, y + k, E); p(x + 4 - k, y + k, E); } });
      p(23, 18, E, 6, 1); p(23, 20, E, 6, 1); p(22, 19, E); p(29, 19, E);
    } else if (pose === "tiro") {
      p(18, 12, E, 4, 3); p(30, 12, E, 4, 3); p(19, 12, "#ffffff"); p(31, 12, "#ffffff");
      p(21, 16, E, 10, 5); p(22, 17, "#ff3d6e", 8, 3); p(22, 16, "#ffffff", 2, 1); p(26, 16, "#ffffff", 2, 1); p(24, 20, "#ffffff", 2, 1); p(28, 20, "#ffffff", 2, 1);
    } else {
      // sobrancelhas mais fechadas na investida
      const s2 = carga ? 1 : 0;
      p(17, 11, E, 2, 1 + s2); p(19, 12, E, 2, 1 + s2); p(21, 13, E, 1 + s2, 1);
      p(33, 11, E, 2, 1 + s2); p(31, 12, E, 2, 1 + s2); p(30 - s2, 13, E, 1 + s2, 1);
      p(18, 14, E, 4, 3); p(30, 14, E, 4, 3); p(19, 14, "#ffffff", 1, 1); p(31, 14, "#ffffff", 1, 1);
      for (let x = 20; x < 32; x++) p(x, 19 + (x % 2), E);
      if (carga) for (let x = 20; x < 32; x += 2) p(x, 18, "#ffffff");
    }
    // antenas com led
    p(8, 8, OUTLINE, 3, 12); p(9, 9, "#7b86a3", 1, 10); p(7, 6, OUTLINE, 5, 4); p(8, 7, passo ? "#ff3d6e" : "#fff35c", 3, 2);
    p(41, 8, OUTLINE, 3, 12); p(42, 9, "#7b86a3", 1, 10); p(40, 6, OUTLINE, 5, 4); p(41, 7, passo ? "#fff35c" : "#ff3d6e", 3, 2);
    // coroa
    p(17, 0, OUTLINE, 18, 6);
    [[18, 1], [25, 0], [32, 1]].forEach(([x, y]) => { p(x, y, OUTLINE, 3, 3); p(x + 1, y + 1, "#ffd23f"); });
    p(18, 3, "#ffd23f", 16, 2); p(18, 3, "#fff2a8", 16, 1);
    p(21, 3, "#ff3d6e"); p(26, 3, "#2fe0d0"); p(31, 3, "#ff3d6e");

    const deslocar = (y, h, dx) => { const img = ctx.getImageData(0, y, 52, h); ctx.clearRect(0, y, 52, h); ctx.putImageData(img, dx, y); };
    // investida: o corpo inclina para a frente (olhando para a esquerda) e solta riscos de velocidade
    if (carga) {
      deslocar(0, 12, -3); deslocar(12, 10, -2); deslocar(22, 8, -1);
      [[46, 14, 5], [44, 22, 7], [47, 30, 4]].forEach(([x, y, w], i) => p(x + (passo ? 1 : 0), y + (i % 2 ? passo : 0), "#ffffff", w, 1));
    }
    // fúria: falhas de imagem
    if (furia) (passo ? [9, 15, 30] : [12, 19, 34]).forEach((y) => deslocar(y, 2, passo ? 2 : -2));
  });
  return c;
}

export function pacote(f = 0) {
  return canvasDraw(9, 9, (p) => {
    p(0, 0, OUTLINE, 9, 9);
    p(1, 1, f ? "#ff5aa8" : "#2fe0d0", 7, 7);
    p(1, 1, f ? "#ffc2e0" : "#c8fffa", 3, 3);
    p(5, 5, f ? "#2fe0d0" : "#ff5aa8", 3, 3);
    p(f ? 2 : 5, f ? 5 : 2, "#ffffff", 2, 1);
  });
}
export function onda() {
  return canvasDraw(18, 12, (p) => {
    for (let x = 0; x < 18; x++) {
      const h = Math.round(10 * Math.sin((x / 17) * Math.PI));
      if (h <= 0) continue;
      p(x, 12 - h - 1, OUTLINE, 1, 1);
      p(x, 12 - h, x % 3 ? "#5ef0ff" : "#ffffff", 1, h);
    }
  });
}
export function laserTiro() {
  return canvasDraw(12, 6, (p) => {
    p(0, 1, "#2fe0d0", 12, 4); p(1, 0, "#2fe0d0", 10, 6);
    p(2, 2, "#ffffff", 9, 2);
  });
}
export function chipLaser() {
  return fromMap([
    ".k.k.k.k.",
    "kDDDDDDDk",
    ".DRRRRRD.",
    "kDRWWWRDk",
    ".DRWCWRD.",
    "kDRWWWRDk",
    ".DRRRRRD.",
    "kDDDDDDDk",
    ".k.k.k.k.",
  ], { k: "#c9d3e6", D: "#2a2a4a", R: "#ff3d6e", W: "#ff9ab3", C: "#ffffff" });
}
export function coracaoItem() {
  return fromMap([
    ".RR.RR.",
    "RWRRRRR",
    "RRRRRRR",
    "RRRRRRR",
    ".RRRRR.",
    "..RRR..",
    "...R...",
  ], { R: "#ff3d6e", W: "#ffd0dc" });
}
export function disquete() {
  return fromMap([
    "BBBBBBBBBB.",
    "BBSSSSSBBBB",
    "BBSSKSSBBBB",
    "BBSSKSSBBBB",
    "BBBBBBBBBBB",
    "BWWWWWWWWWB",
    "BWLLLLLLLWB",
    "BWWWWWWWWWB",
    "BWLLLLLWWWB",
    "BWWWWWWWWWB",
    "BBBBBBBBBBB",
  ], { B: "#3a8bff", S: "#c9d3e6", K: "#2a2a4a", W: "#ffffff", L: "#9aa3b8" });
}
export function trofeu() {
  return fromMap([
    "....YYYYYYYYYY....",
    "...YwwYYYYYYYoY...",
    "YYYYwYYYYYYYYoYYYY",
    "Y..YwYYYSYYYYoY..Y",
    "Y..YwYYSSSYYYoY..Y",
    "Y..YwYSSSSSYYoY..Y",
    ".Y.YwYYSSSYYYoY.Y.",
    "..YYYYYSYSYYYoYY..",
    "....YYYYYYYYYoY...",
    ".....YYYYYYYoY....",
    "......YYYYYoY.....",
    ".......YYYoY......",
    "........YoY.......",
    "........YoY.......",
    ".......YYYoY......",
    ".....PPPPPPPP.....",
    ".....PWWWWWWP.....",
    "....PPPPPPPPPP....",
  ], { Y: "#ffd23f", w: "#fff2a8", o: "#e89a00", S: "#ffffff", P: "#8a5532", W: "#fff2a8" });
}

// Tiles de metal (arena do chefe)
export function tileMetalTopo() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#3b4566", 16, 16);
    p(0, 0, "#8fa0c8", 16, 1); p(0, 1, "#5d6a91", 16, 2);
    for (let x = 0; x < 16; x += 4) { p(x, 3, "#ffd23f", 2, 2); p(x + 2, 3, OUTLINE, 2, 2); }
    p(0, 5, OUTLINE, 16, 1);
    p(2, 9, "#8fa0c8"); p(13, 9, "#8fa0c8"); p(2, 13, "#8fa0c8"); p(13, 13, "#8fa0c8");
  });
}
export function tileMetal() {
  return canvasDraw(16, 16, (p) => {
    p(0, 0, "#2c3452", 16, 16);
    p(0, 0, "#3b4566", 16, 1); p(0, 15, "#1f2540", 16, 1); p(15, 0, "#1f2540", 1, 16);
    p(2, 2, "#5d6a91"); p(13, 2, "#5d6a91"); p(2, 13, "#5d6a91"); p(13, 13, "#5d6a91");
  });
}
// Fundo: racks de servidores com luzinhas
export function servidoresStrip(w, h, seed = 4, escuro = false) {
  const r = rng(seed);
  return canvasDraw(w, h, (p) => {
    let x = 0;
    while (x < w) {
      const rw = 30 + Math.floor(r() * 14);
      const rh = Math.floor(h * (0.7 + r() * 0.3));
      const top = h - rh;
      const corpo = escuro ? "#141632" : "#20244a";
      p(x, top, escuro ? "#0b0c22" : OUTLINE, rw, rh);
      p(x + 1, top + 1, corpo, rw - 2, rh - 1);
      p(x + 1, top + 1, escuro ? "#1d2048" : "#2f3570", rw - 2, 1);
      for (let y = top + 4; y < h - 3; y += 6) {
        p(x + 3, y, escuro ? "#0b0c22" : "#14183a", rw - 6, 4);
        for (let k = 0; k < 3; k++) if (r() > 0.35) {
          const cores = ["#45e070", "#2fe0d0", "#ff3d6e", "#ffd23f"];
          p(x + 5 + k * 3, y + 1, escuro ? "#3a4a7a" : cores[Math.floor(r() * 4)], 1, 1);
        }
        for (let vx = x + 16; vx < x + rw - 5; vx += 2) p(vx, y + 1, escuro ? "#141632" : "#2a2f60", 1, 2);
      }
      x += rw + 3;
    }
  });
}

// =====================================================================
//  EFEITOS ANIMADOS (cada função devolve a lista de quadros)
// =====================================================================
// Poeirinha que cresce e some (pulo, aterrissagem, freada)
export function fxPoeira() {
  return [0, 1, 2, 3, 4].map((f) => canvasDraw(16, 12, (p) => {
    const bolhas = [[4 - f * 0.6, 8 - f * 0.4, 2.2 + f * 0.5], [8, 7 - f * 0.9, 2.6 + f * 0.6], [12 + f * 0.6, 8 - f * 0.4, 2.2 + f * 0.5]];
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
      const d = Math.min(...bolhas.map(([bx, by, r]) => Math.hypot(x + 0.5 - bx, y + 0.5 - by) - r));
      if (d >= 0) continue;
      if (f >= 3 && (x + y * 2 + f) % 3 === 0) continue; // vai "furando" até sumir
      if (f === 4 && (x + y) % 2 === 0) continue;
      p(x, y, d > -1 ? "#d8cdb8" : "#ffffff");
    }
  }));
}
// Brilho em cruz (moedas, itens)
export function fxBrilho() {
  return [1, 3, 5, 3, 1].map((t, f) => canvasDraw(11, 11, (p) => {
    for (let k = -t; k <= t; k++) {
      const cor = Math.abs(k) <= 1 ? "#ffffff" : "#fff35c";
      p(5 + k, 5, cor); p(5, 5 + k, cor);
    }
    if (t >= 3) { p(4, 4, "#fff2a8"); p(6, 4, "#fff2a8"); p(4, 6, "#fff2a8"); p(6, 6, "#fff2a8"); }
    if (f === 4) p(5, 5, "#fff35c");
  }));
}
// Estouro de impacto: riscos que se afastam do centro (pisão, golpe)
export function fxImpacto() {
  return [0, 1, 2, 3].map((f) => canvasDraw(24, 24, (p) => {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + Math.PI / 8;
      const ini = 2 + f * 2.6, fim = ini + (f < 2 ? 4 : 3 - (f - 2));
      for (let r = ini; r < fim; r += 0.5) {
        p(Math.round(11.5 + Math.cos(ang) * r), Math.round(11.5 + Math.sin(ang) * r), r < ini + 1.5 ? "#ffffff" : "#fff35c");
      }
    }
    if (f === 0) { p(9, 9, "#ffffff", 6, 6); p(8, 10, "#ffffff", 8, 4); p(10, 8, "#ffffff", 4, 8); }
  }));
}
// Explosão: clarão, bola de fogo, anel e fumaça
export function fxExplosao() {
  return [0, 1, 2, 3, 4, 5, 6].map((f) => canvasDraw(32, 32, (p) => {
    const R = [4, 9, 12, 14, 15, 15, 15][f];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
      if (d > R) continue;
      const t = d / R;
      let cor = null;
      if (f === 0) cor = "#ffffff";
      else if (f === 1) cor = t < 0.6 ? "#ffffff" : "#fff35c";
      else if (f === 2) cor = t < 0.35 ? "#ffffff" : t < 0.7 ? "#fff35c" : "#ff7a1a";
      else if (f === 3) cor = t < 0.3 ? "#fff35c" : t < 0.65 ? "#ff7a1a" : t < 0.9 ? "#e8264e" : OUTLINE;
      else if (f === 4) cor = t < 0.5 ? null : t < 0.75 ? ((x + y) % 2 ? "#ff7a1a" : null) : "#5b5470";
      else if (f === 5) cor = t > 0.6 && (x * 3 + y * 5) % 4 === 0 ? "#77708c" : null;
      else cor = t > 0.7 && (x * 7 + y * 3) % 9 === 0 ? "#9a94ad" : null;
      if (cor) p(x, y, cor);
    }
  }));
}
// Anel de choque no chão (aterrissagem forte)
export function fxAnel() {
  return [0, 1, 2, 3].map((f) => canvasDraw(40, 10, (p) => {
    const rx = 6 + f * 4.5, ry = 2 + f * 0.8;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 40; x++) {
      const d = ((x + 0.5 - 20) / rx) ** 2 + ((y + 0.5 - 7) / ry) ** 2;
      if (d < 1 && d > 0.55 && y < 8 && !(f === 3 && x % 2)) p(x, y, f < 2 ? "#ffffff" : "#d8e4ff");
    }
  }));
}

// ---------- céu ----------
export function sol() {
  return canvasDraw(48, 48, (p) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24);
      if (d < 11) p(x, y, d < 7 ? "#fffbe0" : d < 9.5 ? "#fff59a" : "#ffe45c");
      else if (d < 12) p(x, y, "#ffd23f");
    }
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      for (let r = 15; r < 21; r++) {
        const w = r < 18 ? 2 : 1;
        p(Math.round(23.5 + Math.cos(ang) * r), Math.round(23.5 + Math.sin(ang) * r), "#fff59a", w, w);
      }
    }
  });
}
// Montanhas distantes com neve no pico (faixa repetível)
export function montanhasStrip(w, h, seed = 6) {
  const r = rng(seed);
  const picos = [];
  for (let x = 20; x < w + 60; x += 46 + Math.floor(r() * 30)) picos.push([x, 12 + Math.floor(r() * (h * 0.4))]);
  return canvasDraw(w, h, (p) => {
    for (let x = 0; x < w; x++) {
      // altura = o pico mais alto visto daqui (triângulos), repetindo nas bordas
      let topo = h, lado = 0;
      for (const [px, py] of picos) for (const off of [0, -w, w]) {
        const y = py + Math.abs(x - (px + off)) * 0.85;
        if (y < topo) { topo = y; lado = x - (px + off); }
      }
      topo = Math.round(topo);
      for (let y = topo; y < h; y++) {
        const neve = y - topo < 7 - Math.abs(lado) * 0.35 && (y - topo < 4 || (x + y) % 2 === 0);
        p(x, y, neve ? "#ffffff" : lado > 0 ? "#6f93d6" : "#86a8e6");
      }
    }
  });
}
export function passaro(f = 0) {
  return fromMap(f ? ["........", "KK....KK", "..KKKK..", "...KK..."] : ["K......K", ".K....K.", "..KKKK..", "...KK..."], { K: "#2a3a6a" }, { outline: false });
}
