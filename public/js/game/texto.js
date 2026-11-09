// Texto pixel nítido (BitmapText com a fonte desenhada em sprites.js)
import { textoPixel } from "../sprites.js";

const COR = (hex) => parseInt(hex.replace("#", ""), 16);

// ox/oy = âncora (0 = esquerda/topo, 0.5 = centro, 1 = direita/baixo)
export function texto(scene, x, y, str, { cor = "#ffffff", escala = 1, ox = 0, oy = 0 } = {}) {
  const t = scene.add.bitmapText(0, 0, "pixel", textoPixel(str)).setLetterSpacing(-1).setScale(escala).setOrigin(0);
  t.setTint(COR(cor));
  t.ancora = { ox, oy };
  t.posicionar = (nx, ny) => {
    t.setPosition(Math.round(nx - t.width * ox), Math.round(ny - t.height * oy));
    return t;
  };
  t.trocar = (s) => { t.setText(textoPixel(s)); return t; };
  t.cor = (c) => { t.setTint(COR(c)); return t; };
  return t.posicionar(x, y);
}
