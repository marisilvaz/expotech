// Apaga TODOS os dados da expo (jogadores, partidas e conquistas ganhas).
// Uso:  npm run db:reset
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(raiz, ".env")); } catch {}

const db = process.env.DB_NAME || "expotech_pixel";
const c = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: db,
});
await c.query("SET FOREIGN_KEY_CHECKS = 0");
for (const t of ["jogador_conquistas", "partidas", "jogadores"]) await c.query(`TRUNCATE TABLE ${t}`);
await c.query("SET FOREIGN_KEY_CHECKS = 1");
await c.end();
console.log(`✔ Banco "${db}" zerado. Pronto para um novo dia de expo!`);
