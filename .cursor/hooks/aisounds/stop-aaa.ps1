$rawInput = @($input) -join "`n"
if (-not $rawInput -or $rawInput.Trim() -eq '') {
  Write-Output '{}'
  exit 0
}

$clean = $rawInput -replace '^\xEF\xBB\xBF','' -replace '^\xFE\xFF','' -replace '^\xFF\xFE',''
$clean = $clean.TrimStart([char]0xFEFF, [char]0xFFFE, [char]0xEF, [char]0xBB, [char]0xBF).Trim()
$jsonStart = $clean.IndexOf('{')
$jsonEnd = $clean.LastIndexOf('}')
if ($jsonStart -ge 0 -and $jsonEnd -gt $jsonStart) {
  $clean = $clean.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
}
try {
  $hookData = $clean | ConvertFrom-Json -ErrorAction Stop
} catch {
  Write-Output '{}'
  exit 0
}
$mp3 = $null
if ($hookData.status -eq 'completed') {
  $mp3 = 'C:\Users\luisr\Documents\ai_sounds\.aisounds\packs\wav-test\sounds\task_complete.mp3'
}
elseif ($hookData.status -eq 'error' -or $hookData.status -eq 'aborted') {
  $mp3 = 'C:\Users\luisr\Documents\ai_sounds\.aisounds\packs\wav-test\sounds\task_failed.mp3'
}
if (-not $mp3) {
  Write-Output '{}'
  exit 0
}
try {
  Add-Type -AssemblyName PresentationCore *>&1 | Out-Null
  $player = New-Object System.Windows.Media.MediaPlayer
  $player.Open([uri]$mp3)
  Start-Sleep -Milliseconds 300
  $player.Play()
  Start-Sleep -Milliseconds 3250
  $player.Close()
} catch {
}
Write-Output '{}'
