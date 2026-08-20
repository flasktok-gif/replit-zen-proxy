const http = require('http');
const https = require('https');

const TOKEN = process.env.REQ_TOKEN || 'ocpool-secret-2026';

const server = http.createServer((req, res) => {
  // 鉴权：请求头 x-proxy-token 必须匹配
  if (req.headers['x-proxy-token'] !== TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const target = new URL('https://opencode.ai/zen' + req.url);
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

server.listen(7860, '0.0.0.0', () => {
  console.log('[replit-proxy] listening on 7860, egress = Replit US IP');
});