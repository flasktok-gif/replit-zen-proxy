#!/bin/bash
echo "Starting Zen Proxy..."

# 启动代理
node index.js &
PROXY_PID=$!

# 启动 ttyd Web 终端（如果没安装就自动下载）
if [ ! -f ttyd ]; then
  echo "Downloading ttyd..."
  curl -sLO https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.i686
  mv ttyd.i686 ttyd
  chmod +x ttyd
fi
echo "Starting ttyd web terminal on port 7681..."
./ttyd -p 7681 -c admin:$REQ_TOKEN bash &
TTYD_PID=$!

# 从 Secrets 生成 frpc 配置（如果 FRP_SERVER 和 FRP_TOKEN 已设置）
if [ -n "$FRP_SERVER" ] && [ -n "$FRP_TOKEN" ]; then
  echo "Generating frpc.toml from secrets..."
  cat > frpc.toml << EOF
serverAddr = "$FRP_SERVER"
serverPort = ${FRP_PORT:-7000}
auth.method = "token"
auth.token = "$FRP_TOKEN"

[transport]
tls.enable = true

[log]
to = "./frpc.log"
level = "info"
maxDays = 3

[[proxies]]
name = "zen-proxy"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3000
remotePort = 17860

[[proxies]]
name = "ttyd-terminal"
type = "tcp"
localIP = "127.0.0.1"
localPort = 7681
remotePort = 17861
EOF

  # 下载并启动 frpc
  if [ ! -f frpc ]; then
    echo "Downloading frpc..."
    curl -sLO https://github.com/fatedier/frp/releases/download/v0.61.1/frp_0.61.1_linux_amd64.tar.gz
    tar -xzf frp_0.61.1_linux_amd64.tar.gz
    mv frp_0.61.1_linux_amd64/frpc .
    rm -rf frp_0.61.1_linux_amd64 frp_0.61.1_linux_amd64.tar.gz
    chmod +x frpc
  fi
  ./frpc -c frpc.toml &
  FRPC_PID=$!
  echo "FRP tunnel started."
fi

echo "Ready."
wait