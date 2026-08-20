import os
import subprocess
from .base import BaseEnforcer

class LinuxEnforcer(BaseEnforcer):
    def lock_session(self):
        try:
            subprocess.run(["loginctl", "lock-session"], check=False)
            print("[LINUX ENFORCER] Session locked.")
        except Exception as e:
            print(f"[LINUX ENFORCER] Lock failed: {e}")

    def unlock_session(self):
        print("[LINUX ENFORCER] Session unlock authorized.")

    def block_network(self):
        try:
            subprocess.run(["iptables", "-A", "OUTPUT", "-j", "DROP"], check=False)
            print("[LINUX ENFORCER] Outbound network blocked.")
        except Exception as e:
            print(f"[LINUX ENFORCER] Network block failed: {e}")

    def unblock_network(self):
        try:
            subprocess.run(["iptables", "-F", "OUTPUT"], check=False)
            print("[LINUX ENFORCER] Outbound network unblocked.")
        except Exception as e:
            print(f"[LINUX ENFORCER] Network unblock failed: {e}")
