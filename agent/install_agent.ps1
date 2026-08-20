# PowerShell Workstation Service Setup Script
# Installs and registers the GPU Agent Daemon as a persistent Windows Scheduled Task running on boot.

param (
    [string]$ServerUrl = "http://localhost:8010",
    [string]$HardwareId = "hw_win_ws01_uuid",
    [string]$Token = "agent_tok_demo_token"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cipher
Write-Host " GPU Agent Windows Service Installer" -ForegroundColor Green
Write-Host " Target Server : $ServerUrl"
Write-Host " Hardware ID   : $HardwareId"
Write-Host "=================================================="

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentCore = Join-Path $ScriptDir "core.py"
$PythonExe = (Get-Command python).Source

if (-not (Test-Path $AgentCore)) {
    Write-Error "Could not find core.py at path: $AgentCore"
}

$TaskName = "GPUWorkstationAgent"
$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$AgentCore`" --server-url `"$ServerUrl`" --hardware-id `"$HardwareId`" --token `"$Token`""
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force

Write-Host "Successfully registered scheduled task '$TaskName' running as SYSTEM at startup." -ForegroundColor Green
Write-Host "Starting agent daemon task now..."
Start-ScheduledTask -TaskName $TaskName
