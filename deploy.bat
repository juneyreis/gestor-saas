@echo off
echo ==========================================
echo   Gestor SaaS - Deploy Simplificado
echo ==========================================

REM --- 1. Preparar Arquivos ---
echo [1/4] Adicionando arquivos...
git add .

REM --- 2. Commit ---
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update automatico"
echo [2/4] Criando commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"

REM --- 3. Enviar para GitHub ---
echo [3/4] Sincronizando e Enviando para GitHub...
git pull origin main
git push origin main

REM --- 4. Deploy Vercel ---
echo [4/4] Executando deploy na Vercel...
vercel --prod --yes

echo.
echo ✅ Deploy concluido!
exit /b 0