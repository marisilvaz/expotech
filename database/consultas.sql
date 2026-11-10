-- =====================================================================
--  CONSULTAS ÚTEIS PARA APRESENTAR O BANCO NA EXPO
--  (cole no phpMyAdmin → aba SQL, com o banco expotech_pixel selecionado)
-- =====================================================================
SET NAMES utf8mb4;
USE expotech_pixel;

-- 1. Top 10 do ranking (usa a VIEW vw_ranking)
SELECT nome, melhor_pontuacao, partidas_jogadas, vitorias, melhor_tempo
FROM vw_ranking
ORDER BY melhor_pontuacao DESC
LIMIT 10;

-- 2. Números gerais do dia
SELECT * FROM vw_estatisticas;

-- 3. Últimos heróis criados
SELECT id, nome, acessorio, cor_jaqueta, criado_em
FROM jogadores
ORDER BY criado_em DESC
LIMIT 20;

-- 4. Acessório mais escolhido pelos visitantes
SELECT acessorio, COUNT(*) AS quantidade
FROM jogadores
GROUP BY acessorio
ORDER BY quantidade DESC;

-- 5. Cor de jaqueta mais popular
SELECT cor_jaqueta, COUNT(*) AS quantidade
FROM jogadores
GROUP BY cor_jaqueta
ORDER BY quantidade DESC
LIMIT 5;

-- 6. Quantas pessoas ganharam cada conquista (JOIN + LEFT JOIN)
SELECT c.icone, c.titulo, COUNT(jc.jogador_id) AS jogadores
FROM conquistas c
LEFT JOIN jogador_conquistas jc ON jc.codigo = c.codigo
GROUP BY c.codigo, c.icone, c.titulo
ORDER BY jogadores DESC;

-- 7. Partidas por hora (movimento do estande)
SELECT HOUR(criado_em) AS hora, COUNT(*) AS partidas
FROM partidas
GROUP BY HOUR(criado_em)
ORDER BY hora;

-- 8. Taxa de vitória (% de partidas que chegaram ao portal)
SELECT ROUND(100 * SUM(venceu) / COUNT(*), 1) AS taxa_vitoria_pct
FROM partidas;

-- 9. Conquistas de um jogador específico (troque o 1 pelo id)
SELECT j.nome, c.titulo, jc.obtida_em
FROM jogador_conquistas jc
JOIN jogadores j  ON j.id = jc.jogador_id
JOIN conquistas c ON c.codigo = jc.codigo
WHERE j.id = 1;

-- 10. Quantos visitantes derrotaram o Rei Glitch
SELECT COUNT(DISTINCT jogador_id) AS derrotaram_o_chefe
FROM partidas WHERE chefe_derrotado = 1;

-- 11. Até onde as pessoas chegam (funil do jogo)
SELECT
  SUM(fase_alcancada >= 1) AS comecaram,
  SUM(fase_alcancada >= 2) AS chegaram_no_chefe,
  SUM(chefe_derrotado)     AS venceram
FROM partidas;

-- 12. PC x celular
SELECT dispositivo, COUNT(*) AS partidas, ROUND(AVG(pontos)) AS media_pontos
FROM partidas GROUP BY dispositivo;

-- 13. Ranking só de hoje
SELECT j.nome, MAX(p.pontos) AS melhor
FROM partidas p JOIN jogadores j ON j.id = p.jogador_id
WHERE p.criado_em >= CURDATE()
GROUP BY j.id, j.nome
ORDER BY melhor DESC
LIMIT 10;
