// =====================================================================
//  CENA DA FASE - jogo de plataforma com o herói criado pelo visitante
// =====================================================================
import { FASE_1 } from "./level-data.js";
import { registrarHeroi } from "./textures.js";
import { criarEntrada } from "./input.js";
import { montarFundo, LARG, ALT } from "./cenario.js";
import { Audio } from "../audio.js";
import { texto } from "./texto.js";

const T = 16;
const TEMPO_FASE = 200;
const INATIVO_MS = 60000;

const FISICA = {
  // gravidade 1000: pulo 400 sobe ~80px (5 blocos); correndo sobe ~90px
  andar: 100, correr: 160, turbo: 1.3,
  pulo: 400, puloCorrendo: 425, puloDuplo: 370, mola: 640,
  coyote: 110, buffer: 140, quedaMax: 520, corte: 160,
};

export class FaseScene extends Phaser.Scene {
  constructor() { super("fase"); }

  init(data) {
    this.jogador = data.jogador;
    this.cb = data.callbacks ?? {};
    this.stats = { pontos: 0, moedas: 0, inimigos: 0, danos: 0 };
    this.coracoes = 3;
    this.tempo = TEMPO_FASE;
    this.inicio = 0;
    this.turboAte = 0;
    this.invencivelAte = 0;
    this.noChaoEm = 0;
    this.puloPedidoEm = -9999;
    this.puloDuploUsado = false;
    this.combo = 0;
    this.acabou = false;
    this.pausado = false;
    this.bateuCima = false;
  }

  create() {
    const mapa = FASE_1;
    const W = mapa[0].length * T;
    this.W = W;
    this.physics.world.setBounds(0, -200, W, ALT + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.atualizarFundo = montarFundo(this, W);

    // ---------- tilemap ----------
    const dados = mapa.map((linha, y) => [...linha].map((ch, x) => {
      if (ch === "#") return y > 0 && mapa[y - 1][x] === "#" ? 1 : 0;
      if (ch === "X") return 2;
      if (ch === "-") return 3;
      return -1;
    }));
    const map = this.make.tilemap({ data: dados, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage("tiles", "tiles", T, T, 0, 0);
    this.camada = map.createLayer(0, ts, 0, 0);
    this.camada.setCollision([0, 1, 2, 3]);
    // pranchas "leves": só colidem por cima (atravessa pulando por baixo)
    this.camada.forEachTile((t) => { if (t.index === 3) t.setCollision(false, false, true, false); });

    // ---------- grupos ----------
    this.blocos = this.physics.add.staticGroup();
    this.moedas = this.physics.add.group({ allowGravity: false, immovable: true });
    this.inimigos = this.physics.add.group();
    this.espinhos = this.physics.add.staticGroup();
    this.molas = this.physics.add.staticGroup();
    this.moveis = this.physics.add.group({ allowGravity: false, immovable: true });
    this.checkpoints = this.physics.add.staticGroup();
    this.itens = this.physics.add.group();

    let inicio = { x: 48, y: 180 };
    const rnd = new Phaser.Math.RandomDataGenerator(["expotech"]);

    mapa.forEach((linha, ty) => [...linha].forEach((ch, tx) => {
      const x = tx * T + T / 2, y = ty * T + T / 2;
      switch (ch) {
        case "@": inicio = { x, y: y - 4 }; break;
        case "o": this.moedas.create(x, y, "moeda").play("moeda_gira").body.setSize(10, 12); break;
        case "R": {
          const b = this.blocos.create(x, y, "rachado");
          b.conteudo = "quebra";
          b.cargas = 1;
          break;
        }
        case "E": case "M": case "T": {
          const b = this.blocos.create(x, y, "energia").play("energia_brilha");
          b.conteudo = ch === "T" ? "turbo" : "moeda";
          b.cargas = ch === "M" ? 5 : 1;
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
          if (ty > 0 && mapa[ty - 1][tx] === ".") {
            const r = rnd.frac();
            const chao = ty * T;
            if (r < 0.07) this.add.image(x, chao, "arvore").setOrigin(0.5, 1).setDepth(-2);
            else if (r < 0.17) this.add.image(x, chao, "arbusto").setOrigin(0.5, 1).setDepth(-2);
            else if (r < 0.3) this.add.image(x, chao, `flor_${rnd.between(0, 2)}`).setOrigin(0.5, 1).setDepth(-2);
          }
          break;
      }
    }));
    this.inicioFase = inicio;
    this.respawn = { ...inicio };
    this.totalMoedas = this.moedas.countActive() + this.blocos.getChildren().reduce((s, b) => s + (b.conteudo === "moeda" ? b.cargas : 0), 0);

    // ---------- herói ----------
    this.heroiKey = registrarHeroi(this, this.jogador);
    this.heroi = this.physics.add.sprite(inicio.x, inicio.y, this.heroiKey, "idle");
    this.heroi.body.setSize(12, 20).setOffset(3, 2);
    this.heroi.setMaxVelocity(400, 900).setDepth(10);
    this.etiqueta = texto(this, 0, 0, this.jogador.nome || "HERÓI", { ox: 0.5, oy: 1 }).setDepth(11);

    // ---------- colisões ----------
    const P = this.physics;
    P.add.collider(this.heroi, this.camada, () => this.checarCabecada());
    P.add.collider(this.heroi, this.blocos, (_h, b) => this.baterBloco(b));
    P.add.collider(this.heroi, this.moveis);
    P.add.collider(this.inimigos, this.camada);
    P.add.collider(this.inimigos, this.blocos);
    P.add.collider(this.itens, this.camada);
    P.add.collider(this.itens, this.blocos);
    P.add.overlap(this.heroi, this.moedas, (_h, m) => this.pegarMoeda(m));
    P.add.overlap(this.heroi, this.inimigos, (_h, i) => this.tocarInimigo(i));
    P.add.overlap(this.heroi, this.espinhos, () => this.tomarDano());
    P.add.overlap(this.heroi, this.molas, (_h, m) => this.usarMola(m));
    P.add.overlap(this.heroi, this.checkpoints, (_h, c) => this.ativarCheckpoint(c));
    P.add.overlap(this.heroi, this.itens, (_h, it) => this.pegarItem(it));
    if (this.portal) P.add.overlap(this.heroi, this.portal, () => this.vencer());

    // ---------- câmera ----------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, ALT);
    cam.startFollow(this.heroi, true, 0.12, 0.1, 0, 10);
    cam.setDeadzone(40, 60);
    cam.setRoundPixels(true);

    // ---------- partículas ----------
    this.poeira = this.add.particles(0, 0, "px_terra", {
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

    this.entrada = criarEntrada(this);
    this.criarHUD();
    this.mostrarFaixa("FASE 1", "VALE EXPOTECH");

    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.acabou || this.pausado) return;
        this.tempo--;
        if (this.tempo === 30) Audio.sfx("dano");
        if (this.tempo <= 0) { this.tempo = 0; this.morrer(); }
      },
    });
    this.inicio = 0; // marcado no primeiro quadro, depois da contagem
    Audio.jingle("inicio", "fase");
  }

  // =================================================================
  criarInimigo(x, y, tipo) {
    const e = this.inimigos.create(x, y, tipo).play(tipo === "bug" ? "bug_anda" : "virus_pisca");
    e.tipo = tipo;
    e.ativo = false;
    e.dir = -1;
    if (tipo === "bug") e.body.setSize(14, 10).setOffset(2, 3);
    else e.body.setSize(12, 12).setOffset(2, 2);
    e.body.setAllowGravity(false);
    return e;
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

  criarHUD() {
    const fixo = (o) => o.setScrollFactor(0).setDepth(100);
    const txt = (x, y, s, cor = "#ffffff") => fixo(texto(this, x, y, s, { cor }));
    fixo(this.add.rectangle(0, 0, LARG, 26, 0x1b1b2f, 0.35).setOrigin(0));
    txt(6, 3, String(this.jogador.nome || "HERÓI").slice(0, 12), "#fff35c");
    this.hudPontos = txt(6, 13, "000000");
    fixo(this.add.image(128, 13, "moeda", 0));
    this.hudMoedas = txt(137, 9, "x00");
    this.hudCoracoes = [0, 1, 2].map((i) => fixo(this.add.image(200 + i * 11, 13, "coracao")));
    txt(LARG - 62, 3, "TEMPO", "#fff35c");
    this.hudTempo = txt(LARG - 62, 13, String(TEMPO_FASE));
    this.hudTurboFundo = fixo(this.add.rectangle(250, 9, 60, 8, 0x1b1b2f).setOrigin(0).setVisible(false));
    this.hudTurbo = fixo(this.add.rectangle(251, 10, 58, 6, 0x45e070).setOrigin(0).setVisible(false));
    this.hudTurboTxt = txt(256, 17, "TURBO!", "#45e070").setVisible(false);
  }

  atualizarHUD() {
    this.hudPontos.trocar(String(this.stats.pontos).padStart(6, "0"));
    this.hudMoedas.trocar("x" + String(this.stats.moedas).padStart(2, "0"));
    this.hudTempo.trocar(String(this.tempo).padStart(3, "0")).cor(this.tempo <= 30 ? "#ff5a7a" : "#ffffff");
    this.hudCoracoes.forEach((c, i) => c.setTexture(i < this.coracoes ? "coracao" : "coracao_vazio"));
    const resta = this.turboAte - this.game.loop.time;
    const on = resta > 0;
    this.hudTurboFundo.setVisible(on); this.hudTurbo.setVisible(on); this.hudTurboTxt.setVisible(on);
    if (on) this.hudTurbo.width = 58 * (resta / 10000);
  }

  mostrarFaixa(titulo, sub) {
    const c = this.add.container(Math.floor(LARG / 2), ALT / 2 - 30).setScrollFactor(0).setDepth(120);
    const fundo = this.add.rectangle(0, 0, 260, 48, 0x1b1b2f, 1).setStrokeStyle(2, 0xfff35c);
    const t1 = texto(this, 0, -3, titulo, { cor: "#fff35c", escala: 2, ox: 0.5, oy: 0.5 });
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

  popTexto(x, y, s, cor = "#ffffff") {
    const t = texto(this, x, y, s, { cor, ox: 0.5, oy: 0.5 }).setDepth(50);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 700, ease: "Quad.out", onComplete: () => t.destroy() });
  }

  somarPontos(n, x, y) {
    this.stats.pontos += n;
    if (x !== undefined) this.popTexto(x, y, String(n));
  }

  // =================================================================
  pegarMoeda(m) {
    m.disableBody(true, true);
    this.stats.moedas++;
    this.somarPontos(100);
    this.brilho.emitParticleAt(m.x, m.y, 4);
    Audio.sfx("moeda");
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
    this.tweens.add({ targets: b, y: b.y - 5, duration: 70, yoyo: true, onComplete: () => b.refreshBody() });
    this.somarPontos(50);
    // empurra inimigos que estiverem em cima do bloco
    this.inimigos.getChildren().forEach((e) => {
      if (e.active && !e.morto && Math.abs(e.x - b.x) < 14 && Math.abs(e.body.bottom - b.body.top) < 4) this.derrotar(e, true);
    });
    if (b.conteudo === "turbo") {
      Audio.sfx("bloco");
      const it = this.itens.create(b.x, b.y - 2, "bateria").setDepth(-0.5);
      it.body.setAllowGravity(false).setSize(10, 13);
      this.tweens.add({
        targets: it, y: b.y - 16, duration: 450,
        onComplete: () => { it.body.setAllowGravity(true); it.setVelocityX(55).setBounce(0.2); it.setDepth(5); },
      });
    } else {
      Audio.sfx("moeda");
      this.stats.moedas++;
      this.somarPontos(100);
      const m = this.add.sprite(b.x, b.y - 12, "moeda").play("moeda_gira").setDepth(5);
      this.tweens.add({ targets: m, y: b.y - 44, duration: 260, yoyo: true, ease: "Quad.out", onComplete: () => { this.brilho.emitParticleAt(m.x, m.y, 3); m.destroy(); } });
    }
    if (b.cargas <= 0) b.anims.stop(), b.setTexture("usado");
  }

  quebrarBloco(b) {
    this.inimigos.getChildren().forEach((e) => {
      if (e.active && !e.morto && Math.abs(e.x - b.x) < 14 && Math.abs(e.body.bottom - b.body.top) < 4) this.derrotar(e, true);
    });
    this.cacos.emitParticleAt(b.x, b.y, 8);
    this.somarPontos(50, b.x, b.y - 10);
    Audio.sfx("quebrar");
    b.destroy();
    this.heroi.setVelocityY(Math.max(this.heroi.body.velocity.y, 40));
  }

  pegarItem(it) {
    it.destroy();
    Audio.sfx("turbo");
    this.turboAte = this.game.loop.time + 10000;
    this.somarPontos(1000, this.heroi.x, this.heroi.y - 20);
    this.brilho.emitParticleAt(this.heroi.x, this.heroi.y, 12);
    Audio.turbo(true);
    this.cameras.main.flash(150, 120, 255, 160);
  }

  usarMola(m) {
    const h = this.heroi.body;
    if (h.velocity.y < -20 || h.bottom > m.body.top + 13) return;
    this.heroi.setVelocityY(-FISICA.mola);
    this.impulsoLivre = true; // a mola não é cortada ao soltar o botão
    this.puloDuploUsado = false;
    m.play("mola_pula");
    Audio.sfx("mola");
    this.poeira.emitParticleAt(m.x, m.body.top, 6);
  }

  ativarCheckpoint(c) {
    if (c.ativo) return;
    c.ativo = true;
    c.setFrame(1);
    this.respawn = { x: c.x, y: c.y - 4 };
    this.somarPontos(500, c.x, c.y - 24);
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
      this.heroi.setVelocityY(this.entrada.ler().pulo ? -390 : -260);
    } else {
      this.tomarDano(e.x);
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
      this.time.delayedCall(500, () => this.tweens.add({ targets: e, alpha: 0, duration: 200, onComplete: () => e.destroy() }));
    } else {
      e.body.checkCollision.none = true;
      e.setFlipY(true).setVelocity(this.heroi.x < e.x ? 60 : -60, -220);
      e.body.setAllowGravity(true);
      this.time.delayedCall(1500, () => e.destroy());
    }
  }

  tomarDano(origemX) {
    if (this.acabou || this.game.loop.time < this.invencivelAte || this.game.loop.time < this.turboAte) return;
    this.coracoes--;
    this.stats.danos++;
    this.cameras.main.shake(180, 0.012);
    if (this.coracoes <= 0) { this.morrer(); return; }
    Audio.sfx("dano");
    this.invencivelAte = this.game.loop.time + 1600;
    const lado = origemX !== undefined && origemX > this.heroi.x ? -1 : 1;
    this.heroi.setVelocity(150 * lado, -220);
    this.tweens.add({ targets: this.heroi, alpha: 0.2, duration: 90, yoyo: true, repeat: 8, onComplete: () => this.heroi.setAlpha(1) });
  }

  caiuNoBuraco() {
    if (this.acabou) return;
    this.coracoes--;
    this.stats.danos++;
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
    this.heroi.setTint(0xff9ab3).setVelocity(0, -300).setAccelerationX(0);
    this.heroi.setFrame("jump");
    this.etiqueta.setVisible(false);
    this.time.delayedCall(2200, () => this.finalizar(false));
  }

  vencer() {
    if (this.acabou) return;
    this.acabou = true;
    Audio.sfx("portal");
    Audio.jingle("vitoria");
    this.heroi.body.enable = false;
    this.etiqueta.setVisible(false);
    this.tweens.add({
      targets: this.heroi, x: this.portalX, y: this.portalY, angle: 720, scale: 0, duration: 900, ease: "Quad.in",
      onComplete: () => this.brilho.emitParticleAt(this.portalX, this.portalY, 24),
    });
    this.time.delayedCall(1800, () => this.finalizar(true));
  }

  finalizar(venceu) {
    const tempoSeg = Math.round((this.game.loop.time - this.inicio) / 1000);
    const bonusTempo = venceu ? this.tempo * 20 : 0;
    const bonusVidas = venceu ? this.coracoes * 1000 : 0;
    const bonusFase = venceu ? 5000 : 0;
    const total = this.stats.pontos + bonusTempo + bonusVidas + bonusFase;
    this.cb.onFim?.({
      venceu,
      pontosBase: this.stats.pontos, bonusTempo, bonusVidas, bonusFase,
      pontos: total,
      moedas: this.stats.moedas,
      totalMoedas: this.totalMoedas,
      inimigos: this.stats.inimigos,
      tempo_seg: tempoSeg,
      vidas_restantes: this.coracoes,
      sem_dano: this.stats.danos === 0,
    });
  }

  alternarPausa() {
    this.pausado = !this.pausado;
    if (this.pausado) {
      this.physics.world.pause(); this.anims.pauseAll(); this.tweens.pauseAll();
      this.telaPausa = this.add.container(Math.floor(LARG / 2), ALT / 2).setScrollFactor(0).setDepth(200);
      this.telaPausa.add([
        this.add.rectangle(0, 0, LARG, ALT, 0x1b1b2f, 0.6),
        texto(this, 0, -8, "PAUSA", { cor: "#fff35c", escala: 2, ox: 0.5, oy: 0.5 }),
        texto(this, 0, 14, "ESC / START PARA VOLTAR", { ox: 0.5, oy: 0.5 }),
      ]);
      Audio.sfx("menu");
      this.cb.onPausa?.(true);
    } else {
      this.physics.world.resume(); this.anims.resumeAll(); this.tweens.resumeAll();
      this.telaPausa?.destroy();
      this.cb.onPausa?.(false);
    }
  }

  // =================================================================
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.atualizarFundo(dt);
    const inp = this.entrada.ler();

    if (!this.inicio) this.inicio = time;
    if (time - this.entrada.ultimoInput > INATIVO_MS && !this.acabou) {
      this.acabou = true;
      this.cb.onInativo?.();
      return;
    }
    if (inp.pausaAgora && !this.acabou) this.alternarPausa();
    if (this.pausado) return;

    // plataformas móveis
    this.moveis.getChildren().forEach((p) => {
      if (p.eixo === "x") {
        if (p.x >= p.max) p.setVelocityX(-45); else if (p.x <= p.min) p.setVelocityX(45);
      } else if (p.y <= p.min) p.setVelocityY(35); else if (p.y >= p.max) p.setVelocityY(-35);
    });

    this.atualizarInimigos();
    this.itens.getChildren().forEach((it) => {
      if (it.body.blocked.right) it.setVelocityX(-55);
      else if (it.body.blocked.left) it.setVelocityX(55);
      if (it.y > ALT + 40) it.destroy();
    });

    if (this.acabou) {
      this.atualizarHUD();
      return;
    }

    const h = this.heroi;
    const b = h.body;
    const noChao = b.blocked.down || b.touching.down;
    const turbo = time < this.turboAte;

    if (noChao) {
      if (time - this.noChaoEm > 120 && b.velocity.y >= 0 && this.estavaNoAr) this.poeira.emitParticleAt(h.x, b.bottom, 4);
      this.noChaoEm = time;
      this.puloDuploUsado = false;
      this.combo = 0;
    }
    this.estavaNoAr = !noChao;
    if (!b.blocked.up) this.bateuCima = false;

    // movimento horizontal com aceleração suave
    let alvo = 0;
    const vmax = (inp.correr ? FISICA.correr : FISICA.andar) * (turbo ? FISICA.turbo : 1);
    if (inp.esq) alvo -= vmax;
    if (inp.dir) alvo += vmax;
    const k = Math.min(1, dt * (noChao ? 14 : 7));
    h.setVelocityX(b.velocity.x + (alvo - b.velocity.x) * k);
    if (alvo !== 0) h.setFlipX(alvo < 0);

    // pulo com "coyote time" e "buffer" (deixa o controle gostoso)
    if (inp.puloAgora) this.puloPedidoEm = time;
    const podePular = time - this.noChaoEm < FISICA.coyote;
    if (time - this.puloPedidoEm < FISICA.buffer && podePular) {
      h.setVelocityY(-(Math.abs(b.velocity.x) > 130 ? FISICA.puloCorrendo : FISICA.pulo));
      this.noChaoEm = -9999;
      this.puloPedidoEm = -9999;
      Audio.sfx("pulo");
    } else if (inp.puloAgora && turbo && !noChao && !this.puloDuploUsado) {
      h.setVelocityY(-FISICA.puloDuplo);
      this.puloDuploUsado = true;
      this.brilho.emitParticleAt(h.x, b.bottom, 6);
      Audio.sfx("puloDuplo");
    }
    if (b.velocity.y >= 0) this.impulsoLivre = false;
    if (b.velocity.y > FISICA.quedaMax) h.setVelocityY(FISICA.quedaMax); // limita só a queda
    if (!inp.pulo && !this.impulsoLivre && b.velocity.y < -FISICA.corte) h.setVelocityY(-FISICA.corte);

    // animação
    if (!noChao) h.play(`${this.heroiKey}_pulo`, true);
    else if (Math.abs(b.velocity.x) > 12) {
      h.play(`${this.heroiKey}_andar`, true);
      h.anims.timeScale = Math.abs(b.velocity.x) / 90;
      if (inp.correr && Math.random() < 0.25) this.poeira.emitParticleAt(h.x, b.bottom, 1);
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
