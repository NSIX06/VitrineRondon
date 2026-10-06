# Sobe backend e frontend como processos independentes do terminal que os abriu.
# Logs em %TEMP%\vitrine-backend.log e %TEMP%\vitrine-frontend.log
$raiz = Split-Path -Parent $PSScriptRoot
foreach ($alvo in @(
  @{ nome = 'backend'; pasta = (Join-Path $raiz 'backend') },
  @{ nome = 'frontend'; pasta = (Join-Path $raiz 'frontend') }
)) {
  $saida = Join-Path $env:TEMP "vitrine-$($alvo.nome).log"
  $erros = Join-Path $env:TEMP "vitrine-$($alvo.nome).err.log"
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' -WorkingDirectory $alvo.pasta `
    -WindowStyle Hidden -RedirectStandardOutput $saida -RedirectStandardError $erros
  "$($alvo.nome) iniciado em $($alvo.pasta)"
}
