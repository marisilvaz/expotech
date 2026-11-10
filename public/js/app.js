// =====================================================================
//  EXPOTECH PIXEL QUEST - interface (telas, criador, ranking, quiosque)
// =====================================================================
import { Jogo } from "./game/index.js";
import { toque } from "./game/input.js";
import { Audio } from "./audio.js";
import { API } from "./api.js";
import * as S from "./sprites.js";

gsap.registerPlugin(TextPlugin);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const OCIOSO_MENU_MS = 90_000;   // volta pro início se ninguém mexer
const ATRACAO_MS = 25_000;       // na tela de título, mostra o ranking sozinho
const TOUCH = matchMedia("(pointer: coarse)").matches;

const estado = {
  tela: null,
  iniciado: false,
  jogador: null,
  cores: { ...S.CORES_PADRAO },
  pose: "idle",
  ultimaAtividade: Date.now(),
  modoAtracao: false,
  periodo: "geral",
};

// ---------------------------------------------------------------------
// LOGO
// ---------------------------------------------------------------------
const CORES_LOGO = ["#ff3d6e", "#ff7a1a", "#ffd23f", "#45e070", "#2fe0d0", "#3a8bff", "#9b4dff", "#ff5a7a"];
$("#logoLetras").innerHTML = [..."EXPOTECH"].map((l, i) => `<span style="--c:${CORES_LOGO[i]}">${l}</span>`).join("");

function animarLogo() {
  const letras = $$("#logoLetras span");
  gsap.killTweensOf(letras);
  gsap.fromTo(letras, { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "bounce.out", stagger: 0.07 });
  gsap.to(letras, { y: -10, duration: 0.5, ease: "sine.inOut", stagger: { each: 0.1, repeat: -1, yoyo: true }, delay: 1.6 });
  gsap.fromTo(".logo-sub span", { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.15, delay: 0.7 });
}

// ---------------------------------------------------------------------
// TRANSIÇÃO EM BLOCOS (estilo videogame)
// ---------------------------------------------------------------------
const blocos = Array.from({ length: 16 * 9 }, () => document.createElement("i"));
$("#transicao").append(...blocos);
let transicionando = false;
async function transicao(meio) {
  if (transicionando) { meio(); return; }
  transicionando = true;
  await gsap.to(blocos, { scale: 1.05, duration: 0.16, ease: "steps(3)", stagger: { grid: [9, 16], from: "start", amount: 0.28 } });
  await meio();
  await gsap.to(blocos, { scale: 0, duration: 0.16, ease: "steps(3)", stagger: { grid: [9, 16], from: "end", amount: 0.28 } });
  transicionando = false;
}

// ---------------------------------------------------------------------
// AVISOS E CONFETES
// ---------------------------------------------------------------------
function aviso(texto, ms = 2200) {
  const el = $("#aviso");
  el.textContent = texto;
  gsap.killTweensOf(el);
  gsap.timeline()
    .to(el, { y: "0%", yPercent: 0, top: 14, duration: 0.25, ease: "back.out(2)", transform: "translate(-50%, 0)" })
    .to(el, { transform: "translate(-50%, -400%)", duration: 0.2, delay: ms / 1000 });
}

function confetes(qtd = 70) {
  for (let i = 0; i < qtd; i++) {
    const c = document.createElement("div");
    c.className = "confete";
    c.style.background = CORES_LOGO[i % CORES_LOGO.length];
    c.style.left = `${50 + (Math.random() - 0.5) * 20}vw`;
    c.style.top = "45vh";
    document.body.append(c);
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { x: (Math.random() - 0.5) * innerWidth * 0.9, y: -innerHeight * (0.2 + Math.random() * 0.35), rotation: Math.random() * 720, duration: 0.7, ease: "power2.out" })
      .to(c, { y: innerHeight, duration: 1.4 + Math.random(), ease: "power1.in" });
  }
}

// ---------------------------------------------------------------------
// NAVEGAÇÃO ENTRE TELAS
// ---------------------------------------------------------------------
const aoEntrar = {};

function mostrar(nome) {
  $$(".tela").forEach((t) => { t.hidden = t.dataset.tela !== nome; });
  estado.tela = nome;
  document.body.classList.toggle("jogando", nome === "jogo");
  $("#toque").hidden = !(TOUCH && (nome === "jogo" || nome === "contagem"));
  atualizarLayout();
  aoEntrar[nome]?.();
  selecionar(0);
}

