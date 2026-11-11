// =====================================================================
//  EXPOTECH PIXEL QUEST - Servidor (Node.js + Express + MySQL)
//  Inicie com:  npm start   (ou dê dois cliques em INICIAR.bat no Windows)
// =====================================================================
import express from "express";
import mysql from "mysql2/promise";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lê o arquivo .env (se existir) sem precisar de biblioteca extra
try { process.loadEnvFile(path.join(__dirname, ".env")); } catch { /* sem .env: usa padrões */ }

const CONFIG = {
  porta: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || "expotech_pixel",
  },
};

const ACESSORIOS = ["nenhum", "gorro", "bone", "fone", "coroa"];
const ESTILOS = {
  personagem: ["menino", "menina"],
  cabelo: ["curto", "longo", "rabo", "afro", "coque"],
  roupa: ["calca", "saia"],
};
const CORES = ["cor_acessorio", "cor_cabelo", "cor_pele", "cor_jaqueta", "cor_calca", "cor_tenis"];
const HEX = /^#[0-9a-fA-F]{6}$/;

let pool = null;

// ---------------------------------------------------------------------
// Banco: cria o database e as tabelas automaticamente (schema.sql)
// ---------------------------------------------------------------------
async function iniciarBanco() {
  const schema = await readFile(path.join(__dirname, "database", "schema.sql"), "utf8");
  const sql = schema.replaceAll("expotech_pixel", CONFIG.db.database);
  const conexao = await mysql.createConnection({
    host: CONFIG.db.host, port: CONFIG.db.port,
    user: CONFIG.db.user, password: CONFIG.db.password,
    multipleStatements: true,
  });
  await migrar(conexao);
  await conexao.query(sql);
  await conexao.end();

  pool = mysql.createPool({ ...CONFIG.db, connectionLimit: 8, charset: "utf8mb4" });
  await pool.query("SELECT 1");
}

// Atualiza um banco criado pela versão anterior (sem apagar nada)
async function migrar(conexao) {
  const db = CONFIG.db.database;
  const [[tem]] = await conexao.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jogadores'", [db]);
  if (!Number(tem.n)) return;
  const [cols] = await conexao.query(
    "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jogadores'", [db]);
  const existe = new Set(cols.map((x) => x.c));
  const t = `\`${db}\`.jogadores`;
  if (!existe.has("personagem")) await conexao.query(`ALTER TABLE ${t} ADD COLUMN personagem ENUM('menino','menina') NOT NULL DEFAULT 'menino' AFTER nome`);
  if (!existe.has("cabelo")) await conexao.query(`ALTER TABLE ${t} ADD COLUMN cabelo ENUM('curto','longo','rabo','afro','coque') NOT NULL DEFAULT 'curto' AFTER personagem`);
  if (!existe.has("roupa")) await conexao.query(`ALTER TABLE ${t} ADD COLUMN roupa ENUM('calca','saia') NOT NULL DEFAULT 'calca' AFTER cabelo`);
  await conexao.query(`ALTER TABLE ${t} MODIFY acessorio ENUM('nenhum','gorro','bone','fone','coroa') NOT NULL DEFAULT 'gorro'`);

  // partidas: colunas da versão com chefe
  const [colsP] = await conexao.query(
    "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'partidas'", [db]);
  const temP = new Set(colsP.map((x) => x.c));
  const tp = `\`${db}\`.partidas`;
  const novas = [
    ["fase_alcancada", "TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER venceu"],
    ["chefe_derrotado", "TINYINT(1) NOT NULL DEFAULT 0 AFTER fase_alcancada"],
    ["disquetes", "TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER chefe_derrotado"],
    ["dispositivo", "ENUM('pc','celular') NOT NULL DEFAULT 'pc' AFTER disquetes"],
  ];
  for (const [col, def] of novas) if (colsP.length && !temP.has(col)) await conexao.query(`ALTER TABLE ${tp} ADD COLUMN ${col} ${def}`);
}

