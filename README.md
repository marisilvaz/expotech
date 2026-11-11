# ★ EXPOTECH PIXEL QUEST

Jogo 8-bit para estande de exposição: o visitante **cria um herói em pixel art**, atravessa o **Vale Expotech**, enfrenta o chefe **Rei Glitch** na Sala dos Servidores e entra no **Hall da Fama**. Todo herói criado passa a **morar na Vila Expotech**, que aparece andando no fundo da tela inicial.

Funciona no **PC da expo** (teclado ou controle) e no **celular** dos visitantes (joystick na tela), com o mesmo ranking.

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

### 4. Visitantes jogando no celular 📱

**Pela internet, com ngrok (recomendado na expo: não precisa estar na mesma rede)**
1. Dê dois cliques em `INICIAR.bat`: ele liga o servidor **e o ngrok** (se o ngrok estiver instalado). Ou rode `ngrok http 3000` em outra janela, como sempre.
2. O servidor descobre sozinho o endereço que o ngrok gerou e o **QR code da tela inicial passa a apontar direto para ele**. Não precisa copiar nada.
3. Reiniciou o ngrok e o endereço mudou? O QR code se atualiza sozinho em até 15 segundos.
4. Na primeira vez em cada celular, o ngrok gratuito mostra uma página de aviso: é só tocar em **Visit Site**.

> **Cota do ngrok gratuito:** 1 GB de dados e 20.000 requisições por mês. Cada visitante gasta cerca de 0,5 MB e 15 a 20 requisições, ou seja, a cota dá para aproximadamente **1.000 visitantes por mês**. Acompanhe no painel do ngrok.
> Quer usar um endereço fixo em vez do ngrok? Coloque `PUBLIC_URL=https://...` no arquivo `.env`.

**Pela rede local (sem internet)**
1. Sem ngrok ligado, o QR code aponta para o endereço do PC na rede Wi-Fi. PC e celulares precisam estar na **mesma rede**.
2. Na primeira vez, o **Windows pode perguntar sobre o Firewall**: clique em **Permitir acesso** (rede privada).
3. Wi-Fi de escola/evento às vezes bloqueia um celular de ver o outro; nesse caso use o ngrok.

Nos dois casos todo mundo joga no mesmo banco: o herói criado no celular aparece na Vila do PC e entra no ranking.

**iPhone:** funciona no Safari. O som toca só com a chave lateral de silencioso desligada (regra do próprio iPhone), e o iPhone não tem tela cheia nem vibração pelo navegador.

**Carregamento leve:** o servidor junta as bibliotecas e o código do jogo em 2 arquivos compactados (de ~2,1 MB em 27 arquivos para ~0,5 MB em 11) e mostra uma tela de "CARREGANDO..." enquanto chegam. Isso é automático: continue editando os arquivos em `public/js` normalmente.

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

| Ação | Teclado | Controle (gamepad) | Celular |
|---|---|---|---|
| Andar | ← → ou A D | Direcional / analógico | Arrastar o joystick (lado esquerdo) |
| Correr | Shift ou X | B / X | Arrastar o joystick até o fim, ou segurar **B** |
| Pular (segure = pulo mais alto) | Espaço, ↑, W ou Z | A | Botão **A** |
| Atirar (com Chip Laser) | X ou Shift | B / X | Botão **B** |
| Pausar | Esc ou P | Start | Botão **II** |
| Menus | Setas + Enter | Direcional + A (B volta) | Tocar |
| Som liga/desliga | M | — | ♪ |
| Tela cheia | F | — | automático |
| Efeito TV de tubo (desligado por padrão) | C | — | — |

No celular em pé, o jogo fica em cima e os controles embaixo, como um videogame portátil. Deitado, os controles ficam por cima do jogo. O celular vibra ao pular, pisar e levar dano (Android).

---

## O que tem no jogo

- **Tela de título** com logo animado, música chiptune e a Vila ao fundo
- **Criador de herói:** menino ou menina, 5 penteados (curto, longo, rabo, afro, coque), calça ou saia, 5 opções de acessório (nada, gorro, boné, fone, coroa), cores de cabelo, pele, jaqueta, calça e tênis, botão sortear com animação de caça-níquel
- **Fase 1 "Vale Expotech":** moedas, blocos ⚡ (batendo por baixo), blocos rachados que quebram com cabeçada, pranchas leves (atravessa pulando por baixo e para em cima), Bugzinhos (pode pisar, combo de pontos), Vírus espinhoso (não pode pisar!), espinhos, mola, plataformas móveis, checkpoints e portal
- **Power-ups:** **Chip Turbo** (10s de velocidade, pulo duplo e invencibilidade com rastro arco-íris), **Chip Laser** (15s atirando raios com o botão B) e **Coração** (+1 vida)
- **3 disquetes escondidos** na Fase 1 (2.000 pontos cada + conquista)
- **Fase 2 – Batalha com o chefe REI GLITCH** na Sala dos Servidores:
  - entrada com tremor, rugido, música própria e barra de vida
  - ataques: andar, **investida** (com aviso "!"), **salto com onda de choque** (a sombra mostra onde ele cai), **tiro de pacotes de dados** e, na fúria, **chuva de pacotes do teto** e **Bugzinhos**
  - a arena não tem power-ups: é só você, o pulo e as pranchas
  - com metade da vida ele entra em **FÚRIA**: fica vermelho, com glitch na tela, mais rápido e a música acelera
  - como vencer: **pisar na cabeça** (melhor quando ele está **TONTO** depois de bater na parede: dano crítico); as pranchas servem de esconderijo contra a investida
  - derrotado, ele explode e solta um **troféu** (se ninguém pegar em 5s, o troféu vai sozinho até o herói)
  - perdeu? **CONTINUAR?** com contagem regressiva: tenta a batalha de novo sem refazer a Fase 1 (até 2 vezes)
- **Sensação de jogo:** pulo com "coyote time" e "buffer", impacto com congelamento rápido nos golpes, tremor de tela, câmera que olha para a frente, vibração no celular
- **Pixel art e animações (tudo desenhado em código):**
  - herói com 11 quadros: respira e pisca parado, corrida de 4 quadros, pulo, queda, susto e comemoração; estica ao pular e amassa ao aterrissar
  - efeitos animados: poeira ao correr/frear/aterrissar, brilho nas moedas, impacto nos golpes, explosões e anéis de choque
  - chão com variações e bordas nos buracos, moedas girando em 6 quadros, blocos ⚡ com brilho, inimigos animados
  - cenário com sol pulsando, montanhas nevadas, cidade, colinas, pássaros e nuvens em parallax; arena com servidores piscando e telões
  - Rei Glitch com poses próprias para andar, investida, salto, tiro, tonto e dano, mais fumaça e faíscas na fúria
  - placar com animação ao pegar moeda, perder vida e ganhar pontos; dica de controles no começo da Fase 1 (teclado ou toque)
- **Menu de pausa:** continuar, recomeçar fase ou sair
- **Tela de resultado** com contagem de pontos, posição no ranking, confete de novo recorde e **conquistas**
- **Hall da Fama** (top 10 com o avatar de cada jogador, abas **GERAL** e **HOJE**, coroa ♛ para quem derrotou o chefe) e estatísticas da expo
- **QR code na tela inicial** para os visitantes jogarem no celular (aponta sozinho para o endereço do ngrok)
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
| `partidas` | cada partida (pontos, moedas, inimigos, tempo, vidas, fase alcançada, chefe derrotado, disquetes, PC ou celular) |
| `conquistas` | catálogo das 10 medalhas |
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
| GET | `/api/ranking?limite=10&periodo=hoje` | Hall da Fama (`geral` ou `hoje`) |
| GET | `/api/rede` | endereço público do ngrok (se ligado) e endereços na rede local (usado pelo QR code) |
| GET | `/api/estatisticas` | números gerais |
| GET | `/api/jogadores/:id/conquistas` | medalhas de um jogador |

---

## Tecnologias

| Parte | Biblioteca |
|---|---|
| Motor do jogo, física, partículas, câmera | **Phaser 4** |
| Animações da interface (logo, transições, contagem, confete) | **GSAP 3** |
| Música e efeitos chiptune gerados em tempo real | **Tone.js 15** |
| Fontes pixel | Press Start 2P e VT323 (menus) + fonte bitmap própria 5x7 (dentro do jogo) |
| QR code | **qrcode-generator** |
| Instalar como app no celular | Web App Manifest (PWA) |
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
    │       ├── fase.js        ← fases, herói, itens, pausa, continuar
    │       ├── chefe.js       ← o Rei Glitch (ataques e fúria)
    │       ├── level-data.js  ← os mapas da Fase 1 e da arena (edite as letras!)
    │       ├── vila.js        ← a Vila dos visitantes
    │       ├── textures.js · cenario.js · input.js · index.js
    └── vendor/            ← Phaser, GSAP, Tone.js e fontes (offline)
```

### Quer mexer?
- **Mudar a fase:** edite as letras em `public/js/game/level-data.js` (a legenda está no topo do arquivo).
- **Deixar o chefe mais fácil ou difícil:** no topo de `public/js/game/chefe.js` estão a vida dele (`VIDA_CHEFE`) e o dano de cada golpe.
- **Mudar a música:** as partituras estão em texto em `public/js/audio.js` (`"C5 - E5 . G5"` = nota, segura, nota, pausa, nota).
- **Mudar o visual do herói:** os mapas de pixel estão em `public/js/sprites.js`.
