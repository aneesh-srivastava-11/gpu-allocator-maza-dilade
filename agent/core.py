import os
import sys
import time
import argparse
import requests
import platform
from telemetry import TelemetryCollector

if platform.system().lower() == "windows":
    from enforcement.windows import WindowsEnforcer as Enforcer
else:
    from enforcement.linux import LinuxEnforcer as Enforcer

def parse_args():
    parser = argparse.ArgumentParser(description="GPU Workstation Management Agent")
    parser.add_argument("--server-url", default=os.getenv("AGENT_SERVER_URL", "http://localhost:8010"), help="Backend API Base URL")
    parser.add_argument("--hardware-id", default=os.getenv("AGENT_HARDWARE_ID", "hw_win_ws01_uuid"), help="Unique Hardware UUID")
    parser.add_argument("--token", default=os.getenv("AGENT_TOKEN", "agent_tok_demo_token"), help="Agent Auth Token")
    return parser.parse_args()

class AgentDaemon:
    def __init__(self, server_url: str, hardware_id: str, token: str):
        self.server_url = server_url.rstrip('/')
        self.hardware_id = hardware_id
        self.token = token
        self.collector = TelemetryCollector()
        self.enforcer = Enforcer()
        self.consecutive_failures = 0

    def run_loop(self):
        print(f"[AGENT] Daemon started on {platform.system()} (Hardware ID: {self.hardware_id}, Target: {self.server_url})...")
        while True:
            try:
                gpu_util = self.collector.get_gpu_utilization()
                procs = self.collector.get_process_signature()
                conns = self.collector.get_network_connections()

                payload = {
                    "gpu_util_pct": gpu_util,
                    "process_signature": procs,
                    "network_connections": conns
                }

                url = f"{self.server_url}/machines/{self.hardware_id}/telemetry"
                headers = {"X-Agent-Token": self.token}
                resp = requests.post(url, json=payload, headers=headers, timeout=5)

                if resp.status_code == 200:
                    self.consecutive_failures = 0
                    data = resp.json()
                    if data.get("status") == "flagged":
                        print(f"⚠️ [AGENT] Session FLAGGED by backend. Reason: {data.get('reason')}")
                        self.enforcer.lock_session()
                        self.enforcer.block_network()
                else:
                    self.consecutive_failures += 1

            except Exception as e:
                self.consecutive_failures += 1
                print(f"[AGENT] Connection error ({self.consecutive_failures}/3): {e}")

            # Fail-closed local enforcement check: >2 consecutive failures (90s)
            if self.consecutive_failures >= 3:
                print("🛑 [AGENT FAIL-CLOSED] Telemetry connection lost for >90s. Locking machine access locally.")
                self.enforcer.lock_session()

            time.sleep(30)

if __name__ == "__main__":
    args = parse_args()
    daemon = AgentDaemon(server_url=args.server_url, hardware_id=args.hardware_id, token=args.token)
    daemon.run_loop()