// ---------------------------------------------------------------------
// Endereço público (ngrok): o QR code da tela inicial aponta direto para ele.
// O ngrok tem uma API local (porta 4040) que informa a URL da vez; como ela muda
// toda vez que o ngrok é ligado, o servidor pergunta de novo a cada poucos segundos.
// Se preferir fixar um endereço, coloque PUBLIC_URL=https://... no arquivo .env
// ---------------------------------------------------------------------
const NGROK_APIS = process.env.NGROK_API
  ? [process.env.NGROK_API]
  : [4040, 4041, 4042].map((p) => `http://127.0.0.1:${p}`);
let publica = { url: null, em: 0, buscando: null };

async function buscarNgrok() {
  for (const base of NGROK_APIS) {
    try {
      const r = await fetch(`${base}/api/tunnels`, { signal: AbortSignal.timeout(700) });
      if (!r.ok) continue;
      const { tunnels = [] } = await r.json();
      const daPorta = tunnels.filter((t) => new RegExp(`(^|[:/])${CONFIG.porta}$`).test(String(t.config?.addr ?? "")));
      const lista = daPorta.length ? daPorta : tunnels;
      const t = lista.find((x) => String(x.public_url).startsWith("https://")) || lista[0];
      if (t?.public_url) return String(t.public_url).replace(/\/+$/, "");
    } catch { /* ngrok desligado nesta porta */ }
  }
  return null;
}

async function urlPublica() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, "");
  if (Date.now() - publica.em < 5000) return publica.url;
  publica.buscando ??= buscarNgrok().then((url) => {
    if (url !== publica.url) {
      console.log(url
        ? `\n  🌍 ngrok ligado! O QR code agora aponta para:  ${url}\n`
        : "\n  🌍 ngrok desligado: o QR code voltou para o endereço da rede local.\n");
    }
    publica = { url, em: Date.now(), buscando: null };
    return url;
  });
  return publica.buscando;
}

// Endereços desta máquina na rede local (para o QR code dos celulares)
function enderecosRede() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address)
    .sort((a, b) => (b.startsWith("192.168.") - a.startsWith("192.168.")) || (b.startsWith("10.") - a.startsWith("10.")));
}

// ---------------------------------------------------------------------
// Validação simples dos dados que chegam do navegador
// ---------------------------------------------------------------------
function limparNome(nome) {
  const limpo = String(nome ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 16);
  return limpo || "HERÓI";
}
function inteiro(valor, max) {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
}

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: "20kb" }));

const api = express.Router();

// Se o MySQL estiver desligado, a API responde 503 e o site usa o modo offline
api.use((_req, res, next) => (pool ? next() : res.status(503).json({ erro: "Banco indisponível" })));

api.get("/saude", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, banco: "mysql" });
});

