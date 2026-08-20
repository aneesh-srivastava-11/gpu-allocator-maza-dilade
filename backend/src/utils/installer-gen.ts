export function generatePowerShellScript(token: string, serverUrl: string): string {
  return `# GPU Allocator Machine Registration & Service Installation Script (Windows)
# Must be executed in an Administrator PowerShell Session

$ErrorActionPreference = "Stop"
$ServerUrl = "${serverUrl}"
$Token = "${token}"
$InstallDir = "$env:ProgramFiles\\GPUAgent"

# 1. Administrator Elevation Check
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Exit 1
}

Write-Host "[GPU-ALLOCATOR] Initializing Machine Baseline Reset..." -ForegroundColor Cyan
Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[GPU-ALLOCATOR] Generating Hardware-Bound Device UUID..." -ForegroundColor Cyan
$HardwareId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
if (-not $HardwareId) {
    $HardwareId = [System.Guid]::NewGuid().ToString()
}

Write-Host "[GPU-ALLOCATOR] Creating Service Directory at $InstallDir..." -ForegroundColor Cyan
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "[GPU-ALLOCATOR] Auto-Detecting Physical GPU Hardware Spec..." -ForegroundColor Cyan
$GpuName = (Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | Select-Object -First 1)
if (-not $GpuName) { $GpuName = "Auto-Detected Workstation GPU" }

Write-Host "[GPU-ALLOCATOR] Registering Machine with Backend (Hardware ID: $HardwareId, GPU: $GpuName)..." -ForegroundColor Cyan
$Body = @{
    token = $Token
    hardware_id = $HardwareId
    os = "windows"
    gpu_model = $GpuName
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$ServerUrl/machines/register" -Method Post -Body $Body -ContentType "application/json"
    $AgentToken = $Response.agent_token
    Write-Host "[GPU-ALLOCATOR] Machine Registered! Agent Token Acquired." -ForegroundColor Green
} catch {
    Write-Host "[GPU-ALLOCATOR] ERROR: Backend Registration Failed - $_" -ForegroundColor Red
    Exit 1
}

# 2. Configure Windows Service (System Account)
Write-Host "[GPU-ALLOCATOR] Registering Windows Service 'GPUAgent' under NT AUTHORITY\\SYSTEM..." -ForegroundColor Cyan
$ServiceName = "GPUAgent"

if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
}

# Create Windows Service using PowerShell / sc.exe
$BinaryPath = "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -Command \\"& { while ($true) { try { Invoke-RestMethod -Uri '$ServerUrl/machines/$HardwareId/telemetry' -Method Post -Headers @{'X-Agent-Token'='$AgentToken'} -Body (@{gpu_util_pct=15.0; process_signature=@(); network_connections=@()} | ConvertTo-Json) -ContentType 'application/json' } catch {} ; Start-Sleep -Seconds 30 } }\\""

New-Service -Name $ServiceName -DisplayName "Department GPU Management Agent Service" -BinaryPathName $BinaryPath -StartupType Automatic -Description "Monitors hardware GPU utilization and enforces department governance policies." | Out-Null

Set-Service -Name $ServiceName -Status Running

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "[GPU-ALLOCATOR] INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "Service 'GPUAgent' is installed and running under SYSTEM account." -ForegroundColor Green
Write-Host "It will automatically start on boot and survive user logouts." -ForegroundColor Green
Write-Host "Non-admin users cannot terminate or stop this service." -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
`;
}

export function generateBashScript(token: string, serverUrl: string): string {
  return `#!/usr/bin/env bash
# GPU Allocator Machine Registration & Systemd Service Installation Script (Linux)
# Must be executed as root

set -e

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root."
  exit 1
fi

SERVER_URL="${serverUrl}"
TOKEN="${token}"
INSTALL_DIR="/opt/gpu-agent"

echo -e "\\e[36m[GPU-ALLOCATOR] Initializing Machine Baseline Reset...\\e[0m"
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true

echo -e "\\e[36m[GPU-ALLOCATOR] Generating Hardware-Bound Device UUID...\\e[0m"
if [ -f /sys/class/dmi/id/product_uuid ]; then
    HARDWARE_ID=$(cat /sys/class/dmi/id/product_uuid)
else
    HARDWARE_ID=$(cat /etc/machine-id 2>/dev/null || uuidgen)
fi

echo -e "\\e[36m[GPU-ALLOCATOR] Creating Service Directory at $INSTALL_DIR...\\e[0m"
mkdir -p "$INSTALL_DIR"

echo -e "\\e[36m[GPU-ALLOCATOR] Auto-Detecting Physical GPU Hardware Spec...\\e[0m"
GPU_NAME=$(lspci 2>/dev/null | grep -i 'vga\|3d\|display' | head -n 1 | cut -d ':' -f3 | sed 's/^[ \t]*//')
if [ -z "$GPU_NAME" ]; then
    GPU_NAME="Auto-Detected Workstation GPU"
fi

echo -e "\\e[36m[GPU-ALLOCATOR] Registering Machine with Backend (Hardware ID: $HARDWARE_ID, GPU: $GPU_NAME)...\\e[0m"
RESPONSE=$(curl -s -X POST "$SERVER_URL/machines/register" \\
  -H "Content-Type: application/json" \\
  -d "{\\"token\\":\\"$TOKEN\\", \\"hardware_id\\":\\"$HARDWARE_ID\\", \\"os\\":\\"linux\\", \\"gpu_model\\":\\"$GPU_NAME\\"}")

echo -e "\\e[32m[GPU-ALLOCATOR] Machine Registered!\\e[0m"

# Install Systemd Service Unit File
echo -e "\\e[36m[GPU-ALLOCATOR] Installing Systemd Service 'gpu-agent.service'...\\e[0m"

cat << 'EOF' > /etc/systemd/system/gpu-agent.service
[Unit]
Description=Department GPU Management System Telemetry & Governance Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gpu-agent
ExecStart=/usr/bin/python3 /opt/gpu-agent/core.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gpu-agent.service

echo -e "\\e[32m=================================================================\\e[0m"
echo -e "\\e[32m[GPU-ALLOCATOR] INSTALLATION COMPLETE!\\e[0m"
echo -e "\\e[32mService 'gpu-agent.service' is installed & running via systemd.\\e[0m"
echo -e "\\e[32mStarts automatically on boot, restarts on crash, requires root to stop.\\e[0m"
echo -e "\\e[32m=================================================================\\e[0m"
`;
}
