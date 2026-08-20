import os
import subprocess
from .base import BaseEnforcer

class WindowsEnforcer(BaseEnforcer):
    def lock_session(self):
        try:
            subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
            print("[WINDOWS ENFORCER] Workstation locked.")
        except Exception as e:
            print(f"[WINDOWS ENFORCER] Lock failed: {e}")

    def unlock_session(self):
        print("[WINDOWS ENFORCER] Unlock workstation signal received.")

    def block_network(self):
        try:
            subprocess.run(["netsh", "advfirewall", "firewall", "add", "rule", "name=GPU_ALLOCATOR_BLOCK", "dir=out", "action=block"], check=False)
            print("[WINDOWS ENFORCER] Outbound network blocked.")
        except Exception as e:
            print(f"[WINDOWS ENFORCER] Network block failed: {e}")

    def unblock_network(self):
        try:
            subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=GPU_ALLOCATOR_BLOCK"], check=False)
            print("[WINDOWS ENFORCER] Outbound network restored.")
        except Exception as e:
            print(f"[WINDOWS ENFORCER] Network unblock failed: {e}")

    def reset_baseline(self):
        print("[WINDOWS ENFORCER] Executing Workstation Baseline Reset...")
        try:
            subprocess.run(["taskkill", "/F", "/FI", "USERNAME eq gpuuser"], check=False)
            print("[WINDOWS ENFORCER] Restricted user processes terminated.")
        except Exception as e:
            print(f"[WINDOWS ENFORCER] Process purge warning: {e}")

        try:
            temp_dir = os.path.expandvars("%SystemDrive%\\Users\\gpuuser\\AppData\\Local\\Temp")
            if os.path.exists(temp_dir):
                subprocess.run(f'powershell.exe -Command "Remove-Item -Path \'{temp_dir}\\*\' -Recurse -Force -ErrorAction SilentlyContinue"', shell=True)
            print("[WINDOWS ENFORCER] Temporary workspace files purged.")
        except Exception as e:
            print(f"[WINDOWS ENFORCER] Temp purge warning: {e}")

        self.lock_session()
