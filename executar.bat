@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
    echo ERRO: Nao foi possivel abrir a pasta do projeto.
    pause
    exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
    echo ERRO: Instale o Node.js 20 ou superior e abra este ficheiro novamente.
    goto :failure
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERRO: O npm nao foi encontrado no PATH. Verifique a instalacao do Node.js.
    goto :failure
)

if not exist ".env" (
    echo ERRO: Crie o ficheiro .env a partir de .env.example e configure o Jira.
    goto :failure
)

if not exist "node_modules\.bin\tsx.cmd" (
    echo ERRO: As dependencias nao estao instaladas. Execute npm install nesta pasta.
    goto :failure
)

echo A iniciar a automacao. Siga as instrucoes de autenticacao no navegador e no terminal.
call npm.cmd run report
set "result=%errorlevel%"
if not "%result%"=="0" (
    echo.
    echo ERRO: A automacao terminou com o codigo %result%. Consulte as mensagens acima.
    goto :finish
)

echo.
echo Automacao concluida. Consulte os relatorios na pasta output.
goto :finish

:failure
set "result=1"

:finish
echo.
pause
popd
exit /b %result%
