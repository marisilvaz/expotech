@echo off
chcp 65001 >nul
title EXPOTECH PIXEL QUEST
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js nao encontrado. Instale em https://nodejs.org ^(versao LTS^) e rode de novo.
  pause
  exit /b
)

if not exist node_modules\esbuild (
  echo  Instalando dependencias ^(so na primeira vez ou apos atualizar^)...
  call npm install --no-audit --no-fund
)

if not exist .env copy .env.example .env >nul

rem --- ngrok: liga sozinho se estiver instalado e ainda nao estiver rodando ---
where ngrok >nul 2>nul
if errorlevel 1 goto sem_ngrok
curl -s -m 2 http://127.0.0.1:4040/api/tunnels >nul 2>nul
if not errorlevel 1 goto ngrok_ok
echo  Ligando o ngrok em uma janela minimizada...
start "ngrok" /min ngrok http 3000
goto ngrok_ok
:sem_ngrok
echo  [i] ngrok nao encontrado no PATH: se quiser acesso pela internet, rode "ngrok http 3000" em outra janela.
:ngrok_ok

echo.
echo  Lembrete: deixe o MySQL ligado no XAMPP ^(botao Start^).
echo  Abrindo o jogo em tela cheia em 3 segundos... ^(ALT+F4 fecha^)
echo.
start "" cmd /c "timeout /t 3 >nul & start chrome --kiosk --autoplay-policy=no-user-gesture-required http://localhost:3000 || start http://localhost:3000"
node server.js
pause
