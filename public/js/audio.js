// =====================================================================
//  ÁUDIO CHIPTUNE com Tone.js
//  Todas as músicas e efeitos foram compostos para este projeto.
// =====================================================================
const T = window.Tone;
const TR = T.getTransport();

let iniciado = false;
let mudo = false;
try { mudo = localStorage.getItem("expo_mudo") === "1"; } catch {}

const master = new T.Volume(-10).toDestination();
const musica = new T.Volume(-4).connect(master);
const efeitos = new T.Volume(0).connect(master);
master.mute = mudo;

// ---------- instrumentos 8-bit ----------
const lead = new T.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.005, decay: 0.12, sustain: 0.35, release: 0.06 } }).connect(musica);
lead.volume.value = -9;
const harm = new T.Synth({ oscillator: { type: "pulse", width: 0.25 }, envelope: { attack: 0.002, decay: 0.08, sustain: 0.1, release: 0.04 } }).connect(musica);
harm.volume.value = -16;
const bass = new T.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.05 } }).connect(musica);
bass.volume.value = -2;
const kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 5, envelope: { attack: 0.001, decay: 0.18, sustain: 0 } }).connect(musica);
kick.volume.value = -8;
const snare = new T.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).connect(musica);
snare.volume.value = -20;
const hatFiltro = new T.Filter(7000, "highpass").connect(musica);
const hat = new T.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } }).connect(hatFiltro);
hat.volume.value = -22;

// efeitos sonoros
const sfxPoly = new T.PolySynth(T.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.002, decay: 0.08, sustain: 0.2, release: 0.05 } }).connect(efeitos);
sfxPoly.volume.value = -12;
const sfxSweep = new T.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.002, decay: 0.05, sustain: 0.5, release: 0.05 } }).connect(efeitos);
sfxSweep.volume.value = -14;
const sfxTri = new T.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 0.1, sustain: 0.4, release: 0.08 } }).connect(efeitos);
sfxTri.volume.value = -4;
const sfxNoise = new T.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).connect(efeitos);
sfxNoise.volume.value = -8;