// Cria um herói
api.post("/jogadores", async (req, res) => {
  const b = req.body ?? {};
  const acessorio = ACESSORIOS.includes(b.acessorio) ? b.acessorio : "gorro";
  const cores = CORES.map((c) => (HEX.test(b[c]) ? b[c].toLowerCase() : null));
  if (cores.includes(null)) return res.status(400).json({ erro: "Cores inválidas" });

  const estilo = (k) => (ESTILOS[k].includes(b[k]) ? b[k] : ESTILOS[k][0]);
  const [r] = await pool.execute(
    `INSERT INTO jogadores (nome, personagem, cabelo, roupa, acessorio, ${CORES.join(", ")})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [limparNome(b.nome), estilo("personagem"), estilo("cabelo"), estilo("roupa"), acessorio, ...cores],
  );
  const [[jogador]] = await pool.execute("SELECT * FROM jogadores WHERE id = ?", [r.insertId]);
  res.status(201).json(jogador);
});

// Últimos heróis criados (usado pela Vila)
api.get("/jogadores", async (req, res) => {
  const limite = inteiro(req.query.limite ?? 30, 100) || 30;
  const [linhas] = await pool.query(
    "SELECT * FROM jogadores ORDER BY criado_em DESC, id DESC LIMIT ?", [limite],
  );
  res.json(linhas);
});

// Registra uma partida e devolve posição no ranking + conquistas novas
api.post("/partidas", async (req, res) => {
  const b = req.body ?? {};
  const jogadorId = inteiro(b.jogador_id, 4_000_000_000);
  const [[jogador]] = await pool.execute("SELECT id FROM jogadores WHERE id = ?", [jogadorId]);
  if (!jogador) return res.status(404).json({ erro: "Jogador não encontrado" });

  const p = {
    pontos: inteiro(b.pontos, 999_999),
    moedas: inteiro(b.moedas, 999),
    inimigos: inteiro(b.inimigos, 999),
    tempo_seg: inteiro(b.tempo_seg, 9999),
    vidas_restantes: inteiro(b.vidas_restantes, 9),
    venceu: b.venceu ? 1 : 0,
    fase_alcancada: Math.max(1, inteiro(b.fase_alcancada, 9)),
    chefe_derrotado: b.chefe_derrotado ? 1 : 0,
    disquetes: inteiro(b.disquetes, 9),
    dispositivo: b.dispositivo === "celular" ? "celular" : "pc",
  };
  const sem_dano = Boolean(b.sem_dano);

  const [r] = await pool.execute(
    `INSERT INTO partidas (jogador_id, pontos, moedas, inimigos, tempo_seg, vidas_restantes, venceu,
                           fase_alcancada, chefe_derrotado, disquetes, dispositivo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [jogadorId, p.pontos, p.moedas, p.inimigos, p.tempo_seg, p.vidas_restantes, p.venceu,
      p.fase_alcancada, p.chefe_derrotado, p.disquetes, p.dispositivo],
  );

  // Regras das conquistas
  const ganhou = ["primeira_partida"];
  if (p.moedas >= 30) ganhou.push("colecionador");
  if (p.inimigos >= 6) ganhou.push("cacador_bugs");
  if (p.fase_alcancada >= 2) ganhou.push("vencedor");
  if (p.chefe_derrotado) ganhou.push("chefe");
  if (p.venceu && p.tempo_seg < 180) ganhou.push("veloz");
  if (p.venceu && sem_dano) ganhou.push("intocavel");
  if (p.disquetes >= 3) ganhou.push("arquivista");
  if (p.dispositivo === "celular") ganhou.push("mobile");
  if (p.pontos >= 30000) ganhou.push("lenda");

  const novas = [];
  for (const codigo of ganhou) {
    const [ins] = await pool.execute(
      "INSERT IGNORE INTO jogador_conquistas (jogador_id, codigo, partida_id) VALUES (?, ?, ?)",
      [jogadorId, codigo, r.insertId],
    );
    if (ins.affectedRows) novas.push(codigo);
  }
  const [conquistas] = novas.length
    ? await pool.query("SELECT * FROM conquistas WHERE codigo IN (?)", [novas])
    : [[]];

  // Posição: quantos jogadores têm melhor pontuação maior que esta partida
  const [[{ acima }]] = await pool.execute(
    "SELECT COUNT(*) AS acima FROM vw_ranking WHERE melhor_pontuacao > ? AND jogador_id <> ?",
    [p.pontos, jogadorId],
  );
  const [[{ recorde }]] = await pool.query("SELECT COALESCE(MAX(pontos),0) AS recorde FROM partidas");

  res.status(201).json({
    partida_id: r.insertId,
    posicao: Number(acima) + 1,
    novo_recorde: p.pontos > 0 && p.pontos >= Number(recorde),
    conquistas,
  });
});

api.get("/ranking", async (req, res) => {
  const limite = inteiro(req.query.limite ?? 10, 50) || 10;
  const [linhas] = req.query.periodo === "hoje"
    // ranking só com as partidas de hoje
    ? await pool.query(
      `SELECT * FROM (
         SELECT j.id AS jogador_id, j.nome, j.personagem, j.cabelo, j.roupa, j.acessorio,
                j.cor_acessorio, j.cor_cabelo, j.cor_pele, j.cor_jaqueta, j.cor_calca, j.cor_tenis,
                MAX(p.pontos) AS melhor_pontuacao, COUNT(p.id) AS partidas_jogadas,
                SUM(p.venceu) AS vitorias, SUM(p.chefe_derrotado) AS chefes,
                MIN(CASE WHEN p.venceu = 1 THEN p.tempo_seg END) AS melhor_tempo
         FROM jogadores j JOIN partidas p ON p.jogador_id = j.id
         WHERE p.criado_em >= CURDATE()
         GROUP BY j.id, j.nome, j.personagem, j.cabelo, j.roupa, j.acessorio,
                  j.cor_acessorio, j.cor_cabelo, j.cor_pele, j.cor_jaqueta, j.cor_calca, j.cor_tenis
       ) r
       ORDER BY melhor_pontuacao DESC, melhor_tempo IS NULL, melhor_tempo ASC
       LIMIT ?`, [limite])
    : await pool.query(
      `SELECT * FROM vw_ranking
       ORDER BY melhor_pontuacao DESC, melhor_tempo IS NULL, melhor_tempo ASC
       LIMIT ?`, [limite]);
  res.json(linhas.map((l) => ({ ...l, vitorias: Number(l.vitorias), chefes: Number(l.chefes) })));
});

api.get("/estatisticas", async (_req, res) => {
  const [[e]] = await pool.query("SELECT * FROM vw_estatisticas");
  res.json(Object.fromEntries(Object.entries(e).map(([k, v]) => [k, Number(v)])));
});

api.get("/jogadores/:id/conquistas", async (req, res) => {
  const [linhas] = await pool.execute(
    `SELECT c.*, jc.obtida_em FROM jogador_conquistas jc
     JOIN conquistas c ON c.codigo = jc.codigo
     WHERE jc.jogador_id = ? ORDER BY jc.obtida_em`, [inteiro(req.params.id, 4_000_000_000)],
  );
  res.json(linhas);
});

// endereços para jogar pelo celular (fora do bloqueio de banco: funciona mesmo offline)
app.get("/api/rede", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    publica: await urlPublica(),
    urls: enderecosRede().map((ip) => `http://${ip}:${CONFIG.porta}`),
  });
});

