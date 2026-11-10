// =====================================================================
//  EXPOTECH PIXEL QUEST - Servidor (Node.js + Express + MySQL)
//  Inicie com:  npm start   (ou dê dois cliques em INICIAR.bat no Windows)
// =====================================================================
import express from "express";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
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
app.get("/api/rede", (_req, res) => {
  res.json({ urls: enderecosRede().map((ip) => `http://${ip}:${CONFIG.porta}`) });
});

app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada" }));
app.use((err, _req, res, _next) => {
  console.error("[ERRO]", err.message);
  res.status(500).json({ erro: "Falha no servidor/banco" });
});

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

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
      console.error("  Confira se o MySQL está ligado e os dados no arquivo .env");
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
    console.log("     (o QR code aparece na tela inicial do jogo)");
  }
  console.log("");
});
