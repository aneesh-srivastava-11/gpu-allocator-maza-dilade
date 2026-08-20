import os
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

    def get_gpu_utilization() -> float:
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