function irPara(nome, { comTransicao = true } = {}) {
  if (comTransicao) transicao(() => mostrar(nome));
  else mostrar(nome);
}

function voltarAoInicio() {
  estado.jogador = null;
  estado.modoAtracao = false;
  Jogo.pararFase();
  irPara("titulo");
}

// itens navegáveis por teclado/controle em cada tela
function navegaveis() {
  const tela = $(`.tela[data-tela="${estado.tela}"]`);
  if (!tela) return [];
  if (estado.tela === "titulo") return $$("#menuTitulo li", tela);
  if (estado.tela === "criador") return [];
  return $$("button", tela);
}
let selIndex = 0;
function selecionar(i) {
  const itens = navegaveis();
  itens.forEach((el) => el.classList.remove("sel"));
  if (!itens.length) return;
  selIndex = (i + itens.length) % itens.length;
  itens[selIndex].classList.add("sel");
  if (itens[selIndex].tagName === "BUTTON") itens[selIndex].focus({ preventScroll: true });
}
function moverSel(d) { Audio.sfx("menu"); selecionar(selIndex + d); }
function confirmarSel() { navegaveis()[selIndex]?.click(); }

// ---------------------------------------------------------------------
// TELA DE TÍTULO
// ---------------------------------------------------------------------
aoEntrar.titulo = () => {
  Jogo.vila();
  animarLogo();
  atualizarTicker();
  $("#pressStart").hidden = estado.iniciado;
  $("#menuTitulo").hidden = !estado.iniciado;
  if (estado.iniciado) {
    Audio.musica("titulo");
    gsap.fromTo("#menuTitulo li", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.07, delay: 0.5 });
  }
};

async function pressStart() {
  if (estado.iniciado) return;
  estado.iniciado = true;
  await Audio.iniciar();
  Audio.jingle("inicio", "titulo");
  gsap.to("#pressStart", { scale: 1.4, opacity: 0, duration: 0.25, onComplete: () => { $("#pressStart").hidden = true; } });
  $("#menuTitulo").hidden = false;
  gsap.fromTo("#menuTitulo li", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, stagger: 0.07 });
  selecionar(0);
}

$("#menuTitulo").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  Audio.sfx("ok");
  const acao = li.dataset.acao;
  if (acao === "jogar") {
    modoCelular();
    if (estado.jogador) comecarPartida();
    else { aviso("CRIE SEU HERÓI PRIMEIRO!"); irPara("criador"); }
  } else if (acao === "criar") irPara("criador");
  else if (acao === "ranking") irPara("ranking");
  else if (acao === "vila") irPara("vila");
});
$("#menuTitulo").addEventListener("pointerover", (e) => {
  const i = $$("#menuTitulo li").indexOf(e.target.closest("li"));
  if (i >= 0 && i !== selIndex) moverSel(i - selIndex);
});

async function atualizarTicker() {
  const e = await API.estatisticas();
  const n = (v) => Number(v || 0).toLocaleString("pt-BR");
  $("#tickerStats").textContent = `★ RECORDE ${n(e.recorde)} · ${n(e.total_jogadores)} HERÓIS · ${n(e.total_partidas)} PARTIDAS`;
}

// ---------------------------------------------------------------------
// CRIADOR DE HERÓI
// ---------------------------------------------------------------------
const PALETAS = {
  forte: ["#ff3d6e", "#ff7a1a", "#ffd23f", "#45e070", "#13b5a6", "#3a8bff", "#9b4dff", "#f4f4f4", "#2a2a4a"],
  pele: ["#ffe0bd", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3317"],
  cabelo: ["#1b1b2f", "#4a2a17", "#8a5532", "#e0a33a", "#f5e6a8", "#ff7a1a", "#ff5a7a", "#3a8bff", "#9b4dff"],
};
const PARTES = [
  { campo: "cor_acessorio", rotulo: "ITEM", paleta: PALETAS.forte },
  { campo: "cor_cabelo", rotulo: "CABELO", paleta: PALETAS.cabelo },
  { campo: "cor_pele", rotulo: "PELE", paleta: PALETAS.pele },
  { campo: "cor_jaqueta", rotulo: "JAQUETA", paleta: PALETAS.forte },
  { campo: "cor_calca", rotulo: "CALÇA", paleta: PALETAS.forte },
  { campo: "cor_tenis", rotulo: "TÊNIS", paleta: PALETAS.forte },
];
const ACESSORIOS = [["nenhum", "NADA"], ["gorro", "GORRO"], ["bone", "BONÉ"], ["fone", "FONE"], ["coroa", "COROA"]];
const CABELOS = [["curto", "CURTO"], ["longo", "LONGO"], ["rabo", "RABO"], ["afro", "AFRO"], ["coque", "COQUE"]];
const PERSONAGENS = [["menino", "MENINO"], ["menina", "MENINA"]];
const ROUPAS = [["calca", "CALÇA"], ["saia", "SAIA"]];

// desenha só a cabeça e os ombros (mostra bem cabelo e acessório)
function desenharCabeca(canvas, src) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, 18, 15, 0, 0, canvas.width, canvas.height);
}

