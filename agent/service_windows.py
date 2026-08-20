import sys
import os
import time

# Add directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager

    class GPUAgentService(win32serviceutil.ServiceFramework):
        _svc_name_ = "GPUAgent"
        _svc_display_name_ = "Department GPU Management Agent Service"
        _svc_description_ = "Monitors hardware GPU utilization, process signatures, and enforces department governance policies."

        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            self.is_running = True

        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            win32event.SetEvent(self.hWaitStop)
            self.is_running = False

        def SvcDoRun(self):
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYSIDE_EVENT_ID,
                (self._svc_name_, 'Started GPU Agent Service successfully.')
            )
            self.main()

        def main(self):
            from core import AgentDaemon
            daemon = AgentDaemon()
            daemon.run_loop()

    if __name__ == '__main__':
        if len(sys.argv) == 1:
            servicemanager.Initialize()
            servicemanager.PrepareToHostSingle(GPUAgentService)
            servicemanager.StartServiceCtrlDispatcher()
        else:
            win32serviceutil.HandleCommandLine(GPUAgentService)

except ImportError:
    # Fallback execution if pywin32 is not pre-installed
    if __name__ == '__main__':
        from core import AgentDaemon
        daemon = AgentDaemon()
        daemon.run_loop()
