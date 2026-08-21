# replit-zen-proxy

OpenCode Zen 免费模型反向代理，部署在 Replit（美国出口 IP）。

## 功能
1. **代理**：转发到 https://opencode.ai/zen，注入官方 UA，携带 x-proxy-token 鉴权
2. **Web 终端**（ttyd，端口 7681，admin/REQ_TOKEN）
3. **frp 隧道**：可选，把代理和终端暴露到你自己的服务器

## 部署
1. Replit 导入本仓库（自动识别为 Web 应用）
2. 在 Secrets 配置 `REQ_TOKEN`（访问密钥）
3. 可选：复制 `frpc.toml.example` 为 `frpc.toml` 并填真实服务器配置
4. 点 Publish（Autoscale）

## 调用
```bash
curl https://xxx.replit.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-proxy-token: YOUR_TOKEN" \
  -d '{"model":"big-pickle","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

不带 x-proxy-token 返回 401。

## 目录
- `index.js` — 代理主程序
- `start.sh` — 启动脚本（代理 + ttyd + frpc）
- `frpc.toml.example` — frp 隧道配置模板
- `.replit` / `replit.nix` — Replit 平台配置