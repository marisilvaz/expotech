// =====================================================================
//  VILA EXPOTECH - todos os heróis criados na expo moram aqui
//  (fica rodando no fundo das telas de menu)
// =====================================================================
import { registrarHeroi } from "./textures.js";
import { montarFundo, LARG, ALT } from "./cenario.js";
import { texto } from "./texto.js";

const T = 16;
const LARG_VILA = LARG * 2;
const CHAO = 13 * T;
const MAX_MORADORES = 30;

export class VilaScene extends Phaser.Scene {
  constructor() { super("vila"); }

  init(data) {
    this.listaInicial = data?.moradores ?? [];
    this.moradores = [];
  }

  create() {
    this.atualizarFundo = montarFundo(this, LARG_VILA);

    // chão
    for (let x = 0; x < LARG_VILA; x += T) {
      this.add.image(x, CHAO, "grama").setOrigin(0).setDepth(0);
      this.add.image(x, CHAO + T, "terra").setOrigin(0).setDepth(0);
    }

    // casinhas, árvores e flores
    const rnd = new Phaser.Math.RandomDataGenerator(["vila"]);
    for (let i = 0; i < 9; i++) {
      this.add.image(40 + i * 96 + rnd.between(-8, 8), CHAO, `casa_${i % 5}`).setOrigin(0.5, 1).setDepth(-3);
      this.add.image(88 + i * 96, CHAO, i % 2 ? "arvore" : "arbusto").setOrigin(0.5, 1).setDepth(-2);
    }
    for (let x = 6; x < LARG_VILA; x += rnd.between(10, 26)) {
      this.add.image(x, CHAO, `flor_${rnd.between(0, 2)}`).setOrigin(0.5, 1).setDepth(-1);
    }

    // placa
    const placa = this.add.container(Math.floor(LARG / 2) + 4, CHAO - 34).setDepth(-1);
    placa.add([
      this.add.rectangle(-30, 18, 4, 30, 0x8a5532).setStrokeStyle(1, 0x1b1b2f),
      this.add.rectangle(30, 18, 4, 30, 0x8a5532).setStrokeStyle(1, 0x1b1b2f),
      this.add.rectangle(0, 0, 92, 20, 0xc98a52).setStrokeStyle(2, 0x1b1b2f),
      texto(this, 0, 0, "VILA EXPOTECH", { cor: "#fff6dc", ox: 0.5, oy: 0.5 }),
    ]);

    // moedas flutuando (decoração)
    for (let i = 0; i < 8; i++) {
      const m = this.add.sprite(60 + i * 100, rnd.between(90, 140), "moeda").play("moeda_gira").setDepth(1);
      this.tweens.add({ targets: m, y: m.y - 6, duration: 900 + i * 50, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // câmera passeando
    this.cameras.main.setBounds(0, 0, LARG_VILA, ALT);
    this.tweens.add({ targets: this.cameras.main, scrollX: LARG_VILA - LARG, duration: 36000, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.brilho = this.add.particles(0, 0, "estrela", {
      speed: { min: 30, max: 90 }, lifespan: 600, scale: { start: 1.2, end: 0 }, emitting: false,
    }).setDepth(20);

    [...this.listaInicial].reverse().forEach((j) => this.adicionarMorador(j, false));
  }

  definirMoradores(lista) {
    this.moradores.forEach((m) => { m.sprite.destroy(); m.nome.destroy(); m.selo?.destroy(); });
    this.moradores = [];
    [...lista].reverse().forEach((j) => this.adicionarMorador(j, false));
  }

  adicionarMorador(jogador, chegando = true) {
    if (this.moradores.length >= MAX_MORADORES) {
      const velho = this.moradores.shift();
      velho.sprite.destroy(); velho.nome.destroy(); velho.selo?.destroy();
    }
    const key = registrarHeroi(this, jogador);
    const cam = this.cameras.main;
    const x = chegando ? cam.scrollX + LARG / 2 + Phaser.Math.Between(-60, 60) : Phaser.Math.Between(20, LARG_VILA - 20);
    const yChao = CHAO - 11;
    const sprite = this.add.sprite(x, chegando ? -30 : yChao, key, "idle").setDepth(5 + this.moradores.length * 0.01);
    const nome = texto(this, x, 0, jogador.nome || "HERÓI", { cor: chegando ? "#fff35c" : "#ffffff", ox: 0.5, oy: 1 }).setDepth(30);
    const m = { sprite, nome, key, dir: Math.random() < 0.5 ? -1 : 1, vel: Phaser.Math.Between(14, 30), proxima: 0, pulando: false, yChao };
    this.moradores.push(m);

    if (chegando) {
      m.pulando = true;
      m.selo = texto(this, x, 0, "NOVO!", { cor: "#ff5a7a", ox: 0.5, oy: 1 }).setDepth(31);
      this.tweens.add({ targets: m.selo, alpha: 0, duration: 300, yoyo: true, repeat: -1, ease: "Stepped" });
      sprite.setFrame("jump");
      this.tweens.add({
        targets: sprite, y: yChao, duration: 900, ease: "Bounce.out",
        onComplete: () => { m.pulando = false; this.brilho.emitParticleAt(sprite.x, yChao + 8, 14); },
      });
    }
    return m;
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.atualizarFundo(dt);
    for (const m of this.moradores) {
      const s = m.sprite;
      if (time > m.proxima && !m.pulando) {
        const r = Math.random();
        if (r < 0.35) { m.dir = 0; m.proxima = time + Phaser.Math.Between(800, 2500); }
        else if (r < 0.5) {
          m.pulando = true;
          s.setFrame("jump");
          this.tweens.add({ targets: s, y: m.yChao - 26, duration: 260, yoyo: true, ease: "Quad.out", onComplete: () => { m.pulando = false; s.y = m.yChao; } });
          m.proxima = time + 700;
        } else { m.dir = Math.random() < 0.5 ? -1 : 1; m.proxima = time + Phaser.Math.Between(1500, 4000); }
      }
      if (m.dir) {
        s.x += m.dir * m.vel * dt;
        if (s.x < 12) m.dir = 1; else if (s.x > LARG_VILA - 12) m.dir = -1;
        s.setFlipX(m.dir < 0);
        if (!m.pulando) s.play(`${m.key}_andar`, true);
      } else if (!m.pulando) s.play(`${m.key}_parado`, true);
      if (m.pulando) s.anims.stop(), s.setFrame("jump");
      m.nome.posicionar(s.x, s.y - 12);
      m.selo?.posicionar(s.x, s.y - 22);
    }
  }
}
