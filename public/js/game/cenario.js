// Fundo com parallax (céu, cidade da expo, colinas e nuvens)
export const LARG = 427;
export const ALT = 240;

export function montarFundo(scene, larguraMundo, tema = "dia") {
  if (tema === "servidor") return fundoServidor(scene);
  scene.add.image(0, 0, "ceu").setOrigin(0).setDisplaySize(LARG, ALT).setScrollFactor(0).setDepth(-20);

  // sol com halo pulsando
  const halo = scene.add.circle(LARG - 70, 44, 26, 0xfff59a, 0.18).setScrollFactor(0).setDepth(-20);
  scene.tweens.add({ targets: halo, scale: 1.25, alpha: 0.08, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  scene.add.image(LARG - 70, 44, "sol").setScrollFactor(0).setDepth(-20);

  const camadas = [
    scene.add.tileSprite(0, ALT - 96 - 58, LARG, 96, "bg_montanhas").setOrigin(0).setScrollFactor(0).setDepth(-19).setAlpha(0.75),
    scene.add.tileSprite(0, ALT - 70 - 52, LARG, 70, "bg_cidade").setOrigin(0).setScrollFactor(0).setDepth(-18).setAlpha(0.85),
    scene.add.tileSprite(0, ALT - 90 - 18, LARG, 90, "bg_colinas1").setOrigin(0).setScrollFactor(0).setDepth(-17),
    scene.add.tileSprite(0, ALT - 70 - 2, LARG, 70, "bg_colinas2").setOrigin(0).setScrollFactor(0).setDepth(-16),
  ];
  const fatores = [0.04, 0.08, 0.2, 0.4];

  // bando de pássaros atravessando o céu
  const passaros = [0, 1, 2, 3].map((i) => {
    const b = scene.add.sprite(-30 - i * 14, 40 + (i % 2) * 7 + i * 2, "passaro").setScrollFactor(0).setDepth(-19).play({ key: "passaro_voa", startFrame: i % 2 });
    b.base = b.y;
    return b;
  });
  let tempoPassaros = 0;

  const nuvens = [];
  const qtd = Math.ceil(larguraMundo / 140);
  for (let i = 0; i < qtd; i++) {
    const n = scene.add.image(i * 140 + Phaser.Math.Between(0, 80), Phaser.Math.Between(14, 80), ["nuvem_p", "nuvem", "nuvem_g"][i % 3])
      .setScrollFactor(0.15 + (i % 3) * 0.05).setDepth(-19).setAlpha(0.95);
    n.vel = 2 + (i % 4);
    nuvens.push(n);
  }

  return (dt) => {
    const cam = scene.cameras.main;
    camadas.forEach((c, i) => { c.tilePositionX = cam.scrollX * fatores[i]; });
    tempoPassaros += dt;
    passaros.forEach((b, i) => {
      b.x += 16 * dt;
      b.y = b.base + Math.sin(tempoPassaros * 2 + i) * 2;
      if (b.x > LARG + 40) { b.x = -40 - i * 14; b.base = Phaser.Math.Between(26, 70) + i * 2; }
    });
    nuvens.forEach((n) => {
      n.x -= n.vel * dt;
      const sx = n.x - cam.scrollX * n.scrollFactorX;
      if (sx < -60) n.x += LARG + 120;
    });
  };
}

// Arena do chefe: sala escura cheia de servidores piscando
function fundoServidor(scene) {
  scene.add.image(0, 0, "ceu_noite").setOrigin(0).setDisplaySize(LARG, ALT).setScrollFactor(0).setDepth(-20);
  const longe = scene.add.tileSprite(0, ALT - 150 - 30, LARG, 150, "bg_serv1").setOrigin(0).setScrollFactor(0).setDepth(-18);
  const perto = scene.add.tileSprite(0, ALT - 110 - 32, LARG, 110, "bg_serv2").setOrigin(0).setScrollFactor(0).setDepth(-17);
  // luzes piscando
  const cores = [0x45e070, 0x2fe0d0, 0xff3d6e, 0xffd23f];
  for (let i = 0; i < 26; i++) {
    const l = scene.add.rectangle(Phaser.Math.Between(4, LARG - 4), Phaser.Math.Between(ALT - 135, ALT - 40), 2, 1, cores[i % 4])
      .setScrollFactor(0.4).setDepth(-16);
    scene.tweens.add({ targets: l, alpha: 0.1, duration: Phaser.Math.Between(150, 700), yoyo: true, repeat: -1, ease: "Stepped" });
  }
  // dois telões na parede com barras que sobem e descem
  [70, LARG - 70].forEach((cx, k) => {
    scene.add.rectangle(cx, 64, 66, 38, 0x1b1b2f).setStrokeStyle(2, 0x5d6a91).setScrollFactor(0.6).setDepth(-16);
    scene.add.rectangle(cx, 64, 60, 32, 0x0b1030).setScrollFactor(0.6).setDepth(-16);
    for (let i = 0; i < 9; i++) {
      const barra = scene.add.rectangle(cx - 26 + i * 6.5, 78, 4, 26, [0x2fe0d0, 0x45e070, 0xff3d6e][(i + k) % 3]).setOrigin(0.5, 1).setScrollFactor(0.6).setDepth(-16);
      barra.scaleY = 0.25;
      scene.tweens.add({ targets: barra, scaleY: Phaser.Math.FloatBetween(0.4, 1), duration: Phaser.Math.Between(180, 520), yoyo: true, repeat: -1, ease: "Stepped", easeParams: [4], delay: i * 40 });
    }
  });

  return () => {
    const cam = scene.cameras.main;
    longe.tilePositionX = cam.scrollX * 0.15;
    perto.tilePositionX = cam.scrollX * 0.35;
  };
}
