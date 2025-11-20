FROM mcr.microsoft.com/playwright:v1.43.1-jammy

# Set environment variables
ENV DISPLAY=:1 \
    VNC_RESOLUTION=1280x800 \
    VNC_COL_DEPTH=24 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
  apt-get install -y gnupg && \
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3B4FE6ACC0B21F32 && \
  apt-get update

# Install system dependencies
RUN apt-get update && apt-get install -y \
    x11vnc \
    xvfb \
    fluxbox \
    x11-utils \
    net-tools \
    curl \
    unzip \
    python3 \
    python3-pip \
    jq \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install websockify via pip
RUN pip3 install --no-cache-dir websockify

# Install noVNC
RUN mkdir -p /opt/novnc && \
    curl -L -f -o /tmp/novnc.zip https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.zip && \
    unzip -q /tmp/novnc.zip -d /tmp && \
    mv /tmp/noVNC-1.4.0/* /opt/novnc/ && \
    rm -rf /tmp/*

# Prepare VNC password
RUN mkdir -p /root/.vnc && \
    x11vnc -storepasswd secret /root/.vnc/passwd

# Create working directory
WORKDIR /app

# Copy package.json first for better layer caching
COPY package.json .

# Install Playwright npm package and browsers
RUN npm install && \
    npx playwright install chromium

# Copy remaining app source
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose VNC and WebSocket ports
EXPOSE 5900 6080

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
