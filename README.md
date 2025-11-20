# Web Login Agent with Playwright and VNC

A Dockerized web automation agent that launches a Chromium browser instance using Playwright, navigates to a specified URL, and provides VNC access for interactive browser sessions. The browser uses persistent credentials storage for session management.

## Usage

The module expects a JSON array of values in the following order:

```json
[
  "https://example.com/login",
  "/path/to/credentials"
]
```

### Parameters (in order)

1. `url` (string, required): URL to navigate to in the browser
2. `credentials_path` (string, required): Path to a folder containing browser credentials for persistent session storage

## Output

The module has no outputs (empty array). The browser session is accessible via VNC for interactive use.

## VNC Access

Once the container is running, you can access the browser via VNC:

- **Web Interface**: `http://localhost:6080/vnc.html`
- **VNC Port**: `5900` (for VNC clients)

The browser will automatically navigate to the specified URL and remain open for interaction. All browser state (cookies, local storage, etc.) is persisted in the credentials path directory.

## Build

```bash
# Build the Docker image
docker build -t agent-web-login .

# Save and package
docker save -o agent-web-login.tar agent-web-login
zip -9 artifact.zip agent-web-login.tar
rm agent-web-login.tar
```

## Test

```bash
# Test with JSON array input (values in order: url, credentials_path)
# Make sure to expose ports 6080 (noVNC) and 5900 (VNC)
echo '["https://example.com", "/tmp/browser-credentials"]' | docker run -i --rm -p 6080:6080 -p 5900:5900 agent-web-login
```

### Interactive Testing

For interactive testing where you want to see the browser:

```bash
# Run the container with port mappings
docker run --rm -it \
  -p 6080:6080 \
  -p 5900:5900 \
  -v /tmp/browser-data:/tmp/browser-credentials \
  agent-web-login

# In another terminal, send the input
echo '["https://example.com", "/tmp/browser-credentials"]' | docker exec -i <container-id> /app/entrypoint.sh
```

Or using a single command with stdin:

```bash
echo '["https://example.com", "/tmp/browser-credentials"]' | docker run -i --rm -p 6080:6080 -p 5900:5900 agent-web-login
```

Then open `http://localhost:6080/vnc.html` in your browser to interact with the Chromium instance.

## Features

- ✅ Uses Playwright for reliable browser automation
- ✅ Chromium browser with persistent credentials storage
- ✅ VNC access for interactive browser sessions
- ✅ Web-based VNC client (noVNC) for easy access
- ✅ Automatic navigation to specified URL
- ✅ Session persistence across container restarts (when credentials path is mounted)
- ✅ Headless display server (Xvfb) for browser rendering
- ✅ Window manager (Fluxbox) for proper window handling

## Architecture

The container runs several services:

1. **Xvfb**: Virtual framebuffer X server (display :1)
2. **Fluxbox**: Lightweight window manager
3. **x11vnc**: VNC server exposing the X display
4. **noVNC**: Web-based VNC client proxy
5. **Chromium**: Browser instance launched via Playwright

All services run in the background, with the browser automatically navigating to the target URL and remaining open for interaction.

## Security Notes

- The VNC server runs without a password by default (`-nopw` flag). For production use, consider adding authentication.
- Browser credentials are stored in the specified path. Ensure proper permissions are set on the credentials directory.
- The container requires network access to navigate to URLs and may need filesystem read/write permissions for credentials storage.