function montarCriador() {
  const opcoes = (lista, campo) => lista.map(([v, r]) =>
    `<button data-campo="${campo}" data-valor="${v}"><canvas width="36" height="30"></canvas>${r}</button>`).join("");
  $("#acessorios").innerHTML = opcoes(ACESSORIOS, "acessorio");
  $("#cabelos").innerHTML = opcoes(CABELOS, "cabelo");
  const seg = (lista, campo) => lista.map(([v, r]) => `<button data-campo="${campo}" data-valor="${v}">${r}</button>`).join("");
  $("#segPersonagem").innerHTML = seg(PERSONAGENS, "personagem");
  $("#segRoupa").innerHTML = seg(ROUPAS, "roupa");
  $("#cores").innerHTML = PARTES.map((p) => `
    <div class="linha-cor" data-campo="${p.campo}">
      <span class="rotulo">${p.rotulo}</span>
      <div class="amostras">
        ${p.paleta.map((c) => `<button class="amostra" style="--c:${c}" data-cor="${c}" aria-label="${p.rotulo} ${c}"></button>`).join("")}
        <label class="amostra amostra-livre" title="Qualquer cor"><input type="color" value="${S.CORES_PADRAO[p.campo]}"></label>
      </div>
    </div>`).join("");

  $(".controles").addEventListener("click", (e) => {
    const b = e.target.closest("[data-valor]");
    if (!b) return;
    const { campo, valor } = b.dataset;
    estado.cores[campo] = valor;
    // atalho: ao escolher MENINA/MENINO já sugere cabelo e roupa
    if (campo === "personagem" && valor === "menina") {
      if (estado.cores.cabelo === "curto") estado.cores.cabelo = "longo";
      estado.cores.roupa = "saia";
      if (estado.cores.acessorio === "gorro") estado.cores.acessorio = "nenhum";
    } else if (campo === "personagem" && valor === "menino") {
      if (estado.cores.cabelo === "longo") estado.cores.cabelo = "curto";
      estado.cores.roupa = "calca";
    }
    Audio.sfx("ok");
    atualizarPrevia(true);
  });
  $("#cores").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cor]");
    if (!b) return;
    estado.cores[b.closest("[data-campo]").dataset.campo] = b.dataset.cor;
    Audio.sfx("menu");
    atualizarPrevia(true);
  });
  $("#cores").addEventListener("input", (e) => {
    if (e.target.type !== "color") return;
    estado.cores[e.target.closest("[data-campo]").dataset.campo] = e.target.value;
    atualizarPrevia(false);
  });
  $("#nome").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9ÁÀÂÃÉÊÍÓÔÕÚÇ _.-]/g, "");
    $("#placaNome").textContent = e.target.value || "HERÓI";
    Audio.sfx("menu");
  });
  $("#nome").addEventListener("keydown", (e) => { if (e.key === "Enter") salvarHeroi(); });
  $$(".btn-pose").forEach((b) => b.addEventListener("click", () => {
    estado.pose = b.dataset.pose;
    $$(".btn-pose").forEach((x) => x.classList.toggle("ativo", x === b));
    Audio.sfx("menu");
  }));
  $("#btnSortear").addEventListener("click", sortear);
  $("#btnPadrao").addEventListener("click", () => {
    estado.cores = { ...S.CORES_PADRAO };
    Audio.sfx("voltar");
    atualizarPrevia(true);
  });
  $("#btnSalvar").addEventListener("click", salvarHeroi);
}

const cacheQuadros = new Map();
function quadro(cores, f) {
  const k = JSON.stringify(cores) + f;
  if (!cacheQuadros.has(k)) {
    if (cacheQuadros.size > 200) cacheQuadros.clear();
    cacheQuadros.set(k, S.heroFrame(cores, f));
  }
  return cacheQuadros.get(k);
}

