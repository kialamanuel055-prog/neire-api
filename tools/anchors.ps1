$script:Utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-NPath([string]$Path) {
  [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

function Write-NFile {
  param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Content)
  $full = Get-NPath $Path
  $dir = Split-Path $full -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($full, ($Content.TrimEnd() + "`n"), $script:Utf8)
  Write-Host "[criado]    $Path" -ForegroundColor Green
}

function Read-NLines([string]$Path) {
  $full = Get-NPath $Path
  if (-not (Test-Path $full)) { throw "Ficheiro nao existe: $Path" }
  $list = New-Object 'System.Collections.Generic.List[string]'
  $list.AddRange([string[]]([System.IO.File]::ReadAllText($full) -split "`r?`n"))
  return ,$list
}

function Find-Anchor($Lines, [string]$Name) {
  $rx = 'ANCHOR:' + [regex]::Escape($Name) + '(?![\w:-])'
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match $rx) { return $i }
  }
  return -1
}

function Format-Indented([string]$Content, [string]$Indent) {
  $out = $Content.TrimEnd() -split "`r?`n" | ForEach-Object {
    if ($_.Trim()) { $Indent + $_ } else { '' }
  }
  return [string[]]$out
}

# Insere Content antes da linha ANCHOR:Anchor (idempotente).
# -Unless: texto que, se ja existir no ficheiro, impede a insercao.
function Add-AtAnchor {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Anchor,
    [Parameter(Mandatory)][string]$Content,
    [string]$Unless
  )
  $lines = Read-NLines $Path
  if (-not $Unless) {
    $Unless = ($Content -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
  }
  if (($lines -join "`n").Contains($Unless)) {
    Write-Host "[ja existe] $Path -> $Anchor" -ForegroundColor Yellow
    return
  }
  $idx = Find-Anchor $lines $Anchor
  if ($idx -lt 0) { throw "Ancora '$Anchor' nao encontrada em $Path" }
  $indent = [regex]::Match($lines[$idx], '^\s*').Value
  $lines.InsertRange($idx, [string[]]@(Format-Indented $Content $indent))
  [System.IO.File]::WriteAllText((Get-NPath $Path), ($lines -join "`n"), $script:Utf8)
  Write-Host "[inserido]  $Path -> $Anchor" -ForegroundColor Cyan
}

# Substitui tudo entre ANCHOR:Anchor:start e ANCHOR:Anchor:end.
function Set-Block {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Anchor,
    [Parameter(Mandatory)][string]$Content
  )
  $lines = Read-NLines $Path
  $s = Find-Anchor $lines "$Anchor`:start"
  $e = Find-Anchor $lines "$Anchor`:end"
  if ($s -lt 0 -or $e -lt 0 -or $e -le $s) { throw "Bloco '$Anchor' invalido em $Path" }
  $indent = [regex]::Match($lines[$s], '^\s*').Value
  $lines.RemoveRange($s + 1, $e - $s - 1)
  $lines.InsertRange($s + 1, [string[]]@(Format-Indented $Content $indent))
  [System.IO.File]::WriteAllText((Get-NPath $Path), ($lines -join "`n"), $script:Utf8)
  Write-Host "[bloco]     $Path -> $Anchor" -ForegroundColor Magenta
}

function Show-Anchors {
  Get-ChildItem src, index.html -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern 'ANCHOR:' |
    ForEach-Object { '{0}:{1}  {2}' -f (Resolve-Path -Relative $_.Path), $_.LineNumber, $_.Line.Trim() }
}
# --- extras (bloco 7) ---
function Write-NNew {
  param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Content)
  if (Test-Path (Get-NPath $Path)) {
    Write-Host "[existe, nao mexi] $Path" -ForegroundColor Yellow
    return
  }
  Write-NFile $Path $Content
}

# Como Add-AtAnchor, mas so procura o -Unless nas linhas imediatamente antes da ancora.
# Serve para inserir o mesmo conteudo em ancoras diferentes (ex.: menu student e alumni).
function Add-NearAnchor {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Anchor,
    [Parameter(Mandatory)][string]$Content,
    [Parameter(Mandatory)][string]$Unless,
    [int]$Window = 14
  )
  $lines = Read-NLines $Path
  $idx = Find-Anchor $lines $Anchor
  if ($idx -lt 0) { throw "Ancora '$Anchor' nao encontrada em $Path" }
  $from = [Math]::Max(0, $idx - $Window)
  $near = ($lines.GetRange($from, $idx - $from) -join "`n")
  if ($near.Contains($Unless)) {
    Write-Host "[ja existe] $Path -> $Anchor" -ForegroundColor Yellow
    return
  }
  Add-AtAnchor -Path $Path -Anchor $Anchor -Content $Content -Unless 'ZZ_NUNCA_EXISTE_ZZ'
}
# --- Replace-Once (bloco 10) ---
function Replace-Once {
  param([string]$Path, [string]$Old, [string]$New, [string]$Unless)
  $full = Get-NPath $Path
  if (-not (Test-Path $full)) { Write-Host "[falta ficheiro] $Path" -ForegroundColor Red; return $false }
  $t = [System.IO.File]::ReadAllText($full)
  if ($Unless -and $t.Contains($Unless)) { Write-Host "[ja existe] $Path" -ForegroundColor Yellow; return $true }
  $i = $t.IndexOf($Old)
  if ($i -lt 0 -or $t.IndexOf($Old, $i + $Old.Length) -ge 0) {
    Write-Host "[nao apliquei] $Path : texto original nao encontrado exatamente 1 vez" -ForegroundColor Red
    return $false
  }
  [System.IO.File]::WriteAllText($full, $t.Substring(0, $i) + $New + $t.Substring($i + $Old.Length), $script:Utf8)
  Write-Host "[substituido] $Path" -ForegroundColor Magenta
  return $true
}