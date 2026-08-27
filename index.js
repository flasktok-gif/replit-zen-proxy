const http = require('http');
const https = require('https');
const net = require('net');

const TOKEN = process.env.REQ_TOKEN || '1234567';
const PORT = process.env.PORT || 3000;
const UPSTREAM = process.env.UPSTREAM_URL || 'https://opencode.ai/zen';

if (!TOKEN) {
  console.error('ERROR: REQ_TOKEN not set.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Health check for Replit deployment
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  // Web entry page (for Replit publishing recognition)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>Zen Proxy</title></head><body style="font-family:system-ui;max-width:600px;margin:80px auto;padding:0 20px"><h1>Zen Proxy</h1><p>OpenCode Zen 免费模型反向代理 + 标准 HTTP 代理（部署于 Replit，美国出口 IP）。</p><p>反代接口 <code>/v1/chat/completions</code>，标准代理用 <code>CONNECT</code> 隧道。</p><p style="color:#16a34a">✓ 服务运行中</p></body></html>`);
    return;
  }
  // 标准 HTTP 代理：CONNECT 隧道（支持任意目标）
  if (req.method === 'CONNECT') {
    const auth = req.headers['x-proxy-token'] || (req.headers['proxy-authorization'] || '').replace(/^Basic\s+/i, '');
    if (auth !== TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    const [host, port] = req.url.split(':');
    const targetPort = parseInt(port, 10) || 443;
    const upstream = net.connect(targetPort, host, () => {
      res.writeHead(200, { 'Connection': 'keep-alive' });
      upstream.pipe(res);
      res.pipe(upstream);
    });
    upstream.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CONNECT failed' }));
    });
    return;
  }
  // Auth: x-proxy-token header must match
  if (req.headers['x-proxy-token'] !== TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    // /forward 端点：从 x-proxy-target 头读目标，转发到任意网址（通用出口）
    if (req.url === '/forward' || req.url === '/api/v1/forward') {
      const targetUrl = req.headers['x-proxy-target'];
      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'x-proxy-target header required' }));
        return;
      }
      const target = new URL(targetUrl);
      const options = {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: req.method || 'POST',
        headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
        timeout: 120000
      };
      if (req.headers['authorization']) options.headers['Authorization'] = req.headers['authorization'];
      if (req.headers['accept']) options.headers['Accept'] = req.headers['accept'];
      const mod = target.protocol === 'https:' ? https : http;
      const proxyReq = mod.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => {
        console.log('forward error:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
      proxyReq.on('timeout', () => proxyReq.destroy());
      proxyReq.write(body);
      proxyReq.end();
      return;
    }
    const target = new URL(UPSTREAM + req.url);
    const options = {
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'opencode/1.18.18 ai-sdk/provider-utils/4.0.23 runtime/node.js/24',
      },
      timeout: 120000
    };
    if (req.headers['authorization']) options.headers['Authorization'] = req.headers['authorization'];
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      console.log('upstream error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    proxyReq.on('timeout', () => proxyReq.destroy());
    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[replit-proxy] listening on 0.0.0.0:${PORT}, egress = Replit US IP`);
});