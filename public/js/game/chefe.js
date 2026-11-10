// =====================================================================
//  REI GLITCH - o chefe da Sala dos Servidores
//
//  Como vencer: pise na cabeça (monitor) dele. Ele fica TONTO depois de
//  bater na parede numa investida: é a melhor hora! O Chip Laser também
//  machuca (menos que a pisada).
//
//  Ataques: andar, investida, salto com onda de choque, tiro de
//  pacotes de dados e, na fúria, chuva de pacotes do teto e Bugzinhos.
// =====================================================================
import { Audio } from "../audio.js";
import { texto } from "./texto.js";
import { LARG } from "./cenario.js";

export const VIDA_CHEFE = 20;
const DANO_PISAO = 3;   // pisão normal
const DANO_CRITICO = 5; // pisão com ele TONTO
const DANO_LASER = 1;

export class Chefe {
  constructor(scene, x, y) {
    this.scene = scene;
    this.vida = VIDA_CHEFE;
    this.furia = false;
    this.morto = false;
    this.estado = "intro";
    this.estadoAte = 0;
    this.invencivelAte = 0;
    this.ciclo = 0;
    this.noAr = false;

    // aparece logo abaixo do teto, "piscando" como um glitch, e cai
    const s = scene.physics.add.sprite(x, 42, "chefe", "a1F").setDepth(8).setAlpha(0);
    // área que machuca = só o casco (pular por cima é justo)
    s.body.setSize(34, 31).setOffset(9, 13);
    s.setCollideWorldBounds(true);
    s.body.setAllowGravity(true);
    s.chefe = this;
    this.sprite = s;
    this.yChao = y;

    // estrelinhas de "tonto"
    this.estrelas = [0, 1, 2].map(() => scene.add.image(0, 0, "estrela").setDepth(9).setVisible(false));
    // aviso "!" antes da investida e sombra mostrando onde ele vai cair
    this.alerta = texto(scene, 0, 0, "!", { cor: "#ff3d6e", escala: 3, ox: 0.5, oy: 1 }).setDepth(20).setVisible(false);
    this.sombra = scene.add.ellipse(0, 207, 34, 6, 0x000000, 0.45).setDepth(7).setVisible(false);
  }

  get agora() { return this.scene.game.loop.time; }

  // ---------- intro: cai do teto ----------
  entrar(aoTerminar) {
    const sc = this.scene;
    const s = this.sprite;
    s.body.setAllowGravity(false);
    sc.tweens.add({ targets: s, alpha: 1, duration: 60, yoyo: true, repeat: 5, ease: "Stepped",
      onComplete: () => { s.setAlpha(1).setFrame("a1"); s.body.setAllowGravity(true); s.setVelocity(0, 100); } });
    sc.time.delayedCall(700, () => {
      sc.cameras.main.shake(350, 0.02);
      Audio.sfx("tremor");
      sc.vibrar(120);
    });
    sc.time.delayedCall(1200, () => {
      Audio.sfx("rugido");
      this.sprite.setFrame("tiro");
      sc.time.delayedCall(450, () => this.sprite.setFrame("a1"));
    });
    sc.time.delayedCall(2600, () => {
      this.mudar("pausa", 600);
      aoTerminar?.();
    });
  }

  mudar(estado, duracao = 0) {
    this.estado = estado;
    this.estadoAte = this.agora + duracao;
    this.inicioEstado = this.agora;
  }

  // ---------- escolhe o próximo ataque ----------
  proximo() {
    const seq = this.furia
      ? ["investida", "chuva", "salto", "invocar", "investida", "tiro", "salto", "chuva", "andar"]
      : ["andar", "investida", "andar", "tiro", "salto", "investida", "andar", "salto"];
    const acao = seq[this.ciclo % seq.length];
    this.ciclo++;
    const h = this.scene.heroi;
    const dir = h.x < this.sprite.x ? -1 : 1;
    const s = this.sprite;

    switch (acao) {
      case "andar":
        this.mudar("andar", this.furia ? 1000 : 1400);
        break;
      case "investida":
        this.dirInvestida = dir;
        s.setVelocityX(0);
        this.mudar("preparar", this.furia ? 550 : 750);
        Audio.sfx("rugido");
        break;
      case "salto": {
        const dist = Phaser.Math.Clamp(h.x - s.x, -220, 220);
        s.setVelocity(dist / 0.95, this.furia ? -520 : -470);
        this.noAr = true;
        this.mudar("salto", 3000);
        break;
      }
      case "tiro":
        this.tirosRestantes = this.furia ? 5 : 3;
        this.proximoTiro = this.agora + 200;
        s.setVelocityX(0);
        this.mudar("tiro", 3000);
        break;
      case "chuva":
        // pacotes caem do teto em lugares aleatórios
        s.setVelocityX(0);
        Audio.sfx("rugido");
        this.scene.cameras.main.shake(500, 0.012);
        for (let i = 0; i < 7; i++) {
          this.scene.time.delayedCall(250 + i * 220, () => {
            if (this.morto) return;
            const x = Phaser.Math.Between(32, this.scene.W - 32);
            this.scene.fx("fx_brilho", x, 22, { depth: 9 });
            const p = this.scene.projeteis.create(x, 24, "pacote").play("pacote_gira");
            p.setVelocity(0, 40).setBounce(0.4);
            p.quiques = 1;
            p.body.setSize(7, 7);
            this.scene.time.delayedCall(3000, () => p.active && p.destroy());
          });
        }
        this.mudar("pausa", 1900);
        break;
      case "invocar":
        s.setVelocityX(0);
        Audio.sfx("rugido");
        this.scene.cameras.main.shake(300, 0.01);
        [0.3, 0.7].forEach((f, i) => this.scene.time.delayedCall(300 + i * 250, () => {
          if (!this.morto && this.scene.inimigos.countActive() < 3) this.scene.invocarBug(16 + f * (this.scene.W - 32), 30);
        }));
        this.mudar("pausa", 1000);
        break;
    }
  }

