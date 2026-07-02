#requires -Version 7
<#
  build.ps1 — assemble the single-file deliverable BusDelaysDashboard.html
  from the sources in src/web/: inlines styles.css and the three scripts
  (xlsx.full.min.js, engine.js, web-app.js) into standalone.html.

  Usage: pwsh ./build.ps1
#>
$ErrorActionPreference = 'Stop'
$web = Join-Path $PSScriptRoot 'src/web'
$enc = [System.Text.UTF8Encoding]::new($false)

$page = [System.IO.File]::ReadAllText((Join-Path $web 'standalone.html'), $enc)

$css  = [System.IO.File]::ReadAllText((Join-Path $web 'styles.css'), $enc)
$page = $page.Replace('<link rel="stylesheet" href="styles.css">', "<style>`r`n$css`r`n</style>")

foreach ($js in 'xlsx.full.min.js', 'engine.js', 'web-app.js') {
  $body = [System.IO.File]::ReadAllText((Join-Path $web $js), $enc)
  $page = $page.Replace("<script src=`"$js`"></script>", "<script>`r`n$body`r`n</script>")
}

if ($page.Contains('<script src=') -or $page.Contains('<link rel="stylesheet"')) {
  throw 'unresolved external reference left in the bundle'
}

$out = Join-Path $PSScriptRoot 'BusDelaysDashboard.html'
[System.IO.File]::WriteAllText($out, $page, $enc)
"built: $out ($((Get-Item $out).Length) bytes)"
