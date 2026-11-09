// =====================================================================
//  ACESSO AO BANCO (API MySQL) com plano B offline
//  Se o servidor/MySQL não responder, salva no próprio navegador
//  para a expo nunca parar.
// =====================================================================
const CONQUISTAS_OFFLINE = {
  primeira_partida: { titulo: "Primeiro Passo", descricao: "Jogou a primeira partida na Expotech", icone: "★" },
  colecionador: { titulo: "Colecionador", descricao: "Pegou 30 moedas ou mais em uma partida", icone: "●" },
  cacador_bugs: { titulo: "Caçador de Bugs", descricao: "Derrotou 6 inimigos em uma partida", icone: "✖" },
  vencedor: { titulo: "Missão Cumprida", descricao: "Chegou ao portal no fim da fase", icone: "▲" },
  veloz: { titulo: "Veloz", descricao: "Terminou a fase em menos de 90 segundos", icone: "»" },
  intocavel: { titulo: "Intocável", descricao: "Terminou a fase sem perder nenhuma vida", icone: "♥" },
  lenda: { titulo: "Lenda da Expo", descricao: "Fez 15.000 pontos ou mais", icone: "♛" },
};

let online = null;

async function req(metodo, url, corpo) {
  const r = await fetch(`/api${url}`, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---------- armazenamento local (modo offline) ----------
const local = {
  ler() {
    try { return JSON.parse(localStorage.getItem("expo_db")) ?? { jogadores: [], partidas: [], conquistas: [] }; }
    catch { return { jogadores: [], partidas: [], conquistas: [] }; }
  },
  gravar(db) { try { localStorage.setItem("expo_db", JSON.stringify(db)); } catch {} },
  ranking(db, limite = 10) {
    const porJogador = new Map();
    for (const p of db.partidas) {
      const r = porJogador.get(p.jogador_id) ?? { melhor_pontuacao: 0, partidas_jogadas: 0, vitorias: 0, melhor_tempo: null };
      r.melhor_pontuacao = Math.max(r.melhor_pontuacao, p.pontos);
      r.partidas_jogadas++;
      if (p.venceu) { r.vitorias++; r.melhor_tempo = r.melhor_tempo == null ? p.tempo_seg : Math.min(r.melhor_tempo, p.tempo_seg); }
      porJogador.set(p.jogador_id, r);
    }
    return [...porJogador].map(([id, r]) => {
      const j = db.jogadores.find((x) => x.id === id) ?? {};
      return { ...j, jogador_id: id, ...r };
    }).sort((a, b) => b.melhor_pontuacao - a.melhor_pontuacao).slice(0, limite);
  },
};

export const API = {
  get online() { return online; },

  async verificar() {
    try { await req("GET", "/saude"); online = true; }
    catch { online = false; }
    return online;
  },

  async criarJogador(dados) {
    if (online) { try { return await req("POST", "/jogadores", dados); } catch { online = false; } }
    const db = local.ler();
    const j = { ...dados, id: Date.now(), criado_em: new Date().toISOString() };
    db.jogadores.unshift(j);
    db.jogadores = db.jogadores.slice(0, 300);
    local.gravar(db);
    return j;
  },

  async jogadores(limite = 30) {
    if (online) { try { return await req("GET", `/jogadores?limite=${limite}`); } catch { online = false; } }
    return local.ler().jogadores.slice(0, limite);
  },

  async salvarPartida(dados) {
    if (online) { try { return await req("POST", "/partidas", dados); } catch { online = false; } }
    const db = local.ler();
    const recordeAntes = Math.max(0, ...db.partidas.map((p) => p.pontos));
    db.partidas.push({ ...dados, criado_em: new Date().toISOString() });
    const ganhou = ["primeira_partida"];
    if (dados.moedas >= 30) ganhou.push("colecionador");
    if (dados.inimigos >= 6) ganhou.push("cacador_bugs");
    if (dados.venceu) ganhou.push("vencedor");
    if (dados.venceu && dados.tempo_seg < 90) ganhou.push("veloz");
    if (dados.venceu && dados.sem_dano) ganhou.push("intocavel");
    if (dados.pontos >= 15000) ganhou.push("lenda");
    const novas = ganhou.filter((c) => !db.conquistas.some((x) => x.jogador_id === dados.jogador_id && x.codigo === c));
    novas.forEach((c) => db.conquistas.push({ jogador_id: dados.jogador_id, codigo: c }));
    local.gravar(db);
    const rk = local.ranking(db, 9999);
    const acima = rk.filter((r) => r.melhor_pontuacao > dados.pontos && r.jogador_id !== dados.jogador_id).length;
    return {
      posicao: acima + 1,
      novo_recorde: dados.pontos > 0 && dados.pontos >= recordeAntes,
      conquistas: novas.map((c) => ({ codigo: c, ...CONQUISTAS_OFFLINE[c] })),
    };
  },

  async ranking(limite = 10) {
    if (online) { try { return await req("GET", `/ranking?limite=${limite}`); } catch { online = false; } }
    return local.ranking(local.ler(), limite);
  },

  async estatisticas() {
    if (online) { try { return await req("GET", "/estatisticas"); } catch { online = false; } }
    const db = local.ler();
    const soma = (k) => db.partidas.reduce((s, p) => s + (Number(p[k]) || 0), 0);
    return {
      total_jogadores: db.jogadores.length, total_partidas: db.partidas.length,
      total_moedas: soma("moedas"), total_inimigos: soma("inimigos"),
      total_vitorias: db.partidas.filter((p) => p.venceu).length,
      recorde: Math.max(0, ...db.partidas.map((p) => p.pontos)),
    };
  },
};