let passoPrevia = 0;
function desenharPrevia() {
  const correndo = ["run1", "run2", "run3", "run4"];
  const parado = ["idle", "idle", "idle", "idleB", "idleB", "idleB", "idle", "idle", "blink", "idleB", "idleB", "idleB"];
  const f = estado.pose === "andar" ? correndo[passoPrevia % 4]
    : estado.pose === "idle" ? parado[Math.floor(passoPrevia / 2) % parado.length] : estado.pose;
  S.drawScaled($("#previa"), quadro(estado.cores, f), { scale: 12 });
}
setInterval(() => { passoPrevia++; if (estado.tela === "criador") desenharPrevia(); }, 125);

function atualizarPrevia(animar) {
  desenharPrevia();
  $$(".controles [data-valor]").forEach((b) => {
    const { campo, valor } = b.dataset;
    b.classList.toggle("ativo", estado.cores[campo] === valor);
    const cv = $("canvas", b);
    if (cv) desenharCabeca(cv, quadro({ ...estado.cores, [campo]: valor }, "idle"));
  });
  $$(".linha-cor").forEach((l) => {
    const v = estado.cores[l.dataset.campo];
    $$(".amostra[data-cor]", l).forEach((a) => a.classList.toggle("ativa", a.dataset.cor === v));
    $("input", l).value = v;
  });
  if (animar) gsap.fromTo("#previa", { scaleY: 0.85, scaleX: 1.12 }, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "elastic.out(1.2, 0.4)" });
}

function corAleatoria(p) { return p[Math.floor(Math.random() * p.length)]; }
function sortear() {
  const tl = gsap.timeline();
  for (let i = 0; i < 8; i++) {
    tl.call(() => {
      PARTES.forEach((p) => { estado.cores[p.campo] = corAleatoria(p.paleta); });
      estado.cores.acessorio = corAleatoria(ACESSORIOS)[0];
      estado.cores.cabelo = corAleatoria(CABELOS)[0];
      estado.cores.roupa = corAleatoria(ROUPAS)[0];
      Audio.sfx("menu");
      atualizarPrevia(false);
    }, null, i * 0.07);
  }
  tl.call(() => { Audio.sfx("sortear"); atualizarPrevia(true); });
  gsap.fromTo("#previa", { rotationY: 0 }, { rotationY: 360, duration: 0.6, ease: "power2.out" });
}

aoEntrar.criador = () => {
  Audio.musica("vila");
  if (estado.jogador) {
    const { nome, ...resto } = estado.jogador;
    $("#nome").value = nome;
    Object.keys(S.CORES_PADRAO).forEach((k) => { if (resto[k]) estado.cores[k] = resto[k]; });
  }
  $("#placaNome").textContent = $("#nome").value || "HERÓI";
  atualizarPrevia(false);
  gsap.fromTo(".criador", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.6)" });
  setTimeout(() => $("#nome").focus(), 400);
};

let salvando = false;
async function salvarHeroi() {
  if (salvando) return;
  const nome = $("#nome").value.trim();
  if (!nome) {
    aviso("DIGITE O NOME DO SEU HERÓI!");
    Audio.sfx("dano");
    gsap.fromTo("#nome", { x: -8 }, { x: 0, duration: 0.4, ease: "elastic.out(3, 0.2)" });
    $("#nome").focus();
    return;
  }
  salvando = true;
  modoCelular();
  Audio.sfx("salvo");
  try {
    estado.jogador = await API.criarJogador({ nome, ...estado.cores });
  } finally { salvando = false; }
  irPara("chegada");
}

// ---------------------------------------------------------------------
// CHEGADA NA VILA + CONTAGEM + PARTIDA
// ---------------------------------------------------------------------
aoEntrar.chegada = () => {
  Jogo.vila();
  setTimeout(() => Jogo.novoMorador(estado.jogador), 350);
  const b = $("#balaoChegada");
  b.innerHTML = `<b></b> CHEGOU NA<br>VILA EXPOTECH!`;
  $("b", b).textContent = estado.jogador.nome.toUpperCase();
  gsap.fromTo(b, { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2)", delay: 0.6 });
  setTimeout(() => { if (estado.tela === "chegada") comecarPartida(); }, 3000);
};

function comecarPartida() {
  transicao(() => {
    mostrar("contagem");
    Jogo.jogar(estado.jogador, {
      onFim: (r) => terminarPartida(r),
      onInativo: () => { aviso("ATÉ A PRÓXIMA!"); voltarAoInicio(); },
      onSair: () => voltarAoInicio(),
    });
    Jogo.game.scene.pause("fase");
  });
}

aoEntrar.contagem = () => {
  const el = $("#contagem");
  const tl = gsap.timeline({ delay: 0.35 });
  ["3", "2", "1", "VAI!"].forEach((t, i) => {
    tl.call(() => { el.textContent = t; Audio.sfx(i < 3 ? "menu" : "ok"); })
      .fromTo(el, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" })
      .to(el, { opacity: 0, scale: 0.6, duration: 0.2, delay: 0.3 });
  });
  tl.call(() => { mostrar("jogo"); Jogo.game.scene.resume("fase"); });
};

aoEntrar.jogo = () => { document.activeElement?.blur(); };

// ---------------------------------------------------------------------
// RESULTADO
// ---------------------------------------------------------------------
async function terminarPartida(r) {
  const salvar = API.salvarPartida({ jogador_id: estado.jogador.id, dispositivo: TOUCH ? "celular" : "pc", ...r });
  estado.ultimoResultado = r;
  mostrar("resultado");
  const janela = $(".resultado");
  janela.classList.toggle("derrota", !r.venceu);
  $("#resTitulo").textContent = r.venceu ? "VITÓRIA!" : r.fase_alcancada >= 2 ? "QUASE LÁ!" : "FIM DE JOGO";
  $("#resHeroi").textContent = `HERÓI: ${estado.jogador.nome.toUpperCase()}`;
  const n = (v) => Number(v).toLocaleString("pt-BR");
  const linhas = [
    ["CHEGOU ATÉ", r.venceu ? "REI GLITCH DERROTADO ♛" : r.fase_alcancada >= 2 ? "BATALHA DO CHEFE" : "FASE 1"],
    ["MOEDAS", `${r.moedas}/${r.totalMoedas}`],
    ["DISQUETES", `${r.disquetes}/3`],
    ["INIMIGOS", r.inimigos],
    ["TEMPO", `${r.tempo_seg}s`],
    ["PONTOS", n(r.pontosBase)],
  ];
  if (r.continues) linhas.push(["CONTINUES USADOS", r.continues]);
  if (r.bonusTempo) linhas.push(["BÔNUS TEMPO", `+${n(r.bonusTempo)}`]);
  if (r.bonusFase) linhas.push(["BÔNUS PORTAL", `+${n(r.bonusFase)}`]);
  if (r.bonusVidas) linhas.push(["BÔNUS VIDAS", `+${n(r.bonusVidas)}`]);
  $("#resPlacar").innerHTML = linhas.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join("");
  $("#resTotal").textContent = "0";
  $("#resPosicao").innerHTML = "";
  $("#resConquistas").innerHTML = "";

  const tl = gsap.timeline();
  tl.fromTo(janela, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.6)" })
    .fromTo("#resPlacar li", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.2, stagger: 0.12, onStart: () => Audio.sfx("menu") });
  const contador = { v: 0 };
  let ultimoTic = 0;
  tl.to(contador, {
    v: r.pontos, duration: 1.3, ease: "power1.out",
    onUpdate: () => {
      $("#resTotal").textContent = n(Math.round(contador.v));
      const agora = performance.now();
      if (agora - ultimoTic > 70) { ultimoTic = agora; Audio.sfx("menu"); }
    },
  });
  await tl;
  Audio.sfx("moeda");

  const s = await salvar;
  const pos = $("#resPosicao");
  pos.innerHTML = `<span></span>`;
  gsap.to($("span", pos), { text: `VOCÊ ESTÁ EM #${s.posicao} NO RANKING!`, duration: 0.8, ease: "none" });
  if (s.novo_recorde) {
    setTimeout(() => {
      pos.insertAdjacentHTML("beforeend", `<span class="recorde">★ NOVO RECORDE DA EXPO! ★</span>`);
      confetes(90);
      Audio.sfx("turbo");
    }, 900);
  } else if (r.venceu) confetes(40);

  (s.conquistas ?? []).forEach((c, i) => {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "medalha";
      el.innerHTML = `<i></i><div><b></b><small></small></div>`;
      $("i", el).textContent = c.icone;
      $("b", el).textContent = c.titulo.toUpperCase();
      $("small", el).textContent = c.descricao;
      $("#resConquistas").append(el);
      gsap.fromTo(el, { scale: 0, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(2.5)" });
      Audio.sfx("conquista");
    }, 1300 + i * 550);
  });
  selecionar(0);
}

$("#tela-resultado").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ir]");
  if (!b) return;
  Audio.sfx("ok");
  if (b.dataset.ir === "jogar") { modoCelular(); comecarPartida(); }
  else if (b.dataset.ir === "ranking") { Jogo.pararFase(); irPara("ranking"); }
  else voltarAoInicio();
});

