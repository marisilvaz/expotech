// =====================================================================
//  CENA DA FASE - jogo de plataforma com o herói criado pelo visitante
//  Fase 1: Vale Expotech  →  portal  →  Fase 2: batalha com o chefe
// =====================================================================
import { FASES } from "./level-data.js";
import { registrarHeroi } from "./textures.js";
import { criarEntrada } from "./input.js";
import { montarFundo, LARG, ALT } from "./cenario.js";
import { Chefe, criarBarraChefe } from "./chefe.js";
import { Audio } from "../audio.js";
import { texto } from "./texto.js";

const T = 16;
const INATIVO_MS = 60000;
const MAX_CORACOES = 3;
const DURACAO = { turbo: 10000, laser: 15000 };

const FISICA = {
  // gravidade 1000: pulo 400 sobe ~80px (5 blocos); correndo sobe ~90px
  andar: 100, correr: 160, turbo: 1.3,
  pulo: 400, puloCorrendo: 425, puloDuplo: 370, mola: 640, pisao: 430,
  coyote: 110, buffer: 140, quedaMax: 520, corte: 160,
};

export class FaseScene extends Phaser.Scene {
  constructor() { super("fase"); }

  init(data) {
    this.dadosIniciais = data;
    this.jogador = data.jogador;
    this.cb = data.callbacks ?? {};
    this.numFase = data.fase ?? 1;
    this.cfg = FASES[this.numFase];
    const c = data.carry ?? {};
    this.stats = { pontos: c.pontos ?? 0, moedas: c.moedas ?? 0, inimigos: c.inimigos ?? 0, danos: c.danos ?? 0 };
    this.carry = { bonusTempo: c.bonusTempo ?? 0, tempoGasto: c.tempoGasto ?? 0, totalMoedas: c.totalMoedas ?? 0, disquetesTotal: c.disquetesTotal ?? 0 };
    this.disquetes = c.disquetes ?? 0;
    this.coracoes = c.coracoes ?? 3;
    this.tempo = this.cfg.tempo;
    this.inicio = 0;
    this.turboAte = 0;
    this.laserAte = 0;
    this.ultimoTiro = 0;
    this.invencivelAte = 0;
    this.noChaoEm = 0;
    this.puloPedidoEm = -9999;
    this.puloDuploUsado = false;
    this.combo = 0;
    this.acabou = false;
    this.pausado = false;
    this.travado = false;
    this.bateuCima = false;
    this.chefe = null;
  }