// ---------- partituras (cada token = colcheia; "-" segura a nota; "." pausa) ----------
const SONGS = {
  titulo: {
    bpm: 132,
    lead: `D5 - B4 G4 B4 D5 G5 - | F#5 - E5 D5 A4 - D5 - | E5 - G5 E5 B4 - E5 G5 | G5 - E5 C5 E5 G5 C6 -
           B5 - A5 G5 D5 - G5 - | A5 - F#5 D5 A4 B4 C#5 D5 | E5 G5 E5 C5 G4 C5 E5 G5 | F#5 - - - D5 - . .`,
    harm: `. B3 . B3 . B3 . B3 | . A3 . A3 . F#3 . F#3 | . G3 . G3 . G3 . G3 | . G3 . G3 . E3 . E3
           . B3 . B3 . D4 . D4 | . F#3 . F#3 . A3 . A3 | . E3 . E3 . G3 . G3 | . F#3 . F#3 . A3 . A3`,
    bass: `G2 . D3 . G2 . D3 . | D2 . A2 . D2 . A2 . | E2 . B2 . E2 . B2 . | C3 . G2 . C3 . G2 .
           G2 . D3 . G2 . D3 . | D2 . A2 . D2 . A2 . | C3 . G2 . C3 . G2 . | D2 . A2 . D3 . A2 .`,
    drum: "k . h . s . h h ".repeat(8),
  },
  fase: {
    bpm: 150,
    lead: `E5 . G5 . . C6 . G5 | A5 . . E5 . C5 . E5 | F5 . A5 . . C6 . A5 | G5 . . D5 . B4 . D5
           E5 G5 C6 G5 E5 . C5 . | A4 C5 E5 A5 . G5 . E5 | F5 . E5 . D5 . C5 . | D5 . . B4 . G4 . .
           C6 - - B5 A5 - G5 - | A5 - - G5 E5 - C5 - | D5 - F5 - A5 - C6 - | B5 - G5 - D5 - . .
           C6 - B5 - A5 - G5 - | F5 - A5 - C6 - F5 - | E5 - G5 - D5 - B4 - | C5 - - - . . . .`,
    harm: `. E4 . E4 . G4 . E4 | . C4 . C4 . E4 . C4 | . A3 . A3 . C4 . A3 | . B3 . B3 . D4 . B3
           . E4 . E4 . G4 . E4 | . C4 . C4 . E4 . C4 | . A3 . A3 . C4 . A3 | . B3 . B3 . D4 . B3
           . C4 . C4 . E4 . C4 | . A3 . A3 . C4 . A3 | . F3 . F3 . A3 . F3 | . B3 . B3 . D4 . B3
           . C4 . C4 . E4 . C4 | . A3 . A3 . C4 . A3 | . B3 . B3 . D4 . B3 | . E4 . E4 . . . .`,
    bass: `C3 . . G2 C3 . G2 . | A2 . . E2 A2 . E2 . | F2 . . C3 F2 . C3 . | G2 . . D3 G2 . D3 .
           C3 . . G2 C3 . G2 . | A2 . . E2 A2 . E2 . | F2 . . C3 F2 . C3 . | G2 . . D3 G2 . B2 .
           A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 .
           A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . .`,
    drum: "k . h k s . h h ".repeat(16),
  },
  vila: {
    bpm: 108,
    lead: `G4 - B4 - D5 - B4 - | C5 - E5 - G5 - E5 - | A4 - C5 - E5 - D5 C5 | B4 - - - . . . .
           G4 - B4 - D5 - G5 - | E5 - C5 - A4 - C5 - | D5 - - C5 B4 - A4 - | G4 - - - . . . .`,
    harm: `. D4 . D4 . D4 . D4 | . E4 . E4 . E4 . E4 | . C4 . C4 . C4 . C4 | . D4 . D4 . D4 . D4
           . D4 . D4 . D4 . D4 | . C4 . C4 . C4 . C4 | . F#3 . F#3 . F#3 . F#3 | . B3 . B3 . . . .`,
    bass: `G2 . . . D3 . . . | C3 . . . G2 . . . | A2 . . . E2 . . . | D3 . . . A2 . . .
           G2 . . . D3 . . . | A2 . . . E2 . . . | D3 . . . A2 . . . | G2 . . . D3 . G2 .`,
    drum: "k . h . . . h . ".repeat(8),
  },
};
const JINGLES = {
  vitoria: { bpm: 170, lead: "C5 E5 G5 C6 . G5 C6 - E6 - - - - - . .", bass: "C3 . C3 . C3 . G2 - C3 - - - - - . ." },
  derrota: { bpm: 110, lead: "G4 . F#4 . F4 . E4 - - - . . . .", bass: "C3 . B2 . A#2 . A2 - - - . . . ." },
  inicio:  { bpm: 190, lead: "G4 C5 E5 G5 E5 G5 C6 - - .", bass: "C3 . C3 . G2 . C3 - - ." },
};

const STEP = 96; // ticks por colcheia (PPQ=192)
function parse(texto) {
  const tokens = texto.replace(/\|/g, " ").trim().split(/\s+/);
  const eventos = [];
  tokens.forEach((t, i) => {
    if (t === "-" && eventos.length) { eventos[eventos.length - 1].len++; return; }
    if (t === "." || t === "-") return;
    eventos.push({ step: i, note: t, len: 1 });
  });
  return { eventos, total: tokens.length };
}
function parseDrum(texto) {
  const tokens = texto.trim().split(/\s+/);
  return { eventos: tokens.map((t, i) => ({ step: i, t })).filter((e) => e.t !== "."), total: tokens.length };
}

let partes = [];
let musicaAtual = null;

function pararPartes() {
  partes.forEach((p) => { p.stop(); p.dispose(); });
  partes = [];
}

function criarParte(track, instr, { loop, subdiv = 1 }) {
  const { eventos, total } = parse(track);
  const p = new T.Part((time, ev) => {
    instr.triggerAttackRelease(ev.note, `${Math.round(ev.len * STEP * subdiv * 0.92)}i`, time);
  }, eventos.map((e) => [`${e.step * STEP * subdiv}i`, e]));
  p.loop = loop;
  p.loopEnd = `${total * STEP * subdiv}i`;
  return { p, dur: total * STEP * subdiv };
}

