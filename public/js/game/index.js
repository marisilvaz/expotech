// Inicializa o Phaser e expõe comandos simples para a interface
import { registrarTexturas } from "./textures.js";
import { VilaScene } from "./vila.js";
import { FaseScene } from "./fase.js";
import { LARG, ALT } from "./cenario.js";

class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  create() {
    registrarTexturas(this);
    this.game.events.emit("pronto");
  }
}

let game = null;
let moradoresAtuais = [];

export const Jogo = {
  iniciar(parent) {
    return new Promise((resolve) => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: LARG,
        height: ALT,
        pixelArt: true,
        roundPixels: true,
        backgroundColor: "#5cc8ff",
        input: { gamepad: true },
        physics: { default: "arcade", arcade: { gravity: { y: 1000 }, debug: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [BootScene, VilaScene, FaseScene],
        banner: false,
      });
      window.__jogo = game;
      game.events.once("pronto", resolve);
    });
  },

  vila(moradores) {
    if (moradores) moradoresAtuais = moradores;
    if (game.scene.isActive("fase")) game.scene.stop("fase");
    if (game.scene.isActive("vila")) { if (moradores) this.cenaVila.definirMoradores(moradores); return; }
    game.scene.start("vila", { moradores: moradoresAtuais });
  },

  get cenaVila() { return game.scene.getScene("vila"); },

  novoMorador(jogador) {
    moradoresAtuais = [jogador, ...moradoresAtuais.filter((m) => m.id !== jogador.id)].slice(0, 30);
    if (game.scene.isActive("vila")) this.cenaVila.adicionarMorador(jogador, true);
  },

  jogar(jogador, callbacks) {
    if (game.scene.isActive("vila")) game.scene.stop("vila");
    if (game.scene.isActive("fase")) game.scene.stop("fase");
    game.scene.start("fase", { jogador, callbacks });
  },

  pararFase() { if (game.scene.isActive("fase")) game.scene.stop("fase"); },
  get game() { return game; },
};
