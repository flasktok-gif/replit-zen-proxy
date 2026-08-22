const http = require('http');
const https = require('https');

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
    res.end(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>Zen Proxy</title></head><body style="font-family:system-ui;max-width:600px;margin:80px auto;padding:0 20px"><h1>Zen Proxy</h1><p>OpenCode Zen 免费模型反向代理（部署于 Replit，美国出口 IP）。</p><p>代理接口位于 <code>/v1/chat/completions</code>，需携带 <code>x-proxy-token</code> 请求头。</p><p style="color:#16a34a">✓ 服务运行中</p></body></html>`);
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
    const target = new URL(UPSTREAM + req.url);
    const options = {
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method: req.method,
      headers: req.headers,
      timeout: 120000
    };
    options.headers['User-Agent'] = 'opencode/1.18.18 ai-sdk/provider-utils/4.0.23 runtime/node.js/24';
    delete options.headers['x-proxy-token'];
    delete options.headers['host'];
    delete options.headers['content-length'];
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