function tocarMusica(nome) {
  if (!iniciado || musicaAtual === nome) return;
  const song = SONGS[nome];
  if (!song) return;
  pararPartes();
  TR.stop();
  TR.cancel();
  TR.PPQ = 192;
  TR.bpm.value = song.bpm;
  musicaAtual = nome;
  partes.push(criarParte(song.lead, lead, { loop: true }).p);
  partes.push(criarParte(song.harm, harm, { loop: true }).p);
  partes.push(criarParte(song.bass, bass, { loop: true }).p);
  const d = parseDrum(song.drum);
  const pd = new T.Part((time, ev) => {
    if (ev.t.includes("k")) kick.triggerAttackRelease("C1", "16n", time);
    if (ev.t.includes("s")) snare.triggerAttackRelease("16n", time);
    if (ev.t.includes("h")) hat.triggerAttackRelease("32n", time);
  }, d.eventos.map((e) => [`${e.step * STEP}i`, e]));
  pd.loop = true; pd.loopEnd = `${d.total * STEP}i`;
  partes.push(pd);
  partes.forEach((p) => p.start(0));
  TR.start("+0.05");
}

function tocarJingle(nome, depois) {
  if (!iniciado) return;
  const j = JINGLES[nome];
  pararPartes();
  TR.stop();
  TR.cancel();
  musicaAtual = null;
  TR.bpm.value = j.bpm;
  const a = criarParte(j.lead, lead, { loop: false, subdiv: 0.5 });
  const b = criarParte(j.bass, bass, { loop: false, subdiv: 0.5 });
  partes.push(a.p, b.p);
  partes.forEach((p) => p.start(0));
  TR.start("+0.05");
  if (depois) TR.scheduleOnce(() => T.getDraw().schedule(() => tocarMusica(depois), T.now()), `${a.dur + STEP * 4}i`);
}

// ---------- efeitos ----------
function sweep(f1, f2, dur, synth = sfxSweep) {
  const t = T.now();
  synth.triggerAttack(f1, t);
  synth.frequency.cancelScheduledValues(t);
  synth.frequency.setValueAtTime(f1, t);
  synth.frequency.exponentialRampToValueAtTime(f2, t + dur);
  synth.triggerRelease(t + dur);
}
function arpejo(notas, passo = 0.04, dur = "32n") {
  const t = T.now();
  notas.forEach((n, i) => sfxPoly.triggerAttackRelease(n, dur, t + i * passo));
}

const SFX = {
  pulo: () => sweep(260, 760, 0.13),
  puloDuplo: () => sweep(420, 1200, 0.12),
  moeda: () => arpejo(["A5", "C#6", "E6", "A6"], 0.035),
  pisar: () => { sfxNoise.triggerAttackRelease("16n"); sweep(320, 70, 0.12, sfxTri); },
  bater: () => sweep(140, 90, 0.08, sfxTri),
  quebrar: () => { sfxNoise.triggerAttackRelease("8n"); sweep(260, 60, 0.18, sfxTri); },
  bloco: () => { sweep(140, 90, 0.06, sfxTri); arpejo(["E6", "B6"], 0.05); },
  turbo: () => arpejo(["C5", "E5", "G5", "C6", "E6", "G6", "C7", "E7"], 0.05, "16n"),
  dano: () => sweep(700, 120, 0.35),
  mola: () => { sweep(180, 980, 0.22, sfxTri); },
  portal: () => { sweep(200, 1600, 0.6); arpejo(["C6", "G6", "C7"], 0.12, "16n"); },
  menu: () => arpejo(["E6"], 0.03, "64n"),
  ok: () => arpejo(["C6", "G6"], 0.05, "32n"),
  voltar: () => arpejo(["G5", "C5"], 0.05, "32n"),
  sortear: () => arpejo(["C5", "G5", "E5", "C6", "A5", "E6"], 0.03, "64n"),
  salvo: () => arpejo(["G5", "B5", "D6", "G6"], 0.06, "16n"),
  conquista: () => arpejo(["E6", "G6", "B6", "E7", "B6", "E7"], 0.06, "16n"),
};

export const Audio = {
  async iniciar() {
    if (iniciado) return;
    await T.start();
    iniciado = true;
  },
  get iniciado() { return iniciado; },
  musica: (nome) => tocarMusica(nome),
  jingle: (nome, depois) => tocarJingle(nome, depois),
  parar() { pararPartes(); TR.stop(); musicaAtual = null; },
  sfx(nome) { if (iniciado && SFX[nome]) try { SFX[nome](); } catch { /* ignora sobreposição */ } },
  turbo(ligado) {
    if (!iniciado || musicaAtual !== "fase") return;
    TR.bpm.rampTo(SONGS.fase.bpm * (ligado ? 1.18 : 1), 0.3);
  },
  get mudo() { return mudo; },
  alternarMudo() {
    mudo = !mudo;
    master.mute = mudo;
    try { localStorage.setItem("expo_mudo", mudo ? "1" : "0"); } catch {}
    return mudo;
  },
};
