// Fundo com parallax (céu, cidade da expo, colinas e nuvens)
export const LARG = 427;
export const ALT = 240;

export function montarFundo(scene, larguraMundo) {
  scene.add.image(0, 0, "ceu").setOrigin(0).setDisplaySize(LARG, ALT).setScrollFactor(0).setDepth(-20);

  const camadas = [
    scene.add.tileSprite(0, ALT - 70 - 52, LARG, 70, "bg_cidade").setOrigin(0).setScrollFactor(0).setDepth(-18).setAlpha(0.85),
    scene.add.tileSprite(0, ALT - 90 - 18, LARG, 90, "bg_colinas1").setOrigin(0).setScrollFactor(0).setDepth(-17),
    scene.add.tileSprite(0, ALT - 70 - 2, LARG, 70, "bg_colinas2").setOrigin(0).setScrollFactor(0).setDepth(-16),
  ];
  const fatores = [0.08, 0.2, 0.4];

  const nuvens = [];
  const qtd = Math.ceil(larguraMundo / 140);
  for (let i = 0; i < qtd; i++) {
    const n = scene.add.image(i * 140 + Phaser.Math.Between(0, 80), Phaser.Math.Between(14, 80), i % 3 ? "nuvem" : "nuvem_p")
      .setScrollFactor(0.15 + (i % 3) * 0.05).setDepth(-19).setAlpha(0.95);
    n.vel = 2 + (i % 4);
    nuvens.push(n);
  }

  return (dt) => {
    const cam = scene.cameras.main;
    camadas.forEach((c, i) => { c.tilePositionX = cam.scrollX * fatores[i]; });
    nuvens.forEach((n) => {
      n.x -= n.vel * dt;
      const sx = n.x - cam.scrollX * n.scrollFactorX;
      if (sx < -60) n.x += LARG + 120;
    });
  };
}
