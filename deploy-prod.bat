@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo ==========================================
echo   Gestor SaaS - Deploy PRODUCAO
echo ==========================================

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado no PATH.
  exit /b 1
)

where vercel >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Vercel CLI nao encontrado no PATH.
  echo Instale com: npm i -g vercel
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Esta pasta nao e um repositorio Git.
  exit /b 1
)

for /f "delims=" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i
if "%BRANCH%"=="" (
  echo [ERRO] Nao foi possivel identificar a branch atual.
  exit /b 1
)

echo Branch atual: %BRANCH%

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" (
  set /p COMMIT_MSG=Digite a mensagem de commit (ou ENTER para usar padrao): 
)
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=chore: deploy production"

echo [1/4] Adicionando arquivos...
git add -A
if errorlevel 1 (
  echo [ERRO] Falha no git add.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  echo [2/4] Criando commit...
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo [ERRO] Falha no git commit.
    exit /b 1
  )
) else (
  echo [2/4] Sem alteracoes para commit. Pulando commit.
)

echo [3/4] Enviando para GitHub...
git push origin %BRANCH%
if errorlevel 1 (
  echo [ERRO] Falha no git push.
  exit /b 1
)

echo [4/4] Deploy PRODUCAO na Vercel...
vercel --prod --yes
if errorlevel 1 (
  echo [ERRO] Falha no deploy de producao.
  exit /b 1
)

echo.
echo ✅ Deploy de PRODUCAO concluido com sucesso.
echo.
echo Execute no PowerShell com:
echo   .\deploy-prod.bat "feat: liberar ajuste de planos"

endlocal
exit /b 0