// ---------------------------------------------------------------------
// RANKING
// ---------------------------------------------------------------------
aoEntrar.ranking = async () => {
  if (!Jogo.game.scene.isActive("vila")) Jogo.vila();
  Audio.musica("titulo");
  const lista = $("#listaRanking");
  lista.innerHTML = "";
  $$("#abasRanking button").forEach((b) => b.classList.toggle("ativo", b.dataset.periodo === estado.periodo));
  const [rk, st] = await Promise.all([API.ranking(10, estado.periodo), API.estatisticas()]);
  if (estado.tela !== "ranking") return;
  if (!rk.length) lista.innerHTML = `<li class="vazio">${estado.periodo === "hoje" ? "NINGUÉM JOGOU HOJE AINDA." : "NINGUÉM JOGOU AINDA."}<br>SEJA O PRIMEIRO!</li>`;
  rk.forEach((r, i) => {
    const li = document.createElement("li");
    if (estado.jogador && r.jogador_id === estado.jogador.id) li.classList.add("voce");
    li.innerHTML = `<span class="pos">${i === 0 ? "♛" : ""}${i + 1}º</span><canvas width="36" height="44"></canvas>
      <span class="nome"></span><span>${String(r.melhor_pontuacao).padStart(6, "0")}</span>
      <span class="tempo">${r.melhor_tempo ? `⏱${r.melhor_tempo}s` : "—"}</span>`;
    $(".nome", li).textContent = String(r.nome).toUpperCase();
    if (Number(r.chefes) > 0) $(".nome", li).insertAdjacentHTML("beforeend", `<span class="coroa" title="Derrotou o Rei Glitch">♛</span>`);
    S.drawScaled($("canvas", li), quadro(r, i === 0 ? "win" : "idle"), { scale: 2 });
    lista.append(li);
  });
  gsap.fromTo("#listaRanking li", { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, stagger: 0.06 });
  const n = (v) => Number(v || 0).toLocaleString("pt-BR");
  $("#statsRanking").innerHTML = [
    ["HERÓIS", st.total_jogadores], ["PARTIDAS", st.total_partidas], ["MOEDAS", st.total_moedas],
    ["BUGS DERROTADOS", st.total_inimigos], ["REI GLITCH CAIU", st.total_chefes ?? 0], ["RECORDE", st.recorde],
  ].map(([a, b]) => `<div><b>${n(b)}</b>${a}</div>`).join("");
  gsap.fromTo(".ranking", { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.6)" });
  selecionar(0);
};

$("#abasRanking").addEventListener("click", (e) => {
  const b = e.target.closest("[data-periodo]");
  if (!b || b.dataset.periodo === estado.periodo) return;
  estado.periodo = b.dataset.periodo;
  Audio.sfx("menu");
  aoEntrar.ranking();
});

// ---------------------------------------------------------------------
// VILA
// ---------------------------------------------------------------------
async function carregarVila() {
  const moradores = await API.jogadores(30);
  Jogo.vila(moradores);
  $("#qtdMoradores").textContent = moradores.length;
}
aoEntrar.vila = () => { Audio.musica("vila"); carregarVila(); };

$$("[data-voltar]").forEach((b) => b.addEventListener("click", () => { Audio.sfx("voltar"); irPara("titulo"); }));

// ---------------------------------------------------------------------
// TECLADO, CONTROLE E TOQUE
// ---------------------------------------------------------------------
// devolve true quando o toque só serviu para "acordar" o quiosque
function atividade() {
  estado.ultimaAtividade = Date.now();
  if (!estado.modoAtracao) return false;
  estado.modoAtracao = false;
  irPara("titulo");
  return true;
}

document.addEventListener("keydown", (e) => {
  const digitando = document.activeElement?.tagName === "INPUT" && document.activeElement.type === "text";
  if (atividade()) return;
  if (!digitando) {
    if (e.key === "m" || e.key === "M") { alternarSom(); return; }
    if (e.key === "f" || e.key === "F") { telaCheia(); return; }
    if (e.key === "c" || e.key === "C") { document.body.classList.toggle("crt"); return; }
  }
  if (estado.tela === "jogo" || estado.tela === "contagem") return;
  if (!estado.iniciado) { pressStart(); return; }
  if (digitando) { if (e.key === "Escape") { document.activeElement.blur(); } return; }
  if (["ArrowUp", "ArrowLeft", "w", "a"].includes(e.key)) { e.preventDefault(); moverSel(-1); }
  else if (["ArrowDown", "ArrowRight", "s", "d"].includes(e.key)) { e.preventDefault(); moverSel(1); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); confirmarSel(); }
  else if (e.key === "Escape" || e.key === "Backspace") {
    if (estado.tela !== "titulo" && estado.tela !== "chegada") { Audio.sfx("voltar"); irPara("titulo"); }
  }
});
document.addEventListener("pointerdown", (e) => {
  if (atividade()) { e.preventDefault(); e.stopPropagation(); return; }
  if (!estado.iniciado) pressStart();
}, true);
let ultimoMove = 0;
document.addEventListener("pointermove", () => { if (Date.now() - ultimoMove > 1000) { ultimoMove = Date.now(); estado.ultimaAtividade = Date.now(); } });

