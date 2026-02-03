#!/bin/bash

# UptimeTR Proxy Server Setup Script
# Tek komutla Türkiye'de proxy sunucu kurulumu
#
# Kullanım:
#   curl -fsSL https://raw.githubusercontent.com/your-repo/setup-tr-proxy.sh | bash -s -- --secret YOUR_SECRET
#
# Veya:
#   chmod +x setup-tr-proxy.sh
#   ./setup-tr-proxy.sh --secret YOUR_SECRET

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PORT=3000
INSTALL_DIR="/opt/uptime-proxy"
SERVICE_NAME="uptime-proxy"
SECRET=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --secret)
            SECRET="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            echo "UptimeTR Proxy Server Setup"
            echo ""
            echo "Usage: $0 --secret YOUR_SECRET [--port 3000]"
            echo ""
            echo "Options:"
            echo "  --secret    Required. Authentication secret for the proxy"
            echo "  --port      Port to run the proxy on (default: 3000)"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$SECRET" ]; then
    echo -e "${RED}Error: --secret is required${NC}"
    echo "Usage: $0 --secret YOUR_SECRET"
    exit 1
fi

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     UptimeTR Proxy Server Kurulumu       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Root yetkileri gerekli. sudo ile çalıştırılıyor...${NC}"
    exec sudo "$0" "$@"
fi

# Step 1: Update system
echo -e "${GREEN}[1/6]${NC} Sistem güncelleniyor..."
apt-get update -qq
apt-get install -y -qq curl unzip > /dev/null

# Step 2: Install Bun
echo -e "${GREEN}[2/6]${NC} Bun runtime kuruluyor..."
if command -v bun &> /dev/null; then
    echo -e "  ${YELLOW}Bun zaten kurulu, atlanıyor...${NC}"
else
    curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
    # Add to path for current session
    export BUN_INSTALL="/root/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Ensure bun is in path
if ! command -v bun &> /dev/null; then
    export BUN_INSTALL="/root/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Step 3: Create application directory
echo -e "${GREEN}[3/6]${NC} Uygulama oluşturuluyor..."
mkdir -p $INSTALL_DIR

# Create the proxy server application
cat > $INSTALL_DIR/index.ts << 'PROXY_CODE'
/**
 * UptimeTR Proxy Server
 * Türkiye'den HTTP istekleri için proxy sunucu
 */

const PORT = parseInt(process.env.PORT || "3000");
const SECRET = process.env.PROXY_SECRET || "";

interface ProxyRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeout_ms?: number;
}

interface ProxyResponse {
  success: boolean;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
  latency_ms?: number;
}

async function handleProxy(request: Request): Promise<Response> {
  const startTime = Date.now();
  
  // Check authorization
  const authHeader = request.headers.get("Authorization");
  if (!SECRET || authHeader !== `Bearer ${SECRET}`) {
    return Response.json(
      { success: false, error: "Unauthorized" } as ProxyResponse,
      { status: 401 }
    );
  }

  try {
    const body: ProxyRequest = await request.json();
    
    if (!body.url) {
      return Response.json(
        { success: false, error: "URL is required" } as ProxyResponse,
        { status: 400 }
      );
    }

    // Prepare headers with default User-Agent
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      ...(body.headers || {}),
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = body.timeout_ms || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Make the request
    const response = await fetch(body.url, {
      method: body.method || "GET",
      headers,
      body: body.body || undefined,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    // Read response body
    const responseBody = await response.text();
    const latencyMs = Date.now() - startTime;

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const result: ProxyResponse = {
      success: true,
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
      latency_ms: latencyMs,
    };

    return Response.json(result);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = error.name === "AbortError" || error.message?.includes("abort");
    
    const result: ProxyResponse = {
      success: false,
      error: isTimeout ? "Request timeout" : (error.message || "Request failed"),
      latency_ms: latencyMs,
    };

    return Response.json(result, { status: isTimeout ? 504 : 500 });
  }
}

function handleHealth(): Response {
  return Response.json({
    status: "ok",
    timestamp: Date.now(),
    region: "TR",
  });
}

// Bun server
Bun.serve({
  port: PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    let response: Response;

    // Route requests
    if (url.pathname === "/health" && request.method === "GET") {
      response = handleHealth();
    } else if (url.pathname === "/proxy" && request.method === "POST") {
      response = await handleProxy(request);
    } else {
      response = Response.json(
        {
          message: "UptimeTR Proxy Server",
          endpoints: {
            health: "GET /health",
            proxy: "POST /proxy",
          },
        },
        { status: 200 }
      );
    }

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  },
});

console.log(`🚀 UptimeTR Proxy Server running on port ${PORT}`);
PROXY_CODE

# Step 4: Create systemd service
echo -e "${GREEN}[4/6]${NC} Systemd servisi oluşturuluyor..."

cat > /etc/systemd/system/$SERVICE_NAME.service << SYSTEMD_SERVICE
[Unit]
Description=UptimeTR Proxy Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=PORT=$PORT
Environment=PROXY_SECRET=$SECRET
Environment=BUN_INSTALL=/root/.bun
Environment=PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/root/.bun/bin/bun run $INSTALL_DIR/index.ts
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
SYSTEMD_SERVICE

# Step 5: Configure firewall
echo -e "${GREEN}[5/6]${NC} Firewall yapılandırılıyor..."
if command -v ufw &> /dev/null; then
    ufw allow $PORT/tcp > /dev/null 2>&1 || true
    ufw allow 22/tcp > /dev/null 2>&1 || true  # SSH için
    echo -e "  ${GREEN}UFW kuralları eklendi (port $PORT)${NC}"
else
    echo -e "  ${YELLOW}UFW bulunamadı, firewall yapılandırması atlanıyor${NC}"
fi

# Step 6: Start service
echo -e "${GREEN}[6/6]${NC} Servis başlatılıyor..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME > /dev/null 2>&1
systemctl restart $SERVICE_NAME

# Wait for service to start
sleep 2

# Check service status
if systemctl is-active --quiet $SERVICE_NAME; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          Kurulum Tamamlandı!             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BLUE}Proxy URL:${NC} http://$(hostname -I | awk '{print $1}'):$PORT/proxy"
    echo -e "  ${BLUE}Health Check:${NC} http://$(hostname -I | awk '{print $1}'):$PORT/health"
    echo -e "  ${BLUE}Secret:${NC} $SECRET"
    echo ""
    echo -e "  ${YELLOW}Servis komutları:${NC}"
    echo -e "    systemctl status $SERVICE_NAME"
    echo -e "    systemctl restart $SERVICE_NAME"
    echo -e "    journalctl -u $SERVICE_NAME -f"
    echo ""
    echo -e "  ${YELLOW}Cloudflare Worker'a eklenecek environment variables:${NC}"
    echo -e "    TR_PROXY_URL=http://$(hostname -I | awk '{print $1}'):$PORT/proxy"
    echo -e "    TR_PROXY_SECRET=$SECRET"
    echo ""
else
    echo -e "${RED}Servis başlatılamadı!${NC}"
    echo "Hata logları için: journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi
