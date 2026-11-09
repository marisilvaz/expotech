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

if not exist node_modules (
  echo  Instalando dependencias ^(so na primeira vez^)...
  call npm install --no-audit --no-fund
)

if not exist .env copy .env.example .env >nul

echo.
echo  Lembrete: deixe o MySQL ligado no XAMPP ^(botao Start^).
echo  Abrindo o jogo em tela cheia em 3 segundos... ^(ALT+F4 fecha^)
echo.
start "" cmd /c "timeout /t 3 >nul & start chrome --kiosk --autoplay-policy=no-user-gesture-required http://localhost:3000 || start http://localhost:3000"
node server.js
pause