// controle (gamepad) nos menus
let padAntes = {};
let padRepetir = 0;
function lerControle() {
  requestAnimationFrame(lerControle);
  const pad = navigator.getGamepads?.()[0];
  if (!pad) return;
  const b = (i) => !!pad.buttons[i]?.pressed;
  const agora = {
    cima: b(12) || pad.axes[1] < -0.5, baixo: b(13) || pad.axes[1] > 0.5,
    ok: b(0) || b(9), voltar: b(1),
  };
  const algum = Object.values(agora).some(Boolean) || b(2) || b(3) || b(14) || b(15) || Math.abs(pad.axes[0]) > 0.5;
  if (algum) estado.ultimaAtividade = Date.now();
  if (estado.tela === "jogo" || estado.tela === "contagem") { padAntes = agora; return; }
  const novo = (k) => agora[k] && !padAntes[k];
  if (!estado.iniciado && (novo("ok") || novo("voltar"))) pressStart();
  else if (algum && estado.modoAtracao) atividade();
  else {
    if (novo("ok")) confirmarSel();
    if (novo("voltar") && estado.tela !== "titulo") { Audio.sfx("voltar"); irPara("titulo"); }
    const t = performance.now();
    if ((agora.cima || agora.baixo) && (novo("cima") || novo("baixo") || t > padRepetir)) {
      moverSel(agora.cima ? -1 : 1);
      padRepetir = t + (novo("cima") || novo("baixo") ? 380 : 140);
    }
  }
  padAntes = agora;
}
requestAnimationFrame(lerControle);

// ---------------------------------------------------------------------
// CONTROLES DE TOQUE: joystick flutuante + botões A e B
// ---------------------------------------------------------------------
const vibrar = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
$$("[data-toque]").forEach((btn) => {
  const k = btn.dataset.toque;
  const on = (v) => (e) => {
    e.preventDefault();
    if (v) { try { btn.setPointerCapture(e.pointerId); } catch {} vibrar(8); }
    toque[k] = v;
    btn.classList.toggle("on", v);
  };
  btn.addEventListener("pointerdown", on(true));
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => btn.addEventListener(ev, on(false)));
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
});
$("#btnPausaToque").addEventListener("pointerdown", (e) => { e.preventDefault(); toque.pausa = true; vibrar(10); });

(function joystick() {
  const zona = $("#zonaJoy"), base = $("#joyBase"), pino = $("#joyPino");
  const RAIO = 44, ZONA_MORTA = 10, CORRER = 34;
  let id = null, ox = 0, oy = 0;
  const soltar = () => {
    id = null;
    toque.esq = toque.dir = toque.correr = false;
    base.classList.remove("ativo");
    base.removeAttribute("style");
    pino.style.transform = "";
  };
  zona.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (id !== null) return;
    id = e.pointerId;
    try { zona.setPointerCapture(id); } catch {}
    const r = zona.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY;
    const w = base.offsetWidth;
    Object.assign(base.style, { left: `${ox - r.left - w / 2}px`, top: `${oy - r.top - w / 2}px`, bottom: "auto", transform: "none" });
    base.classList.add("ativo");
    $("#toque").classList.add("usou");
  });
  zona.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const dx = Phaser.Math.Clamp(e.clientX - ox, -RAIO, RAIO);
    const dy = Phaser.Math.Clamp(e.clientY - oy, -RAIO, RAIO);
    pino.style.transform = `translate(${dx}px, ${dy * 0.5}px)`;
    const antes = toque.correr;
    toque.esq = dx < -ZONA_MORTA;
    toque.dir = dx > ZONA_MORTA;
    toque.correr = Math.abs(dx) > CORRER;
    if (toque.correr && !antes) vibrar(6);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => zona.addEventListener(ev, (e) => { if (e.pointerId === id) soltar(); }));
})();