  create() {
    const mapa = this.cfg.mapa;
    const W = mapa[0].length * T;
    this.W = W;
    const metal = this.cfg.tema === "servidor";
    this.physics.world.setBounds(0, -200, W, ALT + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.fadeIn(300);
    if (metal) this.cameras.main.setBackgroundColor("#07071a");

    this.atualizarFundo = montarFundo(this, W, this.cfg.tema);

    // ---------- tilemap ----------
    // índices do tileset: 0 grama, 1 terra, 2 pedra, 3 prancha, 4-5 metal, 6-7 grama (variações),
    // 8-9 terra (variações), 10-11 grama na beira de buraco, 12-13 terra na beira, 14-15 pedra (variações)
    const sorte = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 5;
    const solido = (x, y) => x < 0 || x >= mapa[0].length || "#X".includes(mapa[y]?.[x] ?? "#");
    const dados = mapa.map((linha, y) => [...linha].map((ch, x) => {
      const embaixo = y > 0 && "#X".includes(mapa[y - 1][x]);
      if (ch === "#") {
        if (metal) return embaixo ? 5 : 4;
        const topo = !(y > 0 && mapa[y - 1][x] === "#");
        if (!solido(x - 1, y)) return topo ? 10 : 12;
        if (!solido(x + 1, y)) return topo ? 11 : 13;
        return topo ? [0, 0, 6, 7, 0][sorte(x, y)] : [1, 8, 1, 9, 1][sorte(x, y)];
      }
      if (ch === "X") return metal ? 5 : [2, 2, 14, 2, 15][sorte(x, y)];
      if (ch === "-") return 3;
      return -1;
    }));
    const map = this.make.tilemap({ data: dados, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage("tiles", "tiles", T, T, 0, 0);
    this.camada = map.createLayer(0, ts, 0, 0);
    this.camada.setCollision([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    // pranchas "leves": só colidem por cima (atravessa pulando por baixo)
    this.camada.forEachTile((t) => { if (t.index === 3) t.setCollision(false, false, true, false); });

    // ---------- grupos ----------
    const P = this.physics;
    this.blocos = P.add.staticGroup();
    this.moedas = P.add.group({ allowGravity: false, immovable: true });
    this.disquetesGrupo = P.add.group({ allowGravity: false, immovable: true });
    this.inimigos = P.add.group();
    this.espinhos = P.add.staticGroup();
    this.molas = P.add.staticGroup();
    this.moveis = P.add.group({ allowGravity: false, immovable: true });
    this.checkpoints = P.add.staticGroup();
    this.itens = P.add.group();
    this.tiros = P.add.group({ allowGravity: false });
    this.projeteis = P.add.group();
    this.ondas = P.add.group({ allowGravity: false });

    let inicio = { x: 48, y: 180 };
    let posChefe = null;
    const rnd = new Phaser.Math.RandomDataGenerator(["expotech"]);
    let disquetesNaFase = 0;

    mapa.forEach((linha, ty) => [...linha].forEach((ch, tx) => {
      const x = tx * T + T / 2, y = ty * T + T / 2;
      switch (ch) {
        case "@": inicio = { x, y: y - 4 }; break;
        case "K": posChefe = { x, y }; break;
        case "o": {
          const m = this.moedas.create(x, y, "moeda").play({ key: "moeda_gira", startFrame: tx % 6 });
          m.body.setSize(10, 12);
          // sobe e desce em "onda" (cada moeda um pouco atrasada da vizinha)
          this.tweens.add({ targets: m, y: y - 3, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut", delay: (tx % 8) * 90 });
          break;
        }
        case "d": {
          const d = this.disquetesGrupo.create(x, y, "disquete");
          d.body.setSize(12, 12);
          this.tweens.add({ targets: d, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          disquetesNaFase++;
          break;
        }
        case "R": {
          const b = this.blocos.create(x, y, "rachado");
          b.conteudo = "quebra";
          b.cargas = 1;
          break;
        }
        case "E": case "M": case "T": case "H": case "L": {
          const b = this.blocos.create(x, y, "energia").play("energia_brilha");
          b.conteudo = { T: "turbo", H: "coracao", L: "laser" }[ch] ?? "moeda";
          b.cargas = ch === "M" ? 5 : 1;
          b.recarrega = metal; // na arena do chefe os blocos voltam a funcionar
          break;
        }
        case "b": this.criarInimigo(x, y + 2, "bug"); break;
        case "v": this.criarInimigo(x, y, "virus"); break;
        case "^": {
          const e = this.espinhos.create(x, y, "espinhos");
          e.body.setSize(14, 9).setOffset(1, 7);
          break;
        }
        case "s": {
          const m = this.molas.create(x, y, "mola", 0);
          m.body.setSize(14, 10).setOffset(1, 5);
          break;
        }
        case "=": case "|": {
          const p = this.moveis.create(x + 16, y, "plataforma");
          p.body.setFriction(1, 0);
          p.eixo = ch === "=" ? "x" : "y";
          p.min = ch === "=" ? x : y - 56;
          p.max = ch === "=" ? x + T * 7 : y + 40;
          if (p.eixo === "x") p.setVelocityX(45); else p.setVelocityY(-35);
          break;
        }
        case "C": {
          const c = this.checkpoints.create(x, y - 8, "checkpoint", 0);
          c.body.setSize(12, 32);
          break;
        }
        case "P": this.criarPortal(x + 8, (ty + 1) * T); break;
        case "#":
          if (!metal && ty > 0 && mapa[ty - 1][tx] === ".") {
            const r = rnd.frac();
            const chao = ty * T;
            if (r < 0.07) this.add.image(x, chao, "arvore").setOrigin(0.5, 1).setDepth(-2);
            else if (r < 0.17) this.add.image(x, chao, "arbusto").setOrigin(0.5, 1).setDepth(-2);
            else if (r < 0.3) this.add.image(x, chao, `flor_${rnd.between(0, 2)}`).setOrigin(0.5, 1).setDepth(-2);
          }
          break;
      }
    }));
    this.respawn = { ...inicio };
    const moedasFase = this.moedas.countActive() + this.blocos.getChildren().reduce((s, b) => s + (b.conteudo === "moeda" ? b.cargas : 0), 0);
    this.carry.totalMoedas += moedasFase;
    this.carry.disquetesTotal += disquetesNaFase;

    // ---------- herói ----------
    this.heroiKey = registrarHeroi(this, this.jogador);
    this.heroi = P.add.sprite(inicio.x, inicio.y, this.heroiKey, "idle");
    this.heroi.body.setSize(12, 20).setOffset(3, 2);
    this.heroi.setMaxVelocity(400, 900).setDepth(10);
    // O corpo físico fica invisível. Quem aparece é o "heroiVis", que copia tudo dele
    // e ainda estica/achata (squash & stretch) sem bagunçar a colisão.
    this.heroi.setVisible(false);
    this.heroiVis = this.add.sprite(inicio.x, inicio.y, this.heroiKey, "idle").setDepth(10);
    this.deforma = { x: 1, y: 1 };
    this.events.on("postupdate", this.sincronizarHeroi, this);
    this.events.once("shutdown", () => this.events.off("postupdate", this.sincronizarHeroi, this));
    this.etiqueta = texto(this, 0, 0, this.jogador.nome || "HERÓI", { ox: 0.5, oy: 1 }).setDepth(11);

    // ---------- colisões ----------
    P.add.collider(this.heroi, this.camada, () => this.checarCabecada());
    P.add.collider(this.heroi, this.blocos, (_h, b) => this.baterBloco(b));
    P.add.collider(this.heroi, this.moveis, (_h, pl) => { this.plataformaAtual = pl; this.plataformaEm = this.game.loop.time; });
    P.add.collider(this.inimigos, this.camada);
    P.add.collider(this.inimigos, this.blocos);
    P.add.collider(this.itens, this.camada);
    P.add.collider(this.itens, this.blocos);
    P.add.collider(this.projeteis, this.camada, (p) => { if (++p.quiques > 2) p.destroy(); });
    P.add.collider(this.tiros, this.camada, (t) => this.apagarTiro(t));
    P.add.collider(this.tiros, this.blocos, (t, b) => { if (b.conteudo === "quebra") this.quebrarBloco(b, true); this.apagarTiro(t); });
    P.add.overlap(this.heroi, this.moedas, (_h, m) => this.pegarMoeda(m));
    P.add.overlap(this.heroi, this.disquetesGrupo, (_h, d) => this.pegarDisquete(d));
    P.add.overlap(this.heroi, this.inimigos, (_h, i) => this.tocarInimigo(i));
    P.add.overlap(this.heroi, this.espinhos, () => this.tomarDano());
    P.add.overlap(this.heroi, this.molas, (_h, m) => this.usarMola(m));
    P.add.overlap(this.heroi, this.checkpoints, (_h, c) => this.ativarCheckpoint(c));
    P.add.overlap(this.heroi, this.itens, (_h, it) => this.pegarItem(it));
    P.add.overlap(this.heroi, this.projeteis, (_h, p) => { this.tomarDano(p.x); });
    P.add.overlap(this.heroi, this.ondas, (_h, o) => this.tomarDano(o.x));
    P.add.overlap(this.tiros, this.inimigos, (t, e) => { if (!e.morto) { this.derrotar(e, true); this.apagarTiro(t); } });
    if (this.portal) P.add.overlap(this.heroi, this.portal, () => this.passarDeFase());

    // ---------- câmera ----------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, ALT);
    cam.startFollow(this.heroi, true, 0.12, 0.1, 0, 10);
    cam.setDeadzone(30, 60);
    cam.setRoundPixels(true);

    // ---------- partículas ----------
    this.poeira = this.add.particles(0, 0, metal ? "px_branco" : "px_terra", {
      speed: { min: 10, max: 40 }, angle: { min: 200, max: 340 }, lifespan: 300,
      alpha: { start: 1, end: 0 }, gravityY: 60, emitting: false,
    }).setDepth(9);
    this.cacos = this.add.particles(0, 0, "caco", {
      speed: { min: 70, max: 150 }, angle: { min: 210, max: 330 }, gravityY: 700, lifespan: 900,
      rotate: { start: 0, end: 540 }, emitting: false,
    }).setDepth(12);
    this.brilho = this.add.particles(0, 0, "estrela", {
      speed: { min: 30, max: 90 }, lifespan: 450, scale: { start: 1, end: 0 }, emitting: false,
    }).setDepth(12);
    this.faisca = this.add.particles(0, 0, "px_ciano", {
      speed: { min: 5, max: 25 }, lifespan: 300, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(11);

    this.entrada = criarEntrada(this);
    this.criarHUD();

    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.acabou || this.pausado || this.travado || this.chefe?.morto) return;
        this.tempo--;
        if (this.tempo === 30) Audio.sfx("dano");
        if (this.tempo <= 0) { this.tempo = 0; this.morrer(); }
      },
    });

    if (posChefe) {
      this.travado = true;
      // continuar dá vidas cheias
      if (this.dadosIniciais.continues) this.time.delayedCall(500, () => this.aviso("VIDAS CHEIAS!", "#ff9ab3"));
      this.heroi.setFlipX(false);
      Audio.parar();
      Audio.jingle("alerta");
      this.chefe = new Chefe(this, posChefe.x, posChefe.y);
      // o chefe é pesado: atravessa as pranchas leves e fica no chão
      this.physics.add.collider(this.chefe.sprite, this.camada, null, (_s, tile) => tile.index !== 3);
      this.physics.add.overlap(this.heroi, this.chefe.sprite, () => this.tocarChefe());
      this.physics.add.overlap(this.tiros, this.chefe.sprite, (a, b) => {
        const tiro = a === this.chefe.sprite ? b : a;
        this.chefe.levarDano("laser");
        this.apagarTiro(tiro);
      });
      this.time.delayedCall(900, () => this.mostrarFaixa("REI GLITCH", "O CHEFE DOS BUGS", "#ff5a7a"));
      this.chefe.entrar(() => {
        this.travado = false;
        this.barraChefe = criarBarraChefe(this);
        Audio.musica("chefe");
        this.dica("PISE NA CABEÇA DELE QUANDO FICAR TONTO!", "SUBA NAS PRANCHAS PARA DESVIAR DA INVESTIDA");
      });
    } else {
      this.mostrarFaixa(this.cfg.titulo, this.cfg.nome);
      // dica de controles para quem acabou de chegar no estande
      if (this.numFase === 1) {
        const toque = matchMedia("(pointer: coarse)").matches;
        this.time.delayedCall(2500, () => this.dica(
          toque ? "JOYSTICK: ANDAR    A: PULAR" : "SETAS: ANDAR    ESPAÇO: PULAR",
          toque ? "B: CORRER    II: PAUSAR" : "SHIFT: CORRER    ESC: PAUSAR"));
      }
      Audio.jingle("inicio", this.cfg.musica);
    }
  }

  // =================================================================
  vibrar(padrao) { try { if (navigator.vibrate && matchMedia("(pointer: coarse)").matches) navigator.vibrate(padrao); } catch {} }

  // toca um efeito animado (poeira, brilho, impacto, explosão...) e apaga no fim
  fx(key, x, y, { escala = 1, depth = 12, tint, sobe = 0 } = {}) {
    const s = this.add.sprite(Math.round(x), Math.round(y), key).setDepth(depth).setScale(escala);
    if (tint !== undefined) s.setTint(tint);
    s.play(key);
    if (sobe) this.tweens.add({ targets: s, y: y - sobe, duration: 300 });
    s.once("animationcomplete", () => s.destroy());
    return s;
  }

  // estica/achata o herói e volta ao normal (só visual)
  esticar(sx, sy, duracao = 200) {
    this.tweens.killTweensOf(this.deforma);
    this.deforma.x = sx; this.deforma.y = sy;
    this.tweens.add({ targets: this.deforma, x: 1, y: 1, duration: duracao, ease: "Back.out" });
  }

  sincronizarHeroi() {
    const h = this.heroi, v = this.heroiVis;
    if (!h?.active || !v?.active) return;
    v.setFrame(h.frame.name).setFlipX(h.flipX).setAlpha(h.alpha).setAngle(h.angle);
    if (h.angle !== 0 || h.scaleX !== 1) {
      // entrando no portal: gira e encolhe pelo centro
      v.setOrigin(0.5).setScale(h.scaleX, h.scaleY).setPosition(h.x, h.y);
    } else {
      // normal: deforma a partir dos pés
      v.setOrigin(0.5, 1).setScale(this.deforma.x, this.deforma.y).setPosition(Math.round(h.x), Math.round(h.y + h.height / 2));
    }
  }

  ligarAlarme() {
    if (this.alarme) return;
    this.alarme = this.add.rectangle(0, 0, LARG, ALT, 0xff0030, 0).setOrigin(0).setScrollFactor(0).setDepth(90);
    this.tweens.add({ targets: this.alarme, fillAlpha: 0.14, duration: 450, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }
  desligarAlarme() { this.alarme?.destroy(); this.alarme = null; }

  // pausa a física por alguns milissegundos: dá "peso" aos golpes
  congelar(ms) {
    if (this.pausado) return;
    this.physics.world.pause();
    clearTimeout(this.timerCongelar);
    this.timerCongelar = setTimeout(() => { if (!this.pausado && this.physics?.world) this.physics.world.resume(); }, ms);
  }

  criarInimigo(x, y, tipo) {
    const e = this.inimigos.create(x, y, tipo).play(tipo === "bug" ? "bug_anda" : "virus_pisca");
    e.tipo = tipo;
    e.ativo = false;
    e.dir = -1;
    if (tipo === "bug") e.body.setSize(14, 10).setOffset(2, 3);
    else e.body.setSize(12, 12).setOffset(3, 3);
    e.body.setAllowGravity(false);
    return e;
  }

  invocarBug(x, y) {
    const e = this.criarInimigo(x, y, "bug");
    e.ativo = true;
    e.dir = this.heroi.x < x ? -1 : 1;
    e.body.setAllowGravity(true);
    this.brilho.emitParticleAt(x, y, 6);
  }

  criarPortal(x, chao) {
    const giro = this.add.image(x, chao - 22, "portal_giro").setDepth(-1);
    this.tweens.add({ targets: giro, angle: 360, duration: 2400, repeat: -1 });
    this.tweens.add({ targets: giro, scaleX: 0.85, duration: 500, yoyo: true, repeat: -1 });
    this.add.image(x, chao, "portal").setOrigin(0.5, 1).setDepth(-1);
    this.add.particles(x, chao - 22, "px_ciano", {
      speed: { min: 10, max: 30 }, lifespan: 900, frequency: 90,
      emitZone: { type: "edge", source: new Phaser.Geom.Ellipse(0, 0, 30, 44), quantity: 24 },
      alpha: { start: 1, end: 0 },
    }).setDepth(-1);
    this.portal = this.add.zone(x, chao - 20, 20, 40);
    this.physics.add.existing(this.portal, true);
    this.portalX = x;
    this.portalY = chao - 22;
  }

  // ---------- HUD ----------
  criarHUD() {
    const fixo = (o) => o.setScrollFactor(0).setDepth(100);
    const txt = (x, y, s, cor = "#ffffff") => fixo(texto(this, x, y, s, { cor }));
    fixo(this.add.rectangle(0, 0, LARG, 26, 0x1b1b2f, 0.45).setOrigin(0));
    txt(6, 3, String(this.jogador.nome || "HERÓI").slice(0, 12), "#fff35c");
    this.hudPontos = txt(6, 13, "000000");
    this.hudMoedaIcone = fixo(this.add.image(96, 13, "moeda", 0));
    this.hudMoedas = txt(104, 9, "x00");
    this.hudDisquetes = [0, 1, 2].map((i) => fixo(this.add.image(140 + i * 13, 13, "disquete").setAlpha(0.25)));
    this.hudCoracoes = Array.from({ length: MAX_CORACOES }, (_, i) => fixo(this.add.image(188 + i * 11, 13, "coracao")));
    // barras de poder (turbo / laser)
    this.barras = {};
    [["turbo", "TURBO", 0x45e070, "#45e070", 3], ["laser", "LASER", 0x2fe0d0, "#2fe0d0", 14]].forEach(([k, nome, cor, corTxt, y]) => {
      const rot = txt(226, y, nome, corTxt);
      const fundo = fixo(this.add.rectangle(258, y + 1, 42, 7, 0x1b1b2f).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.6));
      const barra = fixo(this.add.rectangle(259, y + 2, 40, 5, cor).setOrigin(0));
      this.barras[k] = { objs: [rot, fundo, barra], barra };
    });
    txt(LARG - 62, 3, "TEMPO", "#fff35c");
    this.hudTempo = txt(LARG - 62, 13, String(this.tempo));
  }

  atualizarHUD() {
    this.hudPontos.trocar(String(this.stats.pontos).padStart(6, "0"));
    if (this.pontosBrancoEm && this.game.loop.time > this.pontosBrancoEm) { this.hudPontos.cor("#ffffff"); this.pontosBrancoEm = 0; }
    this.hudMoedas.trocar("x" + String(this.stats.moedas).padStart(2, "0"));
    this.hudTempo.trocar(String(this.tempo).padStart(3, "0")).cor(this.tempo <= 30 ? "#ff5a7a" : "#ffffff");
    this.hudCoracoes.forEach((c, i) => c.setTexture(i < this.coracoes ? "coracao" : "coracao_vazio"));
    this.hudDisquetes.forEach((d, i) => d.setAlpha(i < this.disquetes ? 1 : 0.25));
    const agora = this.game.loop.time;
    for (const k of ["turbo", "laser"]) {
      const resta = this[`${k}Ate`] - agora;
      const on = resta > 0;
      this.barras[k].objs.forEach((o) => o.setVisible(on));
      if (on) this.barras[k].barra.width = Math.max(1, 40 * (resta / DURACAO[k]));
    }
    this.barraChefe?.atualizar(this.chefe?.vida ?? 0);
  }

  mostrarFaixa(titulo, sub, cor = "#fff35c") {
    const c = this.add.container(Math.floor(LARG / 2), ALT / 2 - 30).setScrollFactor(0).setDepth(120);
    const corNum = parseInt(cor.slice(1), 16);
    const fundo = this.add.rectangle(0, 0, 260, 48, 0x1b1b2f, 1).setStrokeStyle(2, corNum);
    const t1 = texto(this, 0, -3, titulo, { cor, escala: 2, ox: 0.5, oy: 0.5 });
    const t2 = texto(this, 0, 14, sub, { ox: 0.5, oy: 0.5 });
    c.add([fundo, t1, t2]);
    c.setScale(0, 1);
    this.tweens.chain({
      targets: c,
      tweens: [
        { scaleX: 1, duration: 260, ease: "Back.out" },
        { scaleX: 0, duration: 200, delay: 1700, ease: "Quad.in", onComplete: () => c.destroy() },
      ],
    });
  }

  // dica no rodapé da tela (some sozinha)
  dica(l1, l2) {
    const c = this.add.container(Math.floor(LARG / 2), ALT - 20).setScrollFactor(0).setDepth(110);
    c.add(this.add.rectangle(0, 0, 300, l2 ? 28 : 16, 0x1b1b2f, 0.85).setStrokeStyle(1, 0x5ef0ff));
    c.add(texto(this, 0, l2 ? -6 : 0, l1, { cor: "#5ef0ff", ox: 0.5, oy: 0.5 }));
    if (l2) c.add(texto(this, 0, 6, l2, { ox: 0.5, oy: 0.5 }));
    c.setAlpha(0);
    this.tweens.chain({ targets: c, tweens: [{ alpha: 1, duration: 300 }, { alpha: 0, duration: 400, delay: 5000, onComplete: () => c.destroy() }] });
  }

  // texto que sobe e some (pontos, combo)
  popTexto(x, y, s, cor = "#ffffff", duracao = 1100) {
    const t = texto(this, x, y, s, { cor, ox: 0.5, oy: 0.5 }).setDepth(50);
    this.tweens.chain({
      targets: t,
      tweens: [
        { y: y - 16, duration: duracao * 0.45, ease: "Quad.out" },
        { y: y - 24, alpha: 0, duration: duracao * 0.55, ease: "Quad.in", onComplete: () => t.destroy() },
      ],
    });
  }

  // aviso fixo no alto da tela (itens, checkpoint): fica ~2,5s e dá para ler com calma
  aviso(msg, cor = "#ffffff") {
    this.avisos = (this.avisos ?? []).filter((a) => a.active);
    const y = (this.chefe ? 60 : 36) + this.avisos.length * 16;
    const c = this.add.container(Math.floor(LARG / 2), y).setScrollFactor(0).setDepth(115);
    const t = texto(this, 0, 0, msg, { cor, ox: 0.5, oy: 0.5 });
    const fundo = this.add.rectangle(0, 0, t.width + 14, 14, 0x1b1b2f, 0.9).setStrokeStyle(1, parseInt(cor.slice(1), 16));
    c.add([fundo, t]);
    c.setScale(0.6).setAlpha(0);
    this.avisos.push(c);
    this.tweens.chain({
      targets: c,
      tweens: [
        { scale: 1, alpha: 1, duration: 180, ease: "Back.out" },
        { alpha: 0, y: y - 8, duration: 400, delay: 2400, onComplete: () => c.destroy() },
      ],
    });
  }

  somarPontos(n, x, y) {
    this.stats.pontos += n;
    // o placar pisca em amarelo quando sobe
    this.hudPontos?.cor("#fff35c");
    this.pontosBrancoEm = this.game.loop.time + 180;
    if (x !== undefined) this.popTexto(x, y, String(n));
  }

  // =================================================================
  pegarMoeda(m) {
    m.disableBody(true, true);
    this.stats.moedas++;
    this.somarPontos(100);
    this.fx("fx_brilho", m.x, m.y);
    this.pularIcone(this.hudMoedaIcone);
    Audio.sfx("moeda");
  }

  // o coração perdido "cai" do HUD
  animarCoracaoPerdido() {
    const icone = this.hudCoracoes[this.coracoes];
    if (!icone) return;
    this.pularIcone(icone, 1.8);
    const caindo = this.add.image(icone.x, icone.y, "coracao").setScrollFactor(0).setDepth(101);
    this.tweens.add({ targets: caindo, y: icone.y + 34, x: icone.x + Phaser.Math.Between(-10, 10), angle: 160, alpha: 0, duration: 650, ease: "Quad.in", onComplete: () => caindo.destroy() });
  }

  // dá um "pulinho" num ícone do HUD
  pularIcone(icone, escala = 1.5) {
    if (!icone) return;
    this.tweens.killTweensOf(icone);
    icone.setScale(escala);
    this.tweens.add({ targets: icone, scale: 1, duration: 220, ease: "Back.out" });
  }

  pegarDisquete(d) {
    d.disableBody(true, true);
    this.disquetes++;
    this.somarPontos(2000, d.x, d.y - 10);
    this.brilho.emitParticleAt(d.x, d.y, 14);
    this.fx("fx_brilho", d.x, d.y, { escala: 2 });
    this.pularIcone(this.hudDisquetes[this.disquetes - 1], 1.8);
    this.aviso(`DISQUETE ${this.disquetes}/3 ENCONTRADO!`, "#5ef0ff");
    Audio.sfx("disquete");
    this.vibrar(40);
  }

  checarCabecada() {
    if (this.heroi.body.blocked.up && !this.bateuCima) {
      this.bateuCima = true;
      Audio.sfx("bater");
    }
  }

  baterBloco(b) {
    const h = this.heroi.body;
    if (!(h.blocked.up || h.touching.up) || b.y > this.heroi.y) return;
    if (this.bateuCima) return;
    this.bateuCima = true;
    if (b.conteudo === "quebra") { this.quebrarBloco(b); return; }
    if (b.cargas <= 0) { Audio.sfx("bater"); return; }
    b.cargas--;
    this.vibrar(15);
    this.tweens.add({ targets: b, y: b.y - 5, duration: 70, yoyo: true, onComplete: () => b.refreshBody() });
    this.fx("fx_impacto", b.x, b.y + 8, { depth: 11 });
    this.somarPontos(50);
    // empurra inimigos que estiverem em cima do bloco
    this.inimigos.getChildren().forEach((e) => {
      if (e.active && !e.morto && Math.abs(e.x - b.x) < 14 && Math.abs(e.body.bottom - b.body.top) < 4) this.derrotar(e, true);
    });
    if (b.conteudo === "moeda") {
      Audio.sfx("moeda");
      this.stats.moedas++;
      this.somarPontos(100);
      this.pularIcone(this.hudMoedaIcone);
      const m = this.add.sprite(b.x, b.y - 12, "moeda").play({ key: "moeda_gira", frameRate: 24 }).setDepth(5);
      this.tweens.add({ targets: m, y: b.y - 44, duration: 260, yoyo: true, ease: "Quad.out", onComplete: () => { this.fx("fx_brilho", m.x, m.y); m.destroy(); } });
    } else {
      Audio.sfx("bloco");
      const tex = { turbo: "bateria", coracao: "coracao_item", laser: "chip_laser" }[b.conteudo];
      const it = this.itens.create(b.x, b.y - 2, tex).setDepth(-0.5);
      it.tipo = b.conteudo;
      it.body.setAllowGravity(false);
      this.tweens.add({
        targets: it, y: b.y - 16, duration: 450,
        onComplete: () => {
          it.setDepth(5);
          it.body.setAllowGravity(true);
          if (it.tipo === "turbo") it.setVelocityX(55).setBounce(0.2);
          else {
            // coração e chip pulam para fora do bloco e param no chão (fácil de pegar)
            // escolhe o lado sem bloco vizinho (senão o item fica preso em cima dele)
            const vizinho = (dx) => this.blocos.getChildren().some((o) => o.active && Math.abs(o.x - (b.x + dx)) < 4 && Math.abs(o.y - b.y) < 4)
              || this.camada.getTileAtWorldXY(b.x + dx, b.y)?.collides;
            let lado = this.heroi.x <= b.x ? -1 : 1;
            if (vizinho(16 * lado) && !vizinho(-16 * lado)) lado = -lado;
            it.setVelocity(105 * lado, -170).setBounce(0.35).setDragX(80);
          }
        },
      });
    }
    if (b.cargas <= 0) {
      b.anims.stop();
      b.setTexture("usado");
      if (b.recarrega) {
        this.time.delayedCall(b.conteudo === "coracao" ? 8000 : 12000, () => {
          if (!b.active) return;
          b.cargas = 1;
          b.setTexture("energia").play("energia_brilha");
          this.brilho.emitParticleAt(b.x, b.y, 6);
        });
      }
    }
  }

  quebrarBloco(b, porTiro = false) {
    this.inimigos.getChildren().forEach((e) => {
      if (e.active && !e.morto && Math.abs(e.x - b.x) < 14 && Math.abs(e.body.bottom - b.body.top) < 4) this.derrotar(e, true);
    });
    this.cacos.emitParticleAt(b.x, b.y, 8);
    this.fx("fx_poeira", b.x, b.y, { escala: 2 });
    this.somarPontos(50, b.x, b.y - 10);
    Audio.sfx("quebrar");
    this.vibrar(25);
    b.destroy();
    if (!porTiro) this.heroi.setVelocityY(Math.max(this.heroi.body.velocity.y, 40));
  }

  pegarItem(it) {
    if (!it.active) return;
    const tipo = it.tipo ?? "turbo";
    if (tipo === "trofeu") { this.pegarTrofeu(); return; }
    it.destroy();
    const agora = this.game.loop.time;
    this.brilho.emitParticleAt(this.heroi.x, this.heroi.y, 12);
    this.fx("fx_brilho", this.heroi.x, this.heroi.y - 4, { escala: 3 });
    this.fx("fx_anel", this.heroi.x, this.heroi.body.bottom - 3);
    this.esticar(0.8, 1.25, 260);
    this.vibrar(50);
    if (tipo === "turbo") {
      Audio.sfx("turbo");
      this.turboAte = agora + DURACAO.turbo;
      this.somarPontos(1000, this.heroi.x, this.heroi.y - 20);
      this.aviso("CHIP TURBO! VELOCIDADE E PULO DUPLO", "#45e070");
      Audio.turbo(true);
      this.cameras.main.flash(150, 120, 255, 160);
    } else if (tipo === "laser") {
      Audio.sfx("turbo");
      this.laserAte = agora + DURACAO.laser;
      this.aviso("CHIP LASER! ATIRE COM B / X", "#5ef0ff");
      this.cameras.main.flash(150, 90, 240, 255);
    } else if (tipo === "coracao") {
      Audio.sfx("coracao");
      if (this.coracoes < MAX_CORACOES) { this.coracoes++; this.aviso("+1 VIDA!", "#ff9ab3"); }
      else { this.somarPontos(1000, this.heroi.x, this.heroi.y - 20); this.aviso("VIDA CHEIA: +1000 PONTOS", "#ff9ab3"); }
    }
  }

  atirar() {
    const agora = this.game.loop.time;
    if (agora - this.ultimoTiro < 220 || this.tiros.countActive() >= 3) return;
    this.ultimoTiro = agora;
    const dir = this.heroi.flipX ? -1 : 1;
    const t = this.tiros.create(this.heroi.x + dir * 10, this.heroi.y + 1, "laser").setDepth(9).setFlipX(dir < 0);
    t.body.setSize(10, 4);
    t.setVelocityX(330 * dir);
    t.nasceu = agora;
    Audio.sfx("laser");
    this.faisca.emitParticleAt(t.x, t.y, 4);
    this.vibrar(10);
  }

  apagarTiro(t) {
    if (!t.active) return;
    this.faisca.emitParticleAt(t.x, t.y, 5);
    this.fx("fx_brilho", t.x, t.y);
    t.destroy();
  }

  usarMola(m) {
    const h = this.heroi.body;
    if (h.velocity.y < -20 || h.bottom > m.body.top + 13) return;
    this.heroi.setVelocityY(-FISICA.mola);
    this.impulsoLivre = true; // a mola não é cortada ao soltar o botão
    this.puloDuploUsado = false;
    m.play("mola_pula");
    Audio.sfx("mola");
    this.vibrar(30);
    this.fx("fx_anel", m.x, m.body.top + 2);
    this.esticar(0.65, 1.45, 320);
  }

  ativarCheckpoint(c) {
    if (c.ativo) return;
    c.ativo = true;
    c.play("checkpoint_ativo");
    this.fx("fx_brilho", c.x, c.y - 14, { escala: 2 });
    this.respawn = { x: c.x, y: c.y - 4 };
    this.somarPontos(500, c.x, c.y - 24);
    this.aviso("CHECKPOINT SALVO!", "#45e070");
    this.brilho.emitParticleAt(c.x, c.y - 14, 10);
    Audio.sfx("salvo");
  }

  tocarInimigo(e) {
    if (e.morto || this.acabou) return;
    const h = this.heroi.body;
    if (this.game.loop.time < this.turboAte) { this.derrotar(e, true); return; }
    const pisou = e.tipo === "bug" && h.velocity.y > 0 && h.bottom <= e.body.top + 7;
    if (pisou) {
      this.derrotar(e, false);
      this.combo++;
      this.fx("fx_impacto", e.x, e.body.top);
      this.esticar(0.8, 1.25);
      this.congelar(45);
      this.vibrar(20);
      this.heroi.setVelocityY(this.entrada.ler().pulo ? -390 : -260);
      if (this.combo >= 2) this.popTexto(this.heroi.x, this.heroi.y - 30, `COMBO x${this.combo}`, "#fff35c", 1400);
    } else {
      this.tomarDano(e.x);
    }
  }

  tocarChefe() {
    const c = this.chefe;
    if (!c || c.morto || c.estado === "intro" || this.acabou) return;
    const h = this.heroi.body;
    const pisou = h.velocity.y > 0 && h.bottom <= c.sprite.body.top + 12;
    if (pisou) {
      c.levarDano("pisao");
      this.esticar(0.75, 1.3, 260);
      // depois de pisar, o herói não se machuca com o pulo de fuga do chefe
      this.invencivelAte = Math.max(this.invencivelAte, this.game.loop.time + 700);
      this.vibrar(60);
      this.impulsoLivre = true;
      this.heroi.setVelocityY(-FISICA.pisao);
      this.heroi.setVelocityX(this.heroi.x < c.sprite.x ? -120 : 120);
    } else {
      this.tomarDano(c.sprite.x);
    }
  }

  derrotar(e, voando) {
    e.morto = true;
    this.stats.inimigos++;
    const valor = 200 * Math.max(1, 2 ** Math.min(this.combo, 4));
    this.somarPontos(voando ? 200 : valor, e.x, e.y - 12);
    this.brilho.emitParticleAt(e.x, e.y, 6);
    Audio.sfx("pisar");
    if (!voando && e.tipo === "bug") {
      e.anims.stop();
      e.setTexture("bug_esmagado").setOrigin(0.5, 0);
      e.body.enable = false;
      e.y = e.body.bottom - 5;
      this.time.delayedCall(450, () => { if (e.active) { this.fx("fx_poeira", e.x, e.y + 2, { escala: 2 }); e.destroy(); } });
    } else {
      e.body.checkCollision.none = true;
      this.fx("fx_impacto", e.x, e.y);
      e.setFlipY(true).setVelocity(this.heroi.x < e.x ? 60 : -60, -220);
      this.tweens.add({ targets: e, angle: this.heroi.x < e.x ? 360 : -360, duration: 900 });
      e.body.setAllowGravity(true);
      this.time.delayedCall(1500, () => e.destroy());
    }
  }

  tomarDano(origemX) {
    const agora = this.game.loop.time;
    if (this.acabou || this.travado || agora < this.invencivelAte || agora < this.turboAte) return;
    this.coracoes--;
    this.animarCoracaoPerdido();
    this.stats.danos++;
    this.cameras.main.shake(180, 0.012);
    this.vibrar(120);
    if (this.coracoes <= 0) { this.morrer(); return; }
    Audio.sfx("dano");
    this.congelar(60);
    this.fx("fx_impacto", this.heroi.x, this.heroi.y, { escala: 2 });
    this.esticar(1.3, 0.75, 300);
    this.danoVisualAte = agora + 450;
    this.invencivelAte = agora + 1600;
    const lado = origemX !== undefined && origemX > this.heroi.x ? -1 : 1;
    this.heroi.setVelocity(150 * lado, -220);
    this.tweens.add({ targets: this.heroi, alpha: 0.2, duration: 90, yoyo: true, repeat: 8, onComplete: () => this.heroi.setAlpha(1) });
  }

  caiuNoBuraco() {
    if (this.acabou) return;
    this.coracoes--;
    this.animarCoracaoPerdido();
    this.stats.danos++;
    this.vibrar(120);
    if (this.coracoes <= 0) { this.morrer(); return; }
    Audio.sfx("dano");
    this.heroi.setVelocity(0, 0);
    this.heroi.setPosition(this.respawn.x, this.respawn.y - 20);
    this.invencivelAte = this.game.loop.time + 1600;
    this.tweens.add({ targets: this.heroi, alpha: 0.2, duration: 90, yoyo: true, repeat: 8, onComplete: () => this.heroi.setAlpha(1) });
    this.cameras.main.flash(200, 255, 255, 255);
  }

  morrer() {
    if (this.acabou) return;
    this.acabou = true;
    this.coracoes = Math.max(0, this.coracoes);
    this.atualizarHUD();
    Audio.jingle("derrota");
    this.heroi.body.checkCollision.none = true;
    this.heroi.setVelocity(0, -300).setAccelerationX(0);
    this.heroi.anims.stop();
    this.heroi.setFrame("hurt");
    this.heroiVis.setTint(0xff9ab3);
    this.fx("fx_impacto", this.heroi.x, this.heroi.y, { escala: 2 });
    this.etiqueta.setVisible(false);
    const continues = this.dadosIniciais.continues ?? 0;
    this.time.delayedCall(2200, () => {
      if (this.chefe && continues < 2) this.perguntarContinuar(continues);
      else this.finalizar(false);
    });
  }

  // Arcade: perdeu para o chefe? Pode tentar a batalha de novo (até 2 vezes)
  perguntarContinuar(continues) {
    let n = 10;
    const fim = () => { this.timerContinuar?.remove(); this.fecharMenu(); };
    this.abrirMenu("CONTINUAR?", [
      ["SIM! TENTAR DE NOVO", () => {
        fim();
        this.scene.restart({ ...this.dadosIniciais, continues: continues + 1, carry: { ...this.dadosIniciais.carry, danos: this.stats.danos, coracoes: MAX_CORACOES } });
      }],
      ["NÃO, VER RESULTADO", () => { fim(); this.finalizar(false); }],
    ], `${n}`, "#ff5a7a");
    Audio.sfx("menu");
    this.timerContinuar = this.time.addEvent({
      delay: 1000, repeat: 9, callback: () => {
        n--;
        this.menuAtivo?.rodape.trocar(String(n));
        Audio.sfx("menu");
        if (n <= 0) { fim(); this.finalizar(false); }
      },
    });
  }

  // Fase 1 → entra no portal → vai para a arena do chefe
  passarDeFase() {
    if (this.acabou) return;
    this.acabou = true;
    Audio.sfx("portal");
    Audio.jingle("vitoria");
    this.heroi.body.enable = false;
    this.etiqueta.setVisible(false);
    this.tweens.add({
      targets: this.heroi, x: this.portalX, y: this.portalY, angle: 720, scale: 0, duration: 900, ease: "Quad.in",
      onComplete: () => { this.brilho.emitParticleAt(this.portalX, this.portalY, 24); this.fx("fx_brilho", this.portalX, this.portalY, { escala: 4 }); },
    });
    this.carry.bonusTempo += this.tempo * 20;
    this.carry.tempoGasto += (this.game.loop.time - this.inicio) / 1000;
    this.time.delayedCall(1700, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({
          jogador: this.jogador, callbacks: this.cb, fase: this.numFase + 1,
          carry: {
            ...this.stats, ...this.carry, coracoes: this.coracoes, disquetes: this.disquetes,
          },
        });
      });
    });
  }

  // Chefe derrotado: cai um troféu; pegar o troféu = vitória
  chefeDerrotado() {
    this.barraChefe?.esconder();
    this.time.delayedCall(700, () => {
      // nasce logo abaixo do teto da arena e cai no chão
      const tr = this.itens.create(this.W / 2, 34, "trofeu").setDepth(6);
      tr.tipo = "trofeu";
      tr.body.setSize(16, 18);
      tr.setVelocityY(60);
      this.cameras.main.flash(200, 255, 240, 150);
      this.brilho.emitParticleAt(tr.x, tr.y, 14);
      this.aviso("PEGUE O TROFÉU!", "#fff35c");
      // se ninguém pegar em 5s, o troféu vai até o herói
      this.time.delayedCall(5000, () => {
        if (!tr.active || this.acabou) return;
        tr.body.setAllowGravity(false);
        this.tweens.add({ targets: tr, x: this.heroi.x, y: this.heroi.y, duration: 700, ease: "Quad.inOut", onComplete: () => this.pegarTrofeu() });
      });
      this.add.particles(0, 0, "estrela", {
        follow: tr, speed: { min: 10, max: 40 }, lifespan: 600, frequency: 120, scale: { start: 1, end: 0 },
      }).setDepth(5);
      this.trofeu = tr;
    });
  }

  pegarTrofeu() {
    if (this.acabou) return;
    this.acabou = true;
    this.trofeu.destroy();
    this.heroi.body.enable = false;
    this.heroi.anims.stop();
    this.heroi.setFrame("win");
    this.fx("fx_brilho", this.heroi.x, this.heroi.y - 18, { escala: 4 });
    for (let i = 0; i < 6; i++) this.time.delayedCall(300 + i * 350, () => this.fx("fx_brilho", this.heroi.x + Phaser.Math.Between(-40, 40), this.heroi.y - Phaser.Math.Between(10, 50), { escala: 2 }));
    Audio.jingle("campeao");
    this.vibrar([60, 40, 60, 40, 200]);
    this.cameras.main.flash(300, 255, 240, 120);
    this.brilho.emitParticleAt(this.heroi.x, this.heroi.y, 30);
    this.tweens.add({ targets: this.heroi, y: this.heroi.y - 20, duration: 300, yoyo: true, repeat: 2, ease: "Quad.out" });
    this.mostrarFaixa("VITÓRIA!", "A EXPOTECH ESTÁ SALVA!");
    this.time.delayedCall(3200, () => this.finalizar(true));
  }

  finalizar(venceu) {
    const tempoFase = this.inicio ? (this.game.loop.time - this.inicio) / 1000 : 0;
    const tempoSeg = Math.round(this.carry.tempoGasto + tempoFase);
    const bonusTempo = this.carry.bonusTempo + (venceu ? this.tempo * 20 : 0);
    const bonusVidas = venceu ? this.coracoes * 1000 : 0;
    const bonusFase = this.numFase >= 2 ? 5000 : 0;
    const total = this.stats.pontos + bonusTempo + bonusVidas + bonusFase;
    this.cb.onFim?.({
      venceu,
      pontosBase: this.stats.pontos, bonusTempo, bonusVidas, bonusFase,
      pontos: total,
      moedas: this.stats.moedas,
      totalMoedas: this.carry.totalMoedas,
      inimigos: this.stats.inimigos,
      tempo_seg: tempoSeg,
      vidas_restantes: this.coracoes,
      sem_dano: this.stats.danos === 0,
      fase_alcancada: this.numFase,
      chefe_derrotado: venceu,
      disquetes: this.disquetes,
      continues: this.dadosIniciais.continues ?? 0,
    });
  }

  // ---------- menus (pausa / continuar) ----------
  alternarPausa() {
    this.pausado = !this.pausado;
    if (this.pausado) {
      this.physics.world.pause(); this.anims.pauseAll(); this.tweens.pauseAll();
      this.abrirMenu("PAUSA", [
        ["CONTINUAR", () => this.alternarPausa()],
        ["RECOMEÇAR FASE", () => this.recomecar()],
        ["SAIR DO JOGO", () => this.sair()],
      ], "ESC / START: CONTINUAR");
      Audio.sfx("menu");
      this.cb.onPausa?.(true);
    } else {
      this.physics.world.resume(); this.anims.resumeAll(); this.tweens.resumeAll();
      this.fecharMenu();
      this.cb.onPausa?.(false);
    }
  }

  abrirMenu(titulo, opcoes, rodape, cor = "#fff35c") {
    this.fecharMenu();
    const c = this.add.container(Math.floor(LARG / 2), Math.floor(ALT / 2)).setScrollFactor(0).setDepth(200);
    c.add(this.add.rectangle(0, 0, LARG, ALT, 0x1b1b2f, 0.7));
    c.add(texto(this, 0, -58, titulo, { cor, escala: 2, ox: 0.5, oy: 0.5 }));
    const itens = opcoes.map(([rotulo, acao], i) => {
      const y = -22 + i * 26;
      const fundo = this.add.rectangle(0, y, 170, 20, 0x2a2a4a).setStrokeStyle(1, 0xffffff, 0.4)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => { Audio.sfx("ok"); acao(); });
      const t = texto(this, 0, y, rotulo, { ox: 0.5, oy: 0.5 });
      c.add([fundo, t]);
      return { fundo, t, acao };
    });
    const rod = texto(this, 0, 64, rodape ?? "", { cor: "#9aa3b8", ox: 0.5, oy: 0.5, escala: rodape?.length < 3 ? 2 : 1 });
    c.add(rod);
    this.menuAtivo = { c, itens, sel: 0, rodape: rod };
    this.marcarMenu();
  }

  marcarMenu() {
    const m = this.menuAtivo;
    m.itens.forEach((o, i) => {
      const sel = i === m.sel;
      o.fundo.setFillStyle(sel ? 0x3a8bff : 0x2a2a4a).setStrokeStyle(sel ? 2 : 1, sel ? 0xfff35c : 0xffffff, sel ? 1 : 0.4);
      o.t.cor(sel ? "#fff35c" : "#ffffff");
    });
  }

  fecharMenu() {
    this.menuAtivo?.c.destroy();
    this.menuAtivo = null;
  }

  navegarMenu(inp) {
    const m = this.menuAtivo;
    if (inp.cimaAgora || inp.baixoAgora) {
      m.sel = (m.sel + (inp.cimaAgora ? -1 : 1) + m.itens.length) % m.itens.length;
      this.marcarMenu();
      Audio.sfx("menu");
    }
    if (inp.okAgora || (inp.puloAgora && !inp.cimaAgora)) {
      Audio.sfx("ok");
      m.itens[m.sel].acao();
    }
  }

  recomecar() {
    this.fecharMenu();
    this.pausado = false;
    this.physics.world.resume(); this.anims.resumeAll(); this.tweens.resumeAll();
    this.cb.onPausa?.(false);
    this.scene.restart(this.dadosIniciais);
  }

  sair() {
    this.fecharMenu();
    this.pausado = false;
    this.acabou = true;
    this.cb.onSair?.();
  }

  // =================================================================
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.atualizarFundo(dt);
    const inp = this.entrada.ler();

    if (!this.inicio && !this.travado) this.inicio = time;
    if (time - this.entrada.ultimoInput > INATIVO_MS && !this.acabou) {
      this.acabou = true;
      this.cb.onInativo?.();
      return;
    }
    if (inp.pausaAgora && !this.acabou) { this.alternarPausa(); return; }
    if (this.menuAtivo) { this.navegarMenu(inp); if (this.pausado) return; }
    if (!this.physics?.world) return; // a cena foi encerrada pelo menu neste mesmo quadro
    if (this.physics.world.isPaused) return; // congelamento rápido (impacto)

    // plataformas móveis
    this.moveis.getChildren().forEach((p) => {
      if (p.eixo === "x") {
        if (p.x >= p.max) p.setVelocityX(-45); else if (p.x <= p.min) p.setVelocityX(45);
      } else if (p.y <= p.min) p.setVelocityY(35); else if (p.y >= p.max) p.setVelocityY(-35);
    });

    this.atualizarInimigos();
    this.chefe?.update();
    this.itens.getChildren().forEach((it) => {
      if (it.tipo === "turbo") {
        if (it.body.blocked.right) it.setVelocityX(-55);
        else if (it.body.blocked.left) it.setVelocityX(55);
      }
      if (it.y > ALT + 40) it.destroy();
    });
    this.tiros.getChildren().forEach((t) => { if (time - t.nasceu > 650) this.apagarTiro(t); });
    this.ondas.getChildren().forEach((o) => { if (o.x < 20 || o.x > this.W - 20) { this.poeira.emitParticleAt(o.x, o.y, 4); o.destroy(); } });

    if (this.acabou) { this.atualizarHUD(); return; }

    const h = this.heroi;
    const b = h.body;

    if (this.travado) {
      h.setVelocityX(b.velocity.x * 0.8);
      h.play(`${this.heroiKey}_parado`, true);
      this.etiqueta.posicionar(h.x, b.top - 2);
      this.atualizarHUD();
      return;
    }

    const noChao = b.blocked.down || b.touching.down;
    const turbo = time < this.turboAte;
    const laser = time < this.laserAte;

    if (noChao) {
      if (time - this.noChaoEm > 120 && b.velocity.y >= 0 && this.estavaNoAr) {
        // aterrissou: poeira, achatadinha e (se caiu de alto) anel de impacto
        const forca = this.vyAnterior ?? 0;
        this.fx("fx_poeira", h.x, b.bottom - 5, { depth: 9 });
        if (forca > 200) this.esticar(1.28, 0.74);
        if (forca > 420) { this.fx("fx_anel", h.x, b.bottom - 3, { depth: 9 }); this.vibrar(15); }
      }
      this.noChaoEm = time;
      // em cima de plataforma que desce: acompanha a descida (sem trepidar)
      const pl = this.plataformaAtual;
      if (pl?.active && time - this.plataformaEm < 60 && pl.eixo === "y" && pl.body.velocity.y > 0 && b.velocity.y >= 0) h.setVelocityY(pl.body.velocity.y + 10);
      this.puloDuploUsado = false;
      this.combo = 0;
    }
    this.estavaNoAr = !noChao;
    this.vyAnterior = b.velocity.y;
    if (!b.blocked.up) this.bateuCima = false;

    // movimento horizontal com aceleração suave
    let alvo = 0;
    const vmax = (inp.correr ? FISICA.correr : FISICA.andar) * (turbo ? FISICA.turbo : 1);
    if (inp.esq) alvo -= vmax;
    if (inp.dir) alvo += vmax;
    const k = Math.min(1, dt * (noChao ? 14 : 7));
    h.setVelocityX(b.velocity.x + (alvo - b.velocity.x) * k);
    if (alvo !== 0) h.setFlipX(alvo < 0);

    // câmera olha um pouco à frente para onde o herói vai
    const cam = this.cameras.main;
    const alvoCam = Math.abs(b.velocity.x) > 40 ? (h.flipX ? 28 : -28) : 0;
    cam.followOffset.x += (alvoCam - cam.followOffset.x) * Math.min(1, dt * 2.5);

    // pulo com "coyote time" e "buffer" (deixa o controle gostoso)
    if (inp.puloAgora) this.puloPedidoEm = time;
    const podePular = time - this.noChaoEm < FISICA.coyote;
    if (time - this.puloPedidoEm < FISICA.buffer && podePular) {
      h.setVelocityY(-(Math.abs(b.velocity.x) > 130 ? FISICA.puloCorrendo : FISICA.pulo));
      this.noChaoEm = -9999;
      this.puloPedidoEm = -9999;
      this.fx("fx_poeira", h.x, b.bottom - 5, { depth: 9 });
      this.esticar(0.78, 1.26, 240);
      Audio.sfx("pulo");
    } else if (inp.puloAgora && turbo && !noChao && !this.puloDuploUsado) {
      h.setVelocityY(-FISICA.puloDuplo);
      this.puloDuploUsado = true;
      this.fx("fx_anel", h.x, b.bottom);
      this.esticar(0.78, 1.26, 240);
      this.brilho.emitParticleAt(h.x, b.bottom, 6);
      Audio.sfx("puloDuplo");
    }
    if (b.velocity.y >= 0) this.impulsoLivre = false;
    if (b.velocity.y > FISICA.quedaMax) h.setVelocityY(FISICA.quedaMax); // limita só a queda
    if (!inp.pulo && !this.impulsoLivre && b.velocity.y < -FISICA.corte) h.setVelocityY(-FISICA.corte);

    // laser
    if (laser) {
      if (inp.acaoAgora) this.atirar();
      if (Math.random() < 0.15) this.faisca.emitParticleAt(h.x + Phaser.Math.Between(-6, 6), h.y + Phaser.Math.Between(-8, 8), 1);
    }

    // animação: dano > ar (subindo/caindo) > correndo > parado
    h.anims.timeScale = 1;
    if (time < (this.danoVisualAte ?? 0)) { h.anims.stop(); h.setFrame("hurt"); }
    else if (!noChao) h.play(`${this.heroiKey}_${b.velocity.y > 60 ? "queda" : "pulo"}`, true);
    else if (Math.abs(b.velocity.x) > 12) {
      h.play(`${this.heroiKey}_andar`, true);
      h.anims.timeScale = Phaser.Math.Clamp(Math.abs(b.velocity.x) / 95, 0.6, 2);
      // freada: virou para o lado contrário ainda em velocidade → poeira
      const freando = alvo !== 0 && Math.sign(alvo) !== Math.sign(b.velocity.x) && Math.abs(b.velocity.x) > 60;
      if ((freando || (inp.correr && Math.abs(b.velocity.x) > 140)) && time - (this.ultimaPoeiraEm ?? 0) > (freando ? 90 : 220)) {
        this.ultimaPoeiraEm = time;
        this.fx("fx_poeira", h.x - Math.sign(b.velocity.x) * 6, b.bottom - 5, { depth: 9 });
      }
    } else h.play(`${this.heroiKey}_parado`, true);

    // efeito turbo: rastro colorido
    if (turbo) {
      if (!this.ultimoRastro || time - this.ultimoRastro > 50) {
        this.ultimoRastro = time;
        const fantasma = this.add.image(h.x, h.y, h.texture.key, h.frame.name).setFlipX(h.flipX).setDepth(9)
          .setTint(Phaser.Display.Color.HSVToRGB((time / 600) % 1, 0.7, 1).color).setAlpha(0.6);
        this.tweens.add({ targets: fantasma, alpha: 0, duration: 260, onComplete: () => fantasma.destroy() });
      }
    } else if (this.turboAte && time >= this.turboAte) {
      this.turboAte = 0;
      Audio.turbo(false);
    }

    this.etiqueta.posicionar(h.x, b.top - 2);
    if (h.y > ALT + 30) this.caiuNoBuraco();
    this.atualizarHUD();
  }

  atualizarInimigos() {
    const cam = this.cameras.main;
    this.inimigos.getChildren().forEach((e) => {
      if (e.morto || !e.body) return;
      if (!e.ativo) {
        if (e.x < cam.scrollX + LARG + 24) {
          e.ativo = true;
          e.body.setAllowGravity(true);
          e.setVelocityX(e.tipo === "bug" ? -30 : -40);
        }
        return;
      }
      const vel = e.tipo === "bug" ? 30 : 40;
      if (e.body.blocked.left) e.dir = 1;
      else if (e.body.blocked.right) e.dir = -1;
      else if (e.body.blocked.down) {
        const frente = this.camada.getTileAtWorldXY(e.x + e.dir * 9, e.body.bottom + 2);
        const blocoFrente = this.blocos.getChildren().some((bl) => Math.abs(bl.x - (e.x + e.dir * 9)) < 8 && Math.abs(bl.body.top - e.body.bottom) < 4);
        if (!frente && !blocoFrente) e.dir *= -1;
      }
      e.setVelocityX(vel * e.dir);
      e.setFlipX(e.dir > 0);
      if (e.tipo === "virus" && e.body.blocked.down) e.setVelocityY(-200);
      if (e.y > ALT + 40) e.destroy();
    });
  }
}
