// Converte os sprites (canvas) em texturas e animações do Phaser
import * as S from "../sprites.js";

const CORES_CASA = ["#ff5a5a", "#4f7dff", "#ffb020", "#2fbf71", "#b45cff"];

function strip(scene, key, canvases) {
  if (scene.textures.exists(key)) return;
  const w = canvases[0].width, h = canvases[0].height;
  const c = S.makeCanvas(w * canvases.length, h);
  canvases.forEach((cv, i) => c.getContext("2d").drawImage(cv, i * w, 0));
  const tex = scene.textures.addCanvas(key, c);
  canvases.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
}
function single(scene, key, canvas) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
}

function plataformaMovel() {
  const c = S.makeCanvas(48, 10);
  const x = c.getContext("2d");
  const p = (a, b, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  p(0, 0, S.OUTLINE, 48, 10); p(1, 1, "#ffb020", 46, 6); p(1, 1, "#ffe08a", 46, 2);
  p(1, 7, "#b86b00", 46, 2);
  for (let i = 4; i < 46; i += 8) p(i, 3, S.OUTLINE, 3, 2);
  return c;
}
function checkpoint(ativo, pulso = false) {
  const c = S.makeCanvas(12, 32);
  const x = c.getContext("2d");
  const p = (a, b, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  p(4, 8, S.OUTLINE, 4, 24); p(5, 8, "#c9d3e6", 2, 24);
  p(2, 28, S.OUTLINE, 8, 4); p(3, 29, "#5b6378", 6, 2);
  p(1, 0, S.OUTLINE, 10, 10); p(2, 1, pulso ? "#9ff7b5" : ativo ? "#45e070" : "#ff3d6e", 8, 8);
  p(3, 2, pulso ? "#ffffff" : ativo ? "#c8ffd6" : "#ffb3c4", pulso ? 5 : 3, pulso ? 5 : 3);
  return c;
}
function pixel(cor, w = 2, h = 2) {
  const c = S.makeCanvas(w, h);
  const x = c.getContext("2d"); x.fillStyle = cor; x.fillRect(0, 0, w, h);
  return c;
}
function estrela(cor = "#fff35c") {
  return S.fromMap([".Y.", "YWY", ".Y."], { Y: cor, W: "#ffffff" }, { outline: false });
}

export function registrarTexturas(scene) {
  // índice de cada tile no mapa (veja TILE em fase.js)
  const tiles = [
    S.tileGrass(0), S.tileDirt(0), S.tileStone(0), S.tilePlank(), S.tileMetalTopo(), S.tileMetal(),
    S.tileGrass(1), S.tileGrass(2), S.tileDirt(1), S.tileDirt(2),
    S.tileGrass(0, "e"), S.tileGrass(0, "d"), S.tileDirt(0, "e"), S.tileDirt(0, "d"),
    S.tileStone(1), S.tileStone(2),
  ];
  const tc = S.makeCanvas(16 * tiles.length, 16);
  tiles.forEach((t, i) => tc.getContext("2d").drawImage(t, i * 16, 0));
  single(scene, "tiles", tc);
  single(scene, "grama", tiles[0]);
  single(scene, "terra", tiles[1]);

  strip(scene, "energia", [0, 1, 2, 3, 4, 5, 6, 7].map((f) => S.tileEnergy(f)));
  strip(scene, "fx_poeira", S.fxPoeira());
  strip(scene, "fx_brilho", S.fxBrilho());
  strip(scene, "fx_impacto", S.fxImpacto());
  strip(scene, "fx_explosao", S.fxExplosao());
  strip(scene, "fx_anel", S.fxAnel());
  single(scene, "sol", S.sol());
  single(scene, "bg_montanhas", S.montanhasStrip(427, 96, 6));
  strip(scene, "passaro", [S.passaro(0), S.passaro(1)]);
  single(scene, "nuvem_g", S.cloud(72));
  single(scene, "usado", S.tileUsed());
  single(scene, "rachado", S.tileCracked());
  // chefe e itens novos
  if (!scene.textures.exists("chefe")) {
    // cada pose em duas versões: normal ("a1") e fúria ("a1F")
    const nomes = [...S.POSES_CHEFE, ...S.POSES_CHEFE.map((n) => n + "F")];
    const quadros = nomes.map((n) => S.chefe(n.replace(/F$/, ""), n.endsWith("F")));
    const w = quadros[0].width, h = quadros[0].height;
    const cv = S.makeCanvas(w * nomes.length, h);
    quadros.forEach((q, i) => cv.getContext("2d").drawImage(q, i * w, 0));
    const tex = scene.textures.addCanvas("chefe", cv);
    nomes.forEach((n, i) => tex.add(n, 0, i * w, 0, w, h));
  }
  strip(scene, "pacote", [S.pacote(0), S.pacote(1)]);
  single(scene, "onda", S.onda());
  single(scene, "laser", S.laserTiro());
  single(scene, "chip_laser", S.chipLaser());
  single(scene, "coracao_item", S.coracaoItem());
  single(scene, "disquete", S.disquete());
  single(scene, "trofeu", S.trofeu());
  single(scene, "bg_serv1", S.servidoresStrip(427, 150, 4, true));
  single(scene, "bg_serv2", S.servidoresStrip(427, 110, 8, false));
  const noite = S.makeCanvas(4, 240);
  const gn = noite.getContext("2d").createLinearGradient(0, 0, 0, 240);
  gn.addColorStop(0, "#07071a"); gn.addColorStop(1, "#2a1a4a");
  noite.getContext("2d").fillStyle = gn; noite.getContext("2d").fillRect(0, 0, 4, 240);
  single(scene, "ceu_noite", noite);
  single(scene, "caco", S.caco());
  single(scene, "pedra", S.tileStone());
  single(scene, "espinhos", S.tileSpikes());
  strip(scene, "mola", [S.spring(false), S.spring(true)]);
  strip(scene, "moeda", S.coinFrames());
  strip(scene, "bug", S.bugFrames());
  single(scene, "bug_esmagado", S.bugSquash());
  strip(scene, "virus", S.virusFrames());
  single(scene, "bateria", S.battery());
  single(scene, "coracao", S.heartIcon(true));
  single(scene, "coracao_vazio", S.heartIcon(false));
  single(scene, "nuvem", S.cloud(48));
  single(scene, "nuvem_p", S.cloud(30));
  CORES_CASA.forEach((c, i) => single(scene, `casa_${i}`, S.house(c, i)));
  single(scene, "arvore", S.tree());
  single(scene, "arbusto", S.bush());
  ["#ff5a7a", "#ffd23f", "#b45cff"].forEach((c, i) => single(scene, `flor_${i}`, S.flower(c)));
  single(scene, "portal", S.portalFrame());
  single(scene, "portal_giro", S.portalSwirl());
  single(scene, "bg_cidade", S.skylineStrip(427, 70, 5));
  single(scene, "bg_colinas1", S.hillsStrip(427, 90, "#8fe07a", "#5fbf5a", 3, 0.35));
  single(scene, "bg_colinas2", S.hillsStrip(427, 70, "#4fbf55", "#2f9c3a", 9, 0.3));
  single(scene, "plataforma", plataformaMovel());
  strip(scene, "checkpoint", [checkpoint(false), checkpoint(true), checkpoint(true, true)]);
  const ceu = S.makeCanvas(4, 240);
  const g = ceu.getContext("2d").createLinearGradient(0, 0, 0, 240);
  g.addColorStop(0, "#3aa8ff"); g.addColorStop(0.6, "#8fdcff"); g.addColorStop(1, "#d8f6ff");
  ceu.getContext("2d").fillStyle = g; ceu.getContext("2d").fillRect(0, 0, 4, 240);
  single(scene, "ceu", ceu);
  single(scene, "px_branco", pixel("#ffffff"));
  single(scene, "px_amarelo", pixel("#fff35c"));
  single(scene, "px_terra", pixel("#e3c39a"));
  single(scene, "px_ciano", pixel("#5ef0ff"));
  single(scene, "estrela", estrela());
  single(scene, "estrela_rosa", estrela("#ff9ab3"));

  // fonte pixel
  if (!scene.textures.exists("fonte_pixel")) {
    scene.textures.addCanvas("fonte_pixel", S.fonteCanvas());
    scene.cache.bitmapFont.add("pixel", Phaser.GameObjects.RetroFont.Parse(scene, {
      image: "fonte_pixel", width: S.FONTE_CEL.w, height: S.FONTE_CEL.h,
      chars: S.FONTE_CHARS, charsPerRow: S.FONTE_CEL.porLinha, spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 1,
    }));
  }

  const a = scene.anims;
  const anim = (key, tex, frames, fps, repeat = -1) => {
    if (!a.exists(key)) a.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: fps, repeat });
  };
  anim("moeda_gira", "moeda", [0, 1, 2, 3, 4, 5], 10);
  anim("bug_anda", "bug", [0, 1, 2, 3, 0, 1, 2, 3, 4, 1, 2, 3], 8);
  anim("virus_pisca", "virus", [0, 1, 2, 1, 0, 1, 2, 3], 7);
  if (!a.exists("energia_brilha")) a.create({ key: "energia_brilha", frames: [0, 1, 2, 3, 4, 5, 6, 7].map((f) => ({ key: "energia", frame: f })), frameRate: 14, repeat: -1, repeatDelay: 1400 });
  anim("mola_pula", "mola", [1, 0], 12, 0);
  anim("checkpoint_ativo", "checkpoint", [1, 2], 3);
  anim("passaro_voa", "passaro", [0, 1], 5);
  anim("pacote_gira", "pacote", [0, 1], 8);
  // chefe: animações normais e de fúria (sufixo F)
  for (const f of ["", "F"]) {
    anim(`chefe_anda${f}`, "chefe", [`a1${f}`, `a2${f}`], f ? 10 : 6);
    anim(`chefe_carga${f}`, "chefe", [`c1${f}`, `c2${f}`], 16);
  }
  // efeitos que tocam uma vez
  anim("fx_poeira", "fx_poeira", [0, 1, 2, 3, 4], 18, 0);
  anim("fx_brilho", "fx_brilho", [0, 1, 2, 3, 4], 16, 0);
  anim("fx_impacto", "fx_impacto", [0, 1, 2, 3], 20, 0);
  anim("fx_explosao", "fx_explosao", [0, 1, 2, 3, 4, 5, 6], 16, 0);
  anim("fx_anel", "fx_anel", [0, 1, 2, 3], 16, 0);
}

// Cria (ou reaproveita) a textura do herói com as cores do jogador
export function registrarHeroi(scene, jogador) {
  const cores = { ...S.CORES_PADRAO, ...jogador };
  const assinatura = [cores.personagem, cores.cabelo, cores.roupa, cores.acessorio, cores.cor_acessorio, cores.cor_cabelo, cores.cor_pele,
    cores.cor_jaqueta, cores.cor_calca, cores.cor_tenis].join("").replace(/#/g, "");
  const key = `heroi_${assinatura}`;
  if (!scene.textures.exists(key)) {
    const { canvas, fw, fh, names } = S.heroSheet(cores);
    const tex = scene.textures.addCanvas(key, canvas);
    names.forEach((n, i) => tex.add(n, 0, i * fw, 0, fw, fh));
    const a = scene.anims;
    const seq = (lista) => lista.map((frame) => ({ key, frame }));
    a.create({ key: `${key}_andar`, frames: seq(["run1", "run2", "run3", "run4"]), frameRate: 11, repeat: -1 });
    // parado: respira devagar e pisca de vez em quando
    a.create({ key: `${key}_parado`, frames: seq(["idle", "idle", "idle", "idleB", "idleB", "idleB", "idle", "idle", "blink", "idleB", "idleB", "idleB"]), frameRate: 5, repeat: -1 });
    a.create({ key: `${key}_pulo`, frames: seq(["jump"]), frameRate: 1 });
    a.create({ key: `${key}_queda`, frames: seq(["fall"]), frameRate: 1 });
  }
  return key;
}
