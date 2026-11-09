-- =====================================================================
--  EXPOTECH PIXEL QUEST - Banco de dados MySQL
--  Compatível com MySQL 8+ e MariaDB 10.4+ (XAMPP)
--
--  Pode ser importado pelo phpMyAdmin (aba "Importar") ou pelo terminal:
--     mysql -u root -p < database/schema.sql
--  O servidor (server.js) também executa este arquivo sozinho ao iniciar.
-- =====================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS expotech_pixel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE expotech_pixel;

-- ---------------------------------------------------------------------
-- JOGADORES: cada herói criado no criador de personagem
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jogadores (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome         VARCHAR(16)  NOT NULL,
  personagem   ENUM('menino','menina') NOT NULL DEFAULT 'menino',
  cabelo       ENUM('curto','longo','rabo','afro','coque') NOT NULL DEFAULT 'curto',
  roupa        ENUM('calca','saia') NOT NULL DEFAULT 'calca',
  acessorio    ENUM('nenhum','gorro','bone','fone','coroa') NOT NULL DEFAULT 'gorro',
  cor_acessorio CHAR(7)     NOT NULL DEFAULT '#ff7a1a',
  cor_cabelo   CHAR(7)      NOT NULL DEFAULT '#4a2a17',
  cor_pele     CHAR(7)      NOT NULL DEFAULT '#f1c27d',
  cor_jaqueta  CHAR(7)      NOT NULL DEFAULT '#13b5a6',
  cor_calca    CHAR(7)      NOT NULL DEFAULT '#2b3a8c',
  cor_tenis    CHAR(7)      NOT NULL DEFAULT '#e8384f',
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jogadores_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PARTIDAS: cada vez que alguém joga a fase
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidas (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  jogador_id   INT UNSIGNED NOT NULL,
  pontos       INT UNSIGNED NOT NULL DEFAULT 0,
  moedas       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  inimigos     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  tempo_seg    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  vidas_restantes TINYINT UNSIGNED NOT NULL DEFAULT 0,
  venceu       TINYINT(1)   NOT NULL DEFAULT 0,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partidas_pontos (pontos),
  KEY idx_partidas_jogador (jogador_id),
  CONSTRAINT fk_partidas_jogador
    FOREIGN KEY (jogador_id) REFERENCES jogadores (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- CONQUISTAS: catálogo de medalhas que podem ser ganhas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conquistas (
  codigo       VARCHAR(30)  NOT NULL,
  titulo       VARCHAR(40)  NOT NULL,
  descricao    VARCHAR(120) NOT NULL,
  icone        VARCHAR(8)   NOT NULL,
  PRIMARY KEY (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- JOGADOR_CONQUISTAS: quais medalhas cada jogador já ganhou (N:N)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jogador_conquistas (
  jogador_id   INT UNSIGNED NOT NULL,
  codigo       VARCHAR(30)  NOT NULL,
  partida_id   INT UNSIGNED NULL,
  obtida_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (jogador_id, codigo),
  CONSTRAINT fk_jc_jogador  FOREIGN KEY (jogador_id) REFERENCES jogadores (id) ON DELETE CASCADE,
  CONSTRAINT fk_jc_conquista FOREIGN KEY (codigo)    REFERENCES conquistas (codigo) ON DELETE CASCADE,
  CONSTRAINT fk_jc_partida  FOREIGN KEY (partida_id) REFERENCES partidas (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo inicial de conquistas (INSERT IGNORE = pode rodar várias vezes)
INSERT IGNORE INTO conquistas (codigo, titulo, descricao, icone) VALUES
  ('primeira_partida', 'Primeiro Passo',   'Jogou a primeira partida na Expotech',        '★'),
  ('colecionador',     'Colecionador',     'Pegou 30 moedas ou mais em uma partida',      '●'),
  ('cacador_bugs',     'Caçador de Bugs',  'Derrotou 6 inimigos em uma partida',          '✖'),
  ('vencedor',         'Missão Cumprida',  'Chegou ao portal no fim da fase',             '▲'),
  ('veloz',            'Veloz',            'Terminou a fase em menos de 90 segundos',     '»'),
  ('intocavel',        'Intocável',        'Terminou a fase sem perder nenhuma vida',     '♥'),
  ('lenda',            'Lenda da Expo',    'Fez 15.000 pontos ou mais',                   '♛');

-- ---------------------------------------------------------------------
-- VIEW DO RANKING: melhor partida de cada jogador
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ranking AS
SELECT
  j.id               AS jogador_id,
  j.nome,
  j.personagem, j.cabelo, j.roupa,
  j.acessorio, j.cor_acessorio, j.cor_cabelo, j.cor_pele,
  j.cor_jaqueta, j.cor_calca, j.cor_tenis,
  MAX(p.pontos)      AS melhor_pontuacao,
  COUNT(p.id)        AS partidas_jogadas,
  SUM(p.venceu)      AS vitorias,
  MIN(CASE WHEN p.venceu = 1 THEN p.tempo_seg END) AS melhor_tempo
FROM jogadores j
JOIN partidas p ON p.jogador_id = j.id
GROUP BY j.id, j.nome, j.personagem, j.cabelo, j.roupa, j.acessorio, j.cor_acessorio, j.cor_cabelo, j.cor_pele,
         j.cor_jaqueta, j.cor_calca, j.cor_tenis;

-- ---------------------------------------------------------------------
-- VIEW DE ESTATÍSTICAS GERAIS DA EXPO
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_estatisticas AS
SELECT
  (SELECT COUNT(*) FROM jogadores)                          AS total_jogadores,
  (SELECT COUNT(*) FROM partidas)                           AS total_partidas,
  (SELECT COALESCE(SUM(moedas), 0) FROM partidas)           AS total_moedas,
  (SELECT COALESCE(SUM(inimigos), 0) FROM partidas)         AS total_inimigos,
  (SELECT COALESCE(SUM(venceu), 0) FROM partidas)           AS total_vitorias,
  (SELECT COALESCE(MAX(pontos), 0) FROM partidas)           AS recorde;