  // ---------- quadro a quadro ----------
  update() {
    if (this.morto || this.estado === "intro") { this.atualizarEstrelas(false); return; }
    const s = this.sprite;
    const b = s.body;
    const h = this.scene.heroi;
    const t = this.agora;
    const noChao = b.blocked.down;
    const vel = this.furia ? 80 : 52;

    switch (this.estado) {
      case "pausa":
        s.setVelocityX(s.body.velocity.x * 0.8);
        if (t > this.estadoAte) this.proximo();
        break;
      case "andar":
        s.setVelocityX(h.x < s.x ? -vel : vel);
        if (t > this.estadoAte) this.mudar("pausa", this.furia ? 300 : 550);
        break;
      case "preparar":
        // treme antes de avançar (aviso pro jogador)
        s.x += Math.sin(t / 25) * 0.8;
        s.setTint(Math.floor(t / 80) % 2 ? 0xff9ab3 : 0xffffff);
        if (t > this.estadoAte) {
          s.clearTint();
          s.setVelocityX(this.dirInvestida * (this.furia ? 290 : 235));
          this.mudar("investida", 4000);
        }
        break;
      case "investida":
        if (b.blocked.left || b.blocked.right || t > this.estadoAte) {
          s.setVelocityX(0);
          this.scene.cameras.main.shake(250, 0.018);
          Audio.sfx("tremor");
          this.scene.vibrar(80);
          this.scene.cacos.emitParticleAt(s.x + this.dirInvestida * 22, s.y, 8);
          this.scene.fx("fx_impacto", s.x + this.dirInvestida * 24, s.y - 4, { escala: 2 });
          this.mudar("tonto", this.furia ? 1100 : 1500);
        }
        break;
      case "tonto":
        s.setVelocityX(0);
        if (t > this.estadoAte) this.mudar("pausa", 300);
        break;
      case "salto":
        if (this.noAr && noChao && t - this.inicioEstado > 150) {
          this.noAr = false;
          s.setVelocityX(0);
          if (this.fugindo) this.fugindo = false;
          else this.ondaDeChoque();
          this.mudar("pausa", this.furia ? 350 : 650);
        }
        break;
      case "tiro":
        if (this.tirosRestantes > 0 && t > this.proximoTiro) {
          this.tirosRestantes--;
          this.proximoTiro = t + (this.furia ? 180 : 260);
          this.atirar();
        }
        if (this.tirosRestantes <= 0 && t > this.proximoTiro + 400) this.mudar("pausa", this.furia ? 300 : 550);
        break;
    }

    // visual
    const ferido = t < this.feridoAte;
    // cada estado tem a sua pose (o sufixo F é a versão vermelha da fúria)
    const F = this.furia ? "F" : "";
    const pose = (q) => { s.anims.stop(); s.setFrame(q + F); };
    if (ferido) pose("dano");
    else if (this.estado === "tonto") pose("tonto");
    else if (this.estado === "investida") s.play(`chefe_carga${F}`, true);
    else if (this.estado === "preparar") pose(Math.floor(t / 90) % 2 ? "c1" : "a1");
    else if (!b.blocked.down) pose("ar");
    else if (t < (this.bocaAbertaAte ?? 0)) pose("tiro");
    else if (Math.abs(b.velocity.x) > 5 || this.furia) s.play(`chefe_anda${F}`, true);
    else pose("a1");
    // olha para onde anda; parado, olha para o herói
    if (this.estado === "preparar") s.setFlipX(this.dirInvestida > 0);
    else if (Math.abs(b.velocity.x) > 5) s.setFlipX(b.velocity.x > 0);
    else if (this.estado !== "tonto") s.setFlipX(h.x > s.x);

    // rastros: poeira na investida, fumaça e faíscas na fúria
    const sc = this.scene;
    if (this.estado === "investida" && t - (this.ultimaPoeira ?? 0) > 70) {
      this.ultimaPoeira = t;
      sc.fx("fx_poeira", s.x - this.dirInvestida * 22, b.bottom - 5, { depth: 7 });
    }
    if (this.furia && t - (this.ultimaFumaca ?? 0) > 260) {
      this.ultimaFumaca = t;
      sc.fx("fx_poeira", s.x + Phaser.Math.Between(-18, 18), s.y - 22, { depth: 9, tint: 0x5b5470, sobe: 14 });
      if (Math.random() < 0.5) sc.faisca.emitParticleAt(s.x + Phaser.Math.Between(-20, 20), s.y + Phaser.Math.Between(-18, 6), 2);
    }
    s.setAlpha(t < this.invencivelAte && !ferido ? (Math.floor(t / 70) % 2 ? 0.5 : 1) : 1);
    this.atualizarEstrelas(this.estado === "tonto");
    this.alerta.setVisible(this.estado === "preparar" && Math.floor(t / 120) % 2 === 0);
    if (this.alerta.visible) this.alerta.posicionar(s.x, s.y - 30);
    const noArAgora = !b.blocked.down && b.velocity.y !== 0;
    this.sombra.setVisible(noArAgora);
    if (noArAgora) {
      const altura = Phaser.Math.Clamp((207 - b.bottom) / 120, 0, 1);
      this.sombra.setPosition(Math.round(s.x), 207).setScale(1 - altura * 0.5, 1);
    }
  }

  atualizarEstrelas(on) {
    const t = this.agora / 180;
    this.estrelas.forEach((e, i) => {
      e.setVisible(on);
      if (on) e.setPosition(Math.round(this.sprite.x + Math.cos(t + i * 2.1) * 16), Math.round(this.sprite.y - 26 + Math.sin(t + i * 2.1) * 4));
    });
  }

  ondaDeChoque() {
    const sc = this.scene;
    sc.cameras.main.shake(300, 0.022);
    Audio.sfx("tremor");
    sc.vibrar(100);
    const y = this.sprite.body.bottom - 6;
    [-1, 1].forEach((d) => {
      const o = sc.ondas.create(this.sprite.x + d * 20, y, "onda");
      o.body.setAllowGravity(false).setSize(14, 9).setOffset(2, 3);
      o.setVelocityX(d * (this.furia ? 190 : 150));
      o.setFlipX(d < 0);
    });
    sc.fx("fx_anel", this.sprite.x, this.sprite.body.bottom - 3, { escala: 2, depth: 7 });
    sc.fx("fx_poeira", this.sprite.x - 20, this.sprite.body.bottom - 5, { escala: 2 });
    sc.fx("fx_poeira", this.sprite.x + 20, this.sprite.body.bottom - 5, { escala: 2 });
  }

  atirar() {
    const sc = this.scene;
    const s = this.sprite;
    const h = sc.heroi;
    Audio.sfx("tiroChefe");
    this.bocaAbertaAte = this.agora + 170;
    sc.fx("fx_brilho", s.x, s.y - 20, { depth: 9 });
    const p = sc.projeteis.create(s.x, s.y - 18, "pacote").play("pacote_gira");
    const dx = h.x - s.x;
    p.setVelocity(Phaser.Math.Clamp(dx * 1.1, -260, 260) + Phaser.Math.Between(-40, 40), Phaser.Math.Between(-340, -230));
    p.setBounce(0.65);
    p.quiques = 0;
    p.body.setSize(7, 7);
    sc.time.delayedCall(3500, () => p.active && p.destroy());
  }

