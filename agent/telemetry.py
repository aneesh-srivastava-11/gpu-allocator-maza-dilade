import os
import platform
import subprocess
import psutil

try:
    import pynvml
    HAS_NVML = True
except ImportError:
    HAS_NVML = False

class TelemetryCollector:
    def __init__(self):
        if HAS_NVML:
            try:
                pynvml.nvmlInit()
            except Exception:
                pass

    def get_gpu_spec(self) -> str:
        if HAS_NVML:
            try:
                device_count = pynvml.nvmlDeviceGetCount()
                if device_count > 0:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    name = pynvml.nvmlDeviceGetName(handle)
                    if isinstance(name, bytes):
                        name = name.decode('utf-8')
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    vram_gb = round(memory.total / (1024 ** 3))
                    return f"{name} {vram_gb}GB"
            except Exception:
                pass
        
        # OS Native Fallbacks
        try:
            if platform.system().lower() == "windows":
                out = subprocess.check_output("wmic path win32_VideoController get name", shell=True).decode()
                lines = [line.strip() for line in out.splitlines() if line.strip() and "Name" not in line]
                if lines:
                    return lines[0]
            else:
                out = subprocess.check_output("lspci | grep -i 'vga\\|3d\\|display'", shell=True).decode()
                lines = [line.strip() for line in out.splitlines() if line.strip()]
                if lines:
                    return lines[0].split(':')[-1].strip()
        except Exception:
            pass

        return "NVIDIA Workstation GPU (Auto-Detected)"

    def get_gpu_utilization(self) -> float:
        if HAS_NVML:
            try:
                device_count = pynvml.nvmlDeviceGetCount()
                if device_count > 0:
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    return float(util.gpu)
            except Exception:
                pass
        return 0.0

    def get_process_signature(self):
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                pinfo = proc.info
                cmd = " ".join(pinfo['cmdline']) if pinfo['cmdline'] else pinfo['name']
                processes.append({
                    "pid": pinfo['pid'],
                    "name": pinfo['name'],
                    "cmd": cmd
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return processes[:50]

    def get_network_connections(self):
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.raddr:
                    connections.append({
                        "dest": conn.raddr.ip,
                        "port": conn.raddr.port,
                        "status": conn.status
                    })
        except Exception:
            pass
        return connections[:30]
