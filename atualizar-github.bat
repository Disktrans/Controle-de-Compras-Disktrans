@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Atualizando repositorio no GitHub
echo ============================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERRO: esta pasta nao e um repositorio Git.
  goto fim
)

echo Verificando alteracoes...
git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao para enviar. Repositorio ja esta atualizado.
  goto fim
)

set /p MSG="Descreva a alteracao (Enter para usar mensagem padrao): "
if "%MSG%"=="" set MSG=Atualizacao automatica

echo.
echo Criando commit...
git commit -m "%MSG%"
if errorlevel 1 (
  echo ERRO ao criar o commit. Veja a mensagem acima.
  goto fim
)

echo.
echo Enviando para o GitHub (pode pedir login na primeira vez)...
git push
if errorlevel 1 (
  echo.
  echo ERRO ao enviar para o GitHub. Verifique sua conexao e login.
  goto fim
)

echo.
echo ============================================
echo   Concluido! Alteracoes enviadas ao GitHub.
echo ============================================

:fim
echo.
pause
