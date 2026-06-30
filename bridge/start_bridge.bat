@echo off
REM 555 Bridge Poller Auto-Start
REM Place shortcut in: shell:startup
cd /d %USERPROFILE%\555-dashboard\bridge
python3 bridge_poller.py >> bridge_poller.log 2>&1
