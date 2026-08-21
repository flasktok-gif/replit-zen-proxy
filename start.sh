#!/bin/bash
# 启动脚本：同时启动代理和 ttyd Web 终端
# 注：frpc 需手动下载，见 frpc.toml.example

# 启动代理
echo "Starting Zen Proxy..."
node index.js &
PROXY_PID=$!

# 启动 ttyd Web 终端（如果安装了）
if command -v ttyd &> /dev/null; then
  echo "Starting ttyd web terminal on port 7681..."
  ttyd -p 7681 -c admin:$REQ_TOKEN bash &
  TTYD_PID=$!
fi

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

echo "Ready."
wait