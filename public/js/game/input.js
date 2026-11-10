// Controles unificados: teclado + controle (gamepad) + botões de toque
export const toque = { esq: false, dir: false, pulo: false, correr: false, acao: false, pausa: false };

export function criarEntrada(scene) {
  const K = Phaser.Input.Keyboard.KeyCodes;
  const kb = scene.input.keyboard.addKeys({
    esq: K.LEFT, dir: K.RIGHT, cima: K.UP, baixo: K.DOWN, a: K.A, d: K.D, w: K.W, s: K.S,
    espaco: K.SPACE, z: K.Z, x: K.X, c: K.C, shift: K.SHIFT, k: K.K, j: K.J, l: K.L,
    esc: K.ESC, p: K.P, enter: K.ENTER,
  }, false); // false = não bloqueia as teclas para o resto da página (campo de nome)
  scene.input.keyboard.clearCaptures();

  const BOTOES = ["pulo", "acao", "pausa", "cima", "baixo", "ok"];
  let antes = Object.fromEntries(BOTOES.map((b) => [b, false]));
  // guarda toques rápidos (aperta e solta entre dois quadros)
  const apertou = Object.fromEntries(BOTOES.map((b) => [b, false]));
  const marcar = (teclas, b) => teclas.forEach((k) => k.on("down", () => { apertou[b] = true; }));
  marcar([kb.espaco, kb.cima, kb.w, kb.z, kb.k], "pulo");
  marcar([kb.x, kb.j, kb.shift, kb.c, kb.l], "acao");
  marcar([kb.esc, kb.p], "pausa");
  marcar([kb.cima, kb.w], "cima");
  marcar([kb.baixo, kb.s], "baixo");
  marcar([kb.enter, kb.espaco, kb.z], "ok");
  let ultimoInput = scene.game.loop.time;

  return {
    get ultimoInput() { return ultimoInput; },
    ler() {
      const pad = scene.input.gamepad?.total ? scene.input.gamepad.getPad(0) : null;
      const ex = pad?.leftStick?.x ?? 0, ey = pad?.leftStick?.y ?? 0;
      const btn = (i) => !!pad?.buttons?.[i]?.pressed;

      const atual = {
        esq: kb.esq.isDown || kb.a.isDown || toque.esq || ex < -0.35 || btn(14),
        dir: kb.dir.isDown || kb.d.isDown || toque.dir || ex > 0.35 || btn(15),
        pulo: kb.espaco.isDown || kb.cima.isDown || kb.w.isDown || kb.z.isDown || kb.k.isDown || toque.pulo || btn(0) || btn(3),
        acao: kb.x.isDown || kb.j.isDown || kb.shift.isDown || kb.c.isDown || kb.l.isDown || toque.acao || btn(1) || btn(2),
        pausa: kb.esc.isDown || kb.p.isDown || toque.pausa || btn(9),
        cima: kb.cima.isDown || kb.w.isDown || ey < -0.5 || btn(12),
        baixo: kb.baixo.isDown || kb.s.isDown || ey > 0.5 || btn(13),
        ok: kb.enter.isDown || btn(0),
      };
      // correr: segurar o botão de ação OU empurrar bem o joystick de toque
      atual.correr = atual.acao || toque.correr;

      const r = { ...atual };
      for (const b of BOTOES) r[b + "Agora"] = (atual[b] && !antes[b]) || apertou[b];
      if (BOTOES.some((b) => apertou[b]) || atual.esq || atual.dir || atual.pulo || atual.acao || atual.pausa) {
        ultimoInput = scene.game.loop.time;
      }
      for (const b of BOTOES) { apertou[b] = false; antes[b] = atual[b]; }
      toque.pausa = false;
      return r;
    },
  };
}