  // ---------- levar dano ----------
  levarDano(tipo) {
    if (this.morto || this.estado === "intro" || this.agora < this.invencivelAte) return false;
    // pisão com ele TONTO é crítico
    const critico = tipo === "pisao" && this.estado === "tonto";
    const dano = critico ? DANO_CRITICO : tipo === "pisao" ? DANO_PISAO : DANO_LASER;
    if (critico) this.scene.popTexto(this.sprite.x, this.sprite.y - 44, "CRÍTICO!", "#fff35c", 1400);
    this.vida = Math.max(0, this.vida - dano);
    this.feridoAte = this.agora + 220;
    this.invencivelAte = this.agora + (tipo === "pisao" ? 900 : 600);
    Audio.sfx("chefeDano");
    this.scene.congelar(tipo === "pisao" ? 90 : 30);
    this.scene.somarPontos(tipo === "pisao" ? 500 : 150, this.sprite.x, this.sprite.y - 30);
    this.scene.brilho.emitParticleAt(this.sprite.x, this.sprite.y - 14, 8);
    this.scene.fx("fx_impacto", this.sprite.x, this.sprite.body.top, { escala: tipo === "pisao" ? 2 : 1 });

    if (this.vida <= 0) { this.morrer(); return true; }
    if (!this.furia && this.vida <= VIDA_CHEFE / 2) this.entrarFuria();
    // depois de uma pisada ele foge pulando (não dá pra pisar em sequência)
    if (tipo === "pisao" && (this.estado === "tonto" || this.estado === "andar" || this.estado === "pausa")) {
      const s = this.sprite;
      const h = this.scene.heroi;
      // foge para longe do herói (ou para o centro, se estiver encostado na parede)
      let dir = s.x >= h.x ? 1 : -1;
      if (s.x < 60) dir = 1; else if (s.x > this.scene.W - 60) dir = -1;
      s.setVelocity(dir * 170, -400);
      this.noAr = true;
      this.fugindo = true; // pulo de fuga não solta onda de choque
      this.mudar("salto", 3000);
    }
    return true;
  }

  entrarFuria() {
    this.furia = true;
    const sc = this.scene;
    Audio.sfx("rugido");
    Audio.acelerar(1.15);
    sc.cameras.main.flash(250, 255, 60, 110);
    sc.cameras.main.shake(400, 0.02);
    sc.vibrar(200);
    sc.mostrarFaixa("FÚRIA!", "O REI GLITCH FICOU BRAVO", "#ff5a7a");
    sc.ligarAlarme();
  }

  morrer() {
    this.morto = true;
    const sc = this.scene;
    const s = this.sprite;
    s.body.enable = false;
    s.anims.stop();
    s.setFrame(this.furia ? "danoF" : "dano");
    this.atualizarEstrelas(false);
    this.alerta.setVisible(false);
    this.sombra.setVisible(false);
    sc.projeteis.clear(true, true);
    sc.ondas.clear(true, true);
    sc.inimigos.getChildren().forEach((e) => { if (!e.morto) sc.derrotar(e, true); });
    Audio.parar();
    sc.congelar(250);
    sc.vibrar([100, 60, 100, 60, 250]);
    for (let i = 0; i < 8; i++) {
      sc.time.delayedCall(i * 230, () => {
        const ex = s.x + Phaser.Math.Between(-20, 20), ey = s.y + Phaser.Math.Between(-20, 16);
        sc.cacos.emitParticleAt(ex, ey, 6);
        sc.fx("fx_explosao", ex, ey, { escala: i % 3 === 0 ? 2 : 1, depth: 13 });
        sc.cameras.main.shake(150, 0.015);
        Audio.sfx("explosao");
        s.setTint(i % 2 ? 0xffffff : 0xff9ab3);
      });
    }
    sc.time.delayedCall(1900, () => {
      sc.cameras.main.flash(400, 255, 255, 255);
      sc.fx("fx_explosao", s.x, s.y, { escala: 3, depth: 13 });
      sc.desligarAlarme();
      sc.tweens.add({ targets: s, alpha: 0, scaleY: 0.2, duration: 400, onComplete: () => s.destroy() });
      sc.somarPontos(10000, s.x, s.y - 30);
      sc.chefeDerrotado();
    });
  }
}

// Barra de vida no topo da tela
export function criarBarraChefe(scene) {
  const fixo = (o) => o.setScrollFactor(0).setDepth(101);
  const x = Math.floor(LARG / 2);
  const rotulo = fixo(texto(scene, x, 30, "REI GLITCH", { cor: "#ff9ab3", ox: 0.5 }));
  const fundo = fixo(scene.add.rectangle(x - 76, 41, 152, 8, 0x1b1b2f).setOrigin(0).setStrokeStyle(1, 0xffffff));
  const barra = fixo(scene.add.rectangle(x - 75, 42, 150, 6, 0xff3d6e).setOrigin(0));
  const brilho = fixo(scene.add.rectangle(x - 75, 42, 150, 2, 0xff9ab3).setOrigin(0));
  const objs = [rotulo, fundo, barra, brilho];
  objs.forEach((o) => o.setAlpha(0));
  scene.tweens.add({ targets: objs, alpha: 1, duration: 400 });
  return {
    atualizar(vida) {
      const w = Math.max(0, Math.round(150 * (vida / VIDA_CHEFE)));
      barra.width = w; brilho.width = w;
    },
    esconder() { scene.tweens.add({ targets: objs, alpha: 0, duration: 400 }); },
  };
}
