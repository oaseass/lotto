# 로또 당첨 정보 자동 업데이트 - Windows 작업 스케줄러 등록
# 관리자 권한으로 실행: Right-click → "관리자로 실행"

$TaskName = "LottoAutoUpdate"
$ScriptPath = "D:\sajulotto\scripts\run-lotto-update.bat"
$NodePath = (Get-Command node).Source

# 기존 태스크 삭제 후 재등록
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction -Execute $ScriptPath
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At "20:50"
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "매주 토요일 20:50 로또 최신 당첨번호 + 판매점 자동 저장" `
    -RunLevel Highest

Write-Host "등록 완료: 매주 토요일 20:50에 자동 실행됩니다" -ForegroundColor Green
Write-Host "확인: 작업 스케줄러 → $TaskName" -ForegroundColor Cyan
