#!/bin/bash
set -euo pipefail

# Read entire JSON payload from stdin
INPUT="$(cat || true)"

# Extract parameters from stdin as array of values: ["url", "credentials_path"]
# Extract values by index: [0]=url, [1]=credentials_path
URL="$(printf '%s' "$INPUT" | jq -r '(if type == "array" then .[0] // empty else . // empty end)')"
CREDENTIALS_PATH="$(printf '%s' "$INPUT" | jq -r '(if type == "array" then .[1] // empty else . // empty end)')"

# Validate required parameters
[ -n "${URL:-}" ] || { echo "Error: url missing" >&2; exit 1; }
[ -n "${CREDENTIALS_PATH:-}" ] || { echo "Error: credentials_path missing" >&2; exit 1; }

echo "🌐 Navigating to URL: ${URL}" >&2
echo "📁 Using credentials path: ${CREDENTIALS_PATH}" >&2

# Ensure credentials directory exists
mkdir -p "${CREDENTIALS_PATH}"

# Start Xvfb (virtual display)
echo "🖥️  Starting Xvfb..." >&2
Xvfb :1 -screen 0 ${VNC_RESOLUTION}x${VNC_COL_DEPTH} &
XVFB_PID=$!

# Wait for Xvfb to be ready
until xdpyinfo -display :1 > /dev/null 2>&1; do
  echo "Waiting for Xvfb..." >&2
  sleep 0.5
done

# Start window manager
echo "🪟 Starting Fluxbox..." >&2
DISPLAY=:1 fluxbox &
FLUXBOX_PID=$!

# Start VNC server
echo "📺 Starting VNC server..." >&2
DISPLAY=:1 x11vnc -rfbport 5900 -display :1 -forever -shared -nopw -listen 0.0.0.0 &
VNC_PID=$!

# Start noVNC web interface
echo "🌐 Starting noVNC..." >&2
websockify --web /opt/novnc 6080 localhost:5900 &
NOVNC_PID=$!

# Wait a bit for services to start
sleep 2

# Launch Chromium using Playwright with persistent context
echo "🚀 Launching Chromium browser..." >&2
export DISPLAY=:1
export TARGET_URL="${URL}"
export CREDENTIALS_PATH="${CREDENTIALS_PATH}"

# Run the browser launcher script
node /app/launch-browser.js &
BROWSER_PID=$!

echo "✅ All services started!" >&2
echo "📺 VNC available at: http://localhost:6080/vnc.html" >&2
echo "🌐 Browser navigating to: ${URL}" >&2

# Keep the script running and wait for processes
wait
