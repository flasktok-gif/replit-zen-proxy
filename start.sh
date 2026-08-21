#!/bin/bash
# 启动脚本：启动代理服务
# 注：如需 frp 隧道，复制 frpc.toml.example 为 frpc.toml 并填入真实配置

echo "Starting Zen Proxy..."
node index.js &
PROXY_PID=$!

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