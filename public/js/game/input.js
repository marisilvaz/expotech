// Controles unificados: teclado + controle (gamepad) + botões de toque
export const toque = { esq: false, dir: false, pulo: false, correr: false };

export function criarEntrada(scene) {
  const K = Phaser.Input.Keyboard.KeyCodes;
  const kb = scene.input.keyboard.addKeys({
    esq: K.LEFT, dir: K.RIGHT, cima: K.UP, a: K.A, d: K.D, w: K.W,
    espaco: K.SPACE, z: K.Z, x: K.X, shift: K.SHIFT, k: K.K, j: K.J,
    esc: K.ESC, p: K.P, enter: K.ENTER,
  }, false); // false = não bloqueia as teclas para o resto da página (campo de nome)
  scene.input.keyboard.clearCaptures();
  let antes = { pulo: false, pausa: false };
  // guarda toques rápidos (aperta e solta entre dois quadros)
  const apertou = { pulo: false, pausa: false };
  [kb.espaco, kb.cima, kb.w, kb.z, kb.k].forEach((k) => k.on("down", () => { apertou.pulo = true; }));
  [kb.esc, kb.p].forEach((k) => k.on("down", () => { apertou.pausa = true; }));
  let ultimoInput = scene.game.loop.time;

  return {
    get ultimoInput() { return ultimoInput; },
    ler() {
      const pad = scene.input.gamepad?.total ? scene.input.gamepad.getPad(0) : null;
      const eixo = pad?.leftStick?.x ?? 0;
      const btn = (i) => !!pad?.buttons?.[i]?.pressed;

      const esq = kb.esq.isDown || kb.a.isDown || toque.esq || eixo < -0.35 || btn(14);
      const dir = kb.dir.isDown || kb.d.isDown || toque.dir || eixo > 0.35 || btn(15);
      const pulo = kb.espaco.isDown || kb.cima.isDown || kb.w.isDown || kb.z.isDown || kb.k.isDown || toque.pulo || btn(0) || btn(3);
      const correr = kb.shift.isDown || kb.x.isDown || kb.j.isDown || toque.correr || btn(1) || btn(2);
      const pausa = kb.esc.isDown || kb.p.isDown || btn(9);

      const r = {
        esq, dir, pulo, correr,
        puloAgora: (pulo && !antes.pulo) || apertou.pulo,
        pausaAgora: (pausa && !antes.pausa) || apertou.pausa,
      };
      if (apertou.pulo || apertou.pausa) ultimoInput = scene.game.loop.time;
      apertou.pulo = false; apertou.pausa = false;
      if (esq || dir || pulo || correr || pausa) ultimoInput = scene.game.loop.time;
      antes = { pulo, pausa };
      return r;
    },
  };
}
