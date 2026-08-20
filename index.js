const http = require('http');
const https = require('https');

const TOKEN = process.env.REQ_TOKEN || '';
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error('ERROR: REQ_TOKEN not set. Add it in Replit Secrets.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Health check for Replit deployment
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[replit-proxy] listening on 0.0.0.0:${PORT}, egress = Replit US IP`);
});