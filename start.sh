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

# 启动 frpc 隧道（如果配置存在）
if [ -f frpc.toml ]; then
  echo "Starting frp tunnel..."
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
fi

echo "Ready. Proxy: running, Web terminal: http://localhost:7681 (admin:REQ_TOKEN)"
wait