app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada" }));
app.use((err, _req, res, _next) => {
  console.error("[ERRO]", err.message);
  res.status(500).json({ erro: "Falha no servidor/banco" });
});

// ---------------------------------------------------------------------
// ARQUIVOS DO JOGO, servidos de forma leve (importante pela internet/ngrok):
//  - HTML, JS e CSS saem compactados (brotli ou gzip): ~2 MB viram ~0,5 MB
//  - a compactação é feita uma vez e fica guardada na memória
//  - bibliotecas, fontes e ícones ficam em cache no aparelho do visitante
// ---------------------------------------------------------------------
const PUBLICO = path.join(__dirname, "public");
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
const guardados = new Map(); // arquivo → { mtimeMs, etag, cru, br, gz }
const cacheDe = (rel) => (/^\/(vendor|icones)\//.test(rel) ? "public, max-age=2592000" : "no-cache");

async function lerGuardado(arq) {
  const st = await stat(arq);
  let item = guardados.get(arq);
  if (!item || item.mtimeMs !== st.mtimeMs) {
    const cru = await readFile(arq);
    item = { mtimeMs: st.mtimeMs, cru, etag: `"${st.size.toString(16)}-${Math.round(st.mtimeMs).toString(16)}"` };
    guardados.set(arq, item);
  }
  return item;
}
const comBrotli = (item) => (item.br ??= brotli(item.cru, { params: {
  [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: item.cru.length,
} }));
const comGzip = (item) => (item.gz ??= gzip(item.cru, { level: 9 }));

// envia um arquivo guardado na memória, já compactado do jeito que o aparelho aceita
async function enviar(req, res, item, tipo, cache) {
  res.set({ "Content-Type": tipo, ETag: item.etag, Vary: "Accept-Encoding", "Cache-Control": cache });
  if (req.headers["if-none-match"] === item.etag) return res.status(304).end();
  const aceita = String(req.headers["accept-encoding"] || "");
  let corpo = item.cru;
  if (item.cru.length > 1024) {
    if (/\bbr\b/.test(aceita)) { corpo = await comBrotli(item); res.set("Content-Encoding", "br"); }
    else if (/\bgzip\b/.test(aceita)) { corpo = await comGzip(item); res.set("Content-Encoding", "gzip"); }
  }
  res.set("Content-Length", String(corpo.length));
  res.end(req.method === "HEAD" ? undefined : corpo);
}

// ---------------------------------------------------------------------
// PACOTES: em vez de ~20 arquivos de código, o visitante baixa só 2
//   /pacote/libs-XXXX.js  → Phaser + GSAP + Tone + QR code, um atrás do outro
//   /pacote/jogo-XXXX.js  → todo o código do jogo (public/js) junto e minificado
// Menos arquivos = carrega mais rápido pelo ngrok e gasta menos da cota gratuita dele.
// Os pacotes são montados sozinhos ao ligar o servidor e refeitos quando um arquivo muda:
// continue editando os arquivos em public/js normalmente.
// Para desligar (testes), coloque PACOTES=0 no .env
// ---------------------------------------------------------------------
const LIBS = ["phaser.min.js", "gsap.min.js", "TextPlugin.min.js", "Tone.js", "qrcode.js"];
let esbuild = null;
if (process.env.PACOTES !== "0") {
  try { esbuild = await import("esbuild"); } catch { console.log("  [i] esbuild não instalado (rode npm install): o jogo funciona, só carrega em mais arquivos."); }
}
let pacotes = { assinatura: "", conferidoEm: 0, montando: null, html: null, libs: null, jogo: null };

async function listarJs(dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const arq = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...await listarJs(arq));
    else if (e.name.endsWith(".js")) saida.push(arq);
  }
  return saida;
}
const novoItem = (cru) => ({ cru, etag: `"${createHash("sha1").update(cru).digest("hex").slice(0, 16)}"` });
const marca = (item) => item.etag.slice(1, 11);

async function montarPacotes() {
  const fontes = [path.join(PUBLICO, "index.html"), ...LIBS.map((l) => path.join(PUBLICO, "vendor", l)), ...await listarJs(path.join(PUBLICO, "js"))];
  const assinatura = (await Promise.all(fontes.map(async (f) => `${f}:${(await stat(f)).mtimeMs}`))).join("|");
  if (assinatura === pacotes.assinatura) return;
  let html = await readFile(fontes[0], "utf8");
  const preloads = [];

  // bibliotecas: simplesmente uma atrás da outra
  const partes = await Promise.all(LIBS.map((l) => readFile(path.join(PUBLICO, "vendor", l))));
  const libs = novoItem(Buffer.concat(partes.flatMap((b) => [b, Buffer.from("\n;\n")])));
  const tagsLibs = LIBS.map((l) => `<script src="vendor/${l}"></script>`);
  if (tagsLibs.every((t) => html.includes(t))) {
    html = html.replace(tagsLibs[0], `<script src="pacote/libs-${marca(libs)}.js"></script>`);
    tagsLibs.slice(1).forEach((t) => { html = html.replace(t, ""); });
    html = html.replace(/^\s*<link rel="preload" href="vendor\/[^"]+\.js" as="script">\n/gm, "");
    preloads.push(`<link rel="preload" href="pacote/libs-${marca(libs)}.js" as="script">`);
  }

  // código do jogo: empacotado pelo esbuild (se estiver instalado)
  let jogo = null;
  const tagJogo = '<script type="module" src="js/app.js"></script>';
  if (esbuild && html.includes(tagJogo)) {
    try {
      const r = await esbuild.build({
        entryPoints: [path.join(PUBLICO, "js", "app.js")], bundle: true, format: "esm", minify: true,
        write: false, target: ["es2019"], legalComments: "none", logLevel: "silent",
      });
      jogo = novoItem(Buffer.from(r.outputFiles[0].contents));
      html = html.replace(tagJogo, `<script type="module" src="pacote/jogo-${marca(jogo)}.js"></script>`);
      html = html.replace(/^\s*<link rel="modulepreload" href="js\/[^"]+">\n/gm, "");
      preloads.push(`<link rel="modulepreload" href="pacote/jogo-${marca(jogo)}.js">`);
    } catch (e) {
      console.error("  [!] Não consegui empacotar o código do jogo (erro de digitação em algum .js?):");
      console.error("      " + String(e.message).split("\n").slice(0, 3).join("\n      "));
      console.error("      Servindo os arquivos separados por enquanto.");
    }
  }
  html = html.replace("</head>", `  ${preloads.join("\n  ")}\n</head>`);
  pacotes = { ...pacotes, assinatura, html: novoItem(Buffer.from(html)), libs, jogo };
}
async function pacotesProntos() {
  if (process.env.PACOTES === "0") return null;
  if (Date.now() - pacotes.conferidoEm > 2000) {
    pacotes.montando ??= montarPacotes()
      .catch((e) => console.error("  [!] Pacotes:", e.message))
      .finally(() => { pacotes.conferidoEm = Date.now(); pacotes.montando = null; });
  }
  if (pacotes.montando) await pacotes.montando;
  return pacotes.html ? pacotes : null;
}

app.get(/^\/pacote\/(libs|jogo)-[0-9a-f]+\.js$/, async (req, res, next) => {
  const p = await pacotesProntos();
  const item = p?.[req.params[0]];
  if (!item) return next();
  // o nome muda quando o conteúdo muda: pode ficar guardado no aparelho para sempre
  await enviar(req, res, item, TIPOS[".js"], "public, max-age=31536000, immutable");
});

app.use(async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  try {
    let rel = decodeURIComponent(req.path);
    if (rel.endsWith("/")) rel += "index.html";
    const ext = path.extname(rel).toLowerCase();
    if (!TIPOS[ext]) return next();
    if (rel === "/index.html") {
      const p = await pacotesProntos();
      if (p) return await enviar(req, res, p.html, TIPOS[ext], "no-cache");
    }
    const arq = path.join(PUBLICO, rel);
    if (!arq.startsWith(PUBLICO + path.sep)) return next();
    await enviar(req, res, await lerGuardado(arq), TIPOS[ext], cacheDe(rel));
  } catch { next(); } // arquivo não existe (ou nome estranho): segue o fluxo normal
});

// imagens e fontes (já são compactadas por natureza)
app.use(express.static(PUBLICO, {
  extensions: ["html"],
  setHeaders: (res, arq) => {
    const rel = "/" + path.relative(PUBLICO, arq).split(path.sep).join("/");
    res.set("Cache-Control", cacheDe(rel));
  },
}));

// deixa tudo compactado antes do primeiro visitante chegar
async function aquecer(dir = PUBLICO) {
  if (dir === PUBLICO) {
    const p = await pacotesProntos();
    if (p) await Promise.all([p.html, p.libs, p.jogo].filter(Boolean).flatMap((i) => [comBrotli(i), comGzip(i)]));
  }
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const arq = path.join(dir, e.name);
    if (e.isDirectory()) await aquecer(arq);
    else if (TIPOS[path.extname(e.name).toLowerCase()]) {
      try { const item = await lerGuardado(arq); if (item.cru.length > 1024) await Promise.all([comBrotli(item), comGzip(item)]); } catch { /* ignora */ }
    }
  }
}

// ---------------------------------------------------------------------
// Tenta conectar; se o MySQL ainda não estiver ligado, tenta de novo a cada 10s
let avisou = false;
async function conectar() {
  try {
    await iniciarBanco();
    console.log(`✔ MySQL conectado em ${CONFIG.db.host}:${CONFIG.db.port} (banco "${CONFIG.db.database}")`);
  } catch (e) {
    pool = null;
    if (!avisou) {
      avisou = true;
      console.error("✖ Não consegui conectar no MySQL:", e.message);
      console.error("  Confira se o MySQL está ligado (XAMPP → Start em MySQL) e os dados no arquivo .env");
      console.error("  O jogo funciona mesmo assim, salvando só no navegador (modo offline).");
      console.error("  Vou tentar de novo a cada 10 segundos...");
    }
    setTimeout(conectar, 10_000);
  }
}
await conectar();

app.listen(CONFIG.porta, "0.0.0.0", () => {
  console.log(`\n  ★ EXPOTECH PIXEL QUEST rodando em  http://localhost:${CONFIG.porta}`);
  const ips = enderecosRede();
  if (ips.length) {
    console.log("\n  📱 Nos celulares (mesma rede Wi-Fi), acesse:");
    ips.forEach((ip) => console.log(`       http://${ip}:${CONFIG.porta}`));
  }
  console.log("\n  🌍 Pela internet: rode  ngrok http " + CONFIG.porta + "  em outra janela.");
  console.log("     O QR code da tela inicial passa a apontar para o endereço do ngrok sozinho.\n");
  aquecer().catch(() => {});
  urlPublica().catch(() => {});
  setInterval(() => urlPublica().catch(() => {}), 15_000).unref();
});
