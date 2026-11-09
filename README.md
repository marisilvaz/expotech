# ★ EXPOTECH PIXEL QUEST

Jogo 8-bit para estande de exposição: o visitante **cria um herói em pixel art**, **joga uma fase de plataforma** com ele e entra no **Hall da Fama**. Todo herói criado passa a **morar na Vila Expotech**, que aparece andando no fundo da tela inicial.

Sprites, músicas e efeitos sonoros foram feitos do zero, em código, para este projeto.

---

## Como rodar no PC da expo

### 1. Instale (uma vez só)
- **Node.js LTS** (20.12 ou mais novo): https://nodejs.org
- **XAMPP** (traz o MySQL/MariaDB): https://www.apachefriends.org

### 2. Ligue o banco
Abra o **XAMPP Control Panel** e clique em **Start** na linha **MySQL**.

### 3. Abra o jogo
- **Windows:** dê dois cliques em **`INICIAR.bat`**. Ele instala as dependências na primeira vez, cria o banco sozinho e abre o Chrome em tela cheia (modo quiosque).
- **Terminal (qualquer sistema):**
  ```bash
  npm install
  npm start
  ```
  Depois acesse **http://localhost:3000**

> O servidor cria o banco `expotech_pixel` e todas as tabelas automaticamente na primeira vez.
> Se você já tinha o banco da versão anterior, ele ganha as colunas novas sozinho, sem apagar nada.
> Se o MySQL estiver desligado, o jogo **continua funcionando** (salva no navegador) e o servidor tenta reconectar a cada 10 segundos.

### Configuração do banco (`.env`)
Copie `.env.example` para `.env` se precisar mudar algo. O padrão já é o do XAMPP:

| Variável | Padrão |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | *(vazio)* |
| `DB_NAME` | `expotech_pixel` |
| `PORT` | `3000` |

### Zerar o ranking (começo de um novo dia)
```bash
npm run db:reset
```

---

## Controles

| Ação | Teclado | Controle (gamepad) |
|---|---|---|
| Andar | ← → ou A D | Direcional / analógico |
| Pular (segure = pulo mais alto) | Espaço, ↑, W ou Z | A |
| Correr | Shift ou X | B / X |
| Pausar | Esc ou P | Start |
| Menus | Setas + Enter | Direcional + A (B volta) |
| Som liga/desliga | M | — |
| Tela cheia | F | — |
| Efeito TV de tubo (desligado por padrão) | C | — |

Em tablet/celular aparecem botões de toque na tela.

---

## O que tem no jogo

- **Tela de título** com logo animado, música chiptune e a Vila ao fundo
- **Criador de herói:** menino ou menina, 5 penteados (curto, longo, rabo, afro, coque), calça ou saia, 5 opções de acessório (nada, gorro, boné, fone, coroa), cores de cabelo, pele, jaqueta, calça e tênis, botão sortear com animação de caça-níquel
- **Fase "Vale Expotech":** moedas, blocos ⚡ (batendo por baixo), blocos rachados que quebram com cabeçada, pranchas leves (atravessa pulando por baixo e para em cima), Bugzinhos (pode pisar, combo de pontos), Vírus espinhoso (não pode pisar!), espinhos, mola, plataformas móveis, checkpoints, **Chip Turbo** (10s de velocidade, pulo duplo e invencibilidade com rastro arco-íris) e portal de chegada
- **Tela de resultado** com contagem de pontos, posição no ranking, confete de novo recorde e **conquistas**
- **Hall da Fama** (top 10 com o avatar de cada jogador) e estatísticas da expo
- **Modo quiosque:** sem ninguém mexendo, a tela inicial alterna sozinha entre ranking e Vila; menus voltam ao início após 90s e a partida encerra após 60s parada

---

## Banco de dados (MySQL)

Arquivo: [`database/schema.sql`](database/schema.sql) (pode importar pelo phpMyAdmin)

```
jogadores ──< partidas
    │
    └──< jogador_conquistas >── conquistas
```

| Tabela / View | Para quê |
|---|---|
| `jogadores` | cada herói criado (nome, menino/menina, cabelo, roupa, acessório e 6 cores) |
| `partidas` | cada partida (pontos, moedas, inimigos, tempo, vidas, venceu) |
| `conquistas` | catálogo das 7 medalhas |
| `jogador_conquistas` | quais medalhas cada jogador ganhou (N:N) |
| `vw_ranking` | melhor pontuação de cada jogador |
| `vw_estatisticas` | totais da expo (heróis, partidas, moedas, recorde…) |

Consultas prontas para mostrar na apresentação: [`database/consultas.sql`](database/consultas.sql)

### API (Node.js + Express)

| Método | Rota | Faz |
|---|---|---|
| GET | `/api/saude` | testa a conexão com o banco |
| POST | `/api/jogadores` | cria um herói |
| GET | `/api/jogadores?limite=30` | últimos heróis (Vila) |
| POST | `/api/partidas` | salva a partida, devolve posição e conquistas novas |
| GET | `/api/ranking?limite=10` | Hall da Fama |
| GET | `/api/estatisticas` | números gerais |
| GET | `/api/jogadores/:id/conquistas` | medalhas de um jogador |

---

## Tecnologias

| Parte | Biblioteca |
|---|---|
| Motor do jogo, física, partículas, câmera | **Phaser 4** |
| Animações da interface (logo, transições, contagem, confete) | **GSAP 3** |
| Música e efeitos chiptune gerados em tempo real | **Tone.js 15** |
| Fontes pixel | Press Start 2P e VT323 |
| Servidor e API | **Node.js + Express 5** |
| Banco | **MySQL / MariaDB** via `mysql2` |

Todas as bibliotecas do navegador estão em `public/vendor/`, então **o jogo funciona sem internet** no dia da expo.

---

## Estrutura

```
expotech-pixel-quest/
├── INICIAR.bat            ← clique duplo no Windows
├── server.js              ← servidor + API + conexão MySQL
├── database/
│   ├── schema.sql         ← tabelas, views e conquistas
│   ├── consultas.sql      ← consultas para a apresentação
│   └── reset.js           ← npm run db:reset
└── public/
    ├── index.html
    ├── css/style.css
    ├── js/
    │   ├── app.js         ← telas, criador, ranking, modo quiosque
    │   ├── sprites.js     ← TODA a pixel art (mapas de letras)
    │   ├── audio.js       ← músicas e efeitos (partituras em texto)
    │   ├── api.js         ← comunicação com o banco + modo offline
    │   └── game/
    │       ├── fase.js        ← a fase de plataforma
    │       ├── level-data.js  ← o mapa da fase (edite as letras!)
    │       ├── vila.js        ← a Vila dos visitantes
    │       ├── textures.js · cenario.js · input.js · index.js
    └── vendor/            ← Phaser, GSAP, Tone.js e fontes (offline)
```

### Quer mexer?
- **Mudar a fase:** edite as letras em `public/js/game/level-data.js` (a legenda está no topo do arquivo).
- **Mudar a música:** as partituras estão em texto em `public/js/audio.js` (`"C5 - E5 . G5"` = nota, segura, nota, pausa, nota).
- **Mudar o visual do herói:** os mapas de pixel estão em `public/js/sprites.js`.