// retrato no celular: jogo em cima e controles embaixo
function atualizarLayout() {
  const retrato = TOUCH && innerHeight > innerWidth && (estado.tela === "jogo" || estado.tela === "contagem");
  document.body.classList.toggle("retrato", retrato);
  requestAnimationFrame(() => Jogo.game?.scale.refresh());
}
addEventListener("resize", atualizarLayout);
screen.orientation?.addEventListener?.("change", atualizarLayout);

// no celular: tela cheia e (no Android) trava na horizontal
function modoCelular() {
  if (!TOUCH) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: "hide" })
      .then(() => screen.orientation?.lock?.("landscape").catch(() => {}))
      .then(() => setTimeout(atualizarLayout, 300))
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------
// QR CODE: na expo, o visitante aponta a câmera e joga no próprio celular
// ---------------------------------------------------------------------
async function montarQR() {
  if (TOUCH || !window.qrcode) return;
  try {
    const r = await fetch("/api/rede").then((x) => x.json());
    const url = r.urls?.[0];
    if (!url) return;
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const cv = $("#qrCanvas");
    const tam = Math.floor(cv.width / (n + 2));
    const off = Math.floor((cv.width - tam * n) / 2);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#1b1b2f";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect(off + x * tam, off + y * tam, tam, tam);
    $("#qrUrl").textContent = url.replace(/^https?:\/\//, "");
    $("#qrBox").hidden = false;
    gsap.fromTo("#qrBox", { x: 200 }, { x: 0, duration: 0.6, ease: "back.out(1.4)", delay: 1 });
  } catch { /* sem rede: sem QR */ }
}

// som e tela cheia
function alternarSom() {
  const mudo = Audio.alternarMudo();
  $("#btnSom").classList.toggle("mudo", mudo);
  aviso(mudo ? "SOM DESLIGADO (M)" : "SOM LIGADO (M)", 1200);
}
function telaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
$("#btnSom").addEventListener("click", (e) => { e.stopPropagation(); alternarSom(); });
$("#btnTela").addEventListener("click", (e) => { e.stopPropagation(); telaCheia(); });
$("#btnSom").classList.toggle("mudo", Audio.mudo);

// ---------------------------------------------------------------------
// MODO QUIOSQUE (expo): volta sozinho pro início / mostra o ranking
// ---------------------------------------------------------------------
setInterval(() => {
  const parado = Date.now() - estado.ultimaAtividade;
  if (["criador", "ranking", "vila", "resultado"].includes(estado.tela) && !estado.modoAtracao && parado > OCIOSO_MENU_MS) {
    voltarAoInicio();
    estado.ultimaAtividade = Date.now();
  } else if (estado.tela === "titulo" && parado > ATRACAO_MS) {
    estado.modoAtracao = true;
    estado.ultimaAtividade = Date.now();
    irPara("ranking");
    setTimeout(() => {
      if (estado.modoAtracao && estado.tela === "ranking") {
        irPara("vila");
        setTimeout(() => { if (estado.modoAtracao) { estado.modoAtracao = false; estado.ultimaAtividade = Date.now(); irPara("titulo"); } }, 12000);
      }
    }, 12000);
  }
}, 1000);

// ---------------------------------------------------------------------
// INÍCIO
// ---------------------------------------------------------------------
async function atualizarStatusBanco() {
  const on = await API.verificar();
  const st = $("#statusBanco");
  st.textContent = on ? "● MYSQL ONLINE" : "● MODO OFFLINE (SALVANDO NO NAVEGADOR)";
  st.classList.toggle("on", on);
  st.classList.toggle("off", !on);
}

(async function iniciar() {
  await Promise.all([
    document.fonts.load('8px "Press Start 2P"'),
    document.fonts.load('10px "VT323"'),
  ]).catch(() => {});
  montarCriador();
  if (TOUCH) $("#pressStart").textContent = "TOQUE PARA COMEÇAR";
  await Jogo.iniciar($("#jogo"));
  montarQR();
  await atualizarStatusBanco();
  setInterval(() => { if (!API.online) atualizarStatusBanco(); }, 20_000);
  mostrar("titulo");
  carregarVila();
})();
