#requires -Version 7
<#
  memgraph.ps1 - Variant A launcher (native Windows).

  Thin wrapper over the canonical Python engine memory-graph/scripts/memgraph.py.
  Resolves repo root + DB, points sqlite-vec at vendor/vec0.dll, loads
  OPENAI_API_KEY from <repo>\.env, forces UTF-8 I/O (the memory is Russian),
  then runs the engine with the project venv python if present, else system
  python. Mirrors the bash `memgraph` wrapper used on the reference machines.

  Usage:   pwsh memory-graph/memgraph.ps1 <command> [args...]
  Backend: OpenAI text-embedding-3-small@512 + sqlite-vec (hybrid recall).
  Note:    `session-context` is pure SQL (no key / no vec0 needed), so the
           SessionStart hook works offline and on first boot.
#>
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

# UTF-8 everywhere so Cyrillic from the engine is not mangled in the console.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'

# --- repo root -----------------------------------------------------------
$repo = $null
try { $repo = (& git rev-parse --show-toplevel 2>$null) } catch { $repo = $null }
if (-not $repo) {
  if ($env:CLAUDE_PROJECT_DIR) { $repo = $env:CLAUDE_PROJECT_DIR }
  else { $repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path }
}
$repo = ("$repo").Trim()

$mg     = $PSScriptRoot
$engine = Join-Path $mg 'scripts/memgraph.py'

# --- DB ------------------------------------------------------------------
if (-not $env:MEMGRAPH_DB) { $env:MEMGRAPH_DB = Join-Path $repo '.agent/memory.db' }
$db = $env:MEMGRAPH_DB

# Clean idle for the SessionStart hook before the DB exists.
if (-not (Test-Path $db)) {
  if ($args.Count -ge 1 -and $args[0] -eq 'session-context') {
    Write-Output "memory-graph: no .agent/memory.db in $repo - skill idle"
    exit 0
  }
}

# --- sqlite-vec extension (engine also auto-detects vendor/) -------------
if (-not $env:SQLITE_VEC_PATH) {
  $vec = Join-Path $mg 'vendor/vec0.dll'
  if (Test-Path $vec) { $env:SQLITE_VEC_PATH = $vec }
}

# --- OPENAI_API_KEY from <repo>\.env (only if not already exported) ------
if (-not $env:OPENAI_API_KEY) {
  $envFile = Join-Path $repo '.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
      $t = $line.Trim()
      if ($t -and -not $t.StartsWith('#') -and $t -match '^([^=\s]+)\s*=\s*(.*)$') {
        if ($matches[1] -eq 'OPENAI_API_KEY') {
          $env:OPENAI_API_KEY = $matches[2].Trim().Trim('"').Trim("'")
        }
      }
    }
  }
}

# --- python: project venv if present, else system ------------------------
$venvPy = Join-Path $mg 'venv/Scripts/python.exe'
if (Test-Path $venvPy) { $py = $venvPy } else { $py = 'python' }

& $py $engine @args
exit $LASTEXITCODE
