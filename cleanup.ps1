$root  = "$PSScriptRoot"
$repos = @("price-tracker-api","price-tracker-web")

foreach ($r in $repos) {
  $path = Join-Path $root $r
  if (-not (Test-Path $path)) { continue }
  Push-Location $path
  if (Test-Path .git\MERGE_HEAD) { git merge --abort | Out-Null }
  if (Test-Path .git\rebase-apply -or Test-Path .git\rebase-merge) { git rebase --abort | Out-Null }
  if (Test-Path .git\CHERRY_PICK_HEAD) { git cherry-pick --abort | Out-Null }
  if (Test-Path .git\REVERT_HEAD)      { git revert --abort | Out-Null }
  git reset --hard | Out-Null
  git clean -fd   | Out-Null
  git status -sb
  Pop-Location
}
Write-Host "`nDone: both repos clean." -ForegroundColor Green
