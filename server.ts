import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { db, hashPassword } from './server/db';
import { pipeline, registerSSEClient } from './server/pipeline';
import { stateManager } from './server/state';
import { runAutomatedValidationSuite } from './server/tests';

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsing with safe size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Client IP resolution helper
function getClientIp(req: Request, headerIp?: string): string {
  if (headerIp && typeof headerIp === 'string' && headerIp.trim()) {
    return headerIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '192.168.1.45';
}

// -------------------------------------------------------------
// Real-Time SSE Endpoint
// -------------------------------------------------------------
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', data: { timestamp: new Date().toISOString() } })}\n\n`);

  const unregister = registerSSEClient(({ event, data }) => {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregister();
  });
});

// -------------------------------------------------------------
// Ingestion & Event API
// -------------------------------------------------------------
app.post('/api/events/ingest', (req: Request, res: Response) => {
  const { domain, event_type, action, status, username, endpoint, method, user_agent, metadata, destination_port, destination_ip, source_ip, protocol } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required (web, ecommerce, banking)' });
  }

  const effectiveIp = source_ip || getClientIp(req);
  const result = pipeline.process(
    {
      domain,
      event_type,
      action,
      status,
      username,
      endpoint,
      method,
      user_agent,
      metadata,
      destination_port,
      destination_ip,
      source_ip: effectiveIp,
      protocol
    },
    effectiveIp,
    req.body.userActionLabel
  );

  res.status(201).json(result);
});

app.get('/api/events', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const domain = req.query.domain as string;
  const event_type = req.query.event_type as string;
  const events = db.getEvents(limit, domain, event_type);
  res.json({ events, total: db.getEventCount() });
});

app.get('/api/events/recent', (req: Request, res: Response) => {
  const events = db.getEvents(20);
  res.json({ events });
});

// -------------------------------------------------------------
// Rules API
// -------------------------------------------------------------
app.get('/api/rules', (_req: Request, res: Response) => {
  res.json({ rules: db.getRules() });
});

app.patch('/api/rules/:id', (req: Request, res: Response) => {
  const rule_id = req.params.id;
  const { enabled, threshold, time_window, severity } = req.body;

  const updates: any = {};
  if (typeof enabled === 'boolean') updates.enabled = enabled;
  if (typeof threshold === 'number' && threshold > 0) updates.threshold = threshold;
  if (typeof time_window === 'number' && time_window >= 0) updates.time_window = time_window;
  if (severity) updates.severity = severity;

  const updated = db.updateRule(rule_id, updates);
  if (!updated) {
    return res.status(404).json({ error: `Rule ${rule_id} not found` });
  }
  res.json({ rule: updated });
});

// -------------------------------------------------------------
// Detections & Background Traces API
// -------------------------------------------------------------
app.get('/api/detections', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const domain = req.query.domain as string;
  const detections = db.getDetections(limit, domain);
  res.json({ detections });
});

app.get('/api/detections/:id', (req: Request, res: Response) => {
  const detection = db.getDetectionById(req.params.id);
  if (!detection) {
    return res.status(404).json({ error: 'Detection not found' });
  }
  res.json({ detection });
});

app.get('/api/background/:detectionId', (req: Request, res: Response) => {
  const detection = db.getDetectionById(req.params.detectionId);
  if (!detection) {
    return res.status(404).json({ error: 'Detection trace not found' });
  }
  res.json({
    detection_id: detection.detection_id,
    rule_id: detection.rule_id,
    attack_type: detection.attack_type,
    severity: detection.severity,
    detected_at: detection.detected_at,
    observed_value: detection.observed_value,
    threshold: detection.threshold,
    time_window: detection.time_window,
    trace: detection.trace,
    evidence: detection.evidence,
    description: detection.description,
    why_suspicious: detection.why_suspicious,
    remediation: detection.remediation
  });
});

// -------------------------------------------------------------
// Alerts API
// -------------------------------------------------------------
app.get('/api/alerts', (req: Request, res: Response) => {
  const { severity, domain, rule_id, status, search } = req.query;
  const alerts = db.getAlerts({
    severity: severity as string,
    domain: domain as string,
    rule_id: rule_id as string,
    status: status as string,
    search: search as string,
  });
  res.json({ alerts, total: alerts.length });
});

app.get('/api/alerts/:id', (req: Request, res: Response) => {
  const alert = db.getAlertById(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json({ alert });
});

app.patch('/api/alerts/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid alert status' });
  }
  const updated = db.updateAlert(req.params.id, { status });
  if (!updated) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json({ alert: updated });
});

// -------------------------------------------------------------
// Backend Live Pipeline & State Inspector API
// -------------------------------------------------------------
app.get('/api/backend/live-state', (_req: Request, res: Response) => {
  const snapshot = stateManager.getSnapshot();
  const recentDetections = db.getDetections(10);
  const recentEvents = db.getEvents(25);
  const rules = db.getRules();
  const latestTrace = recentDetections.length > 0 ? recentDetections[0].trace : null;

  res.json({
    snapshot,
    recentDetections,
    recentEvents,
    rules,
    latestTrace,
    latestDetection: recentDetections[0] || null,
  });
});

// -------------------------------------------------------------
// Watchlist API
// -------------------------------------------------------------
app.get('/api/watchlist', (_req: Request, res: Response) => {
  res.json({ watchlist: db.getWatchlist() });
});

app.post('/api/watchlist', (req: Request, res: Response) => {
  const { ip, label, category, notes } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'Valid IP is required' });
  }
  db.addWatchlistIp({
    ip: ip.trim(),
    label: label || 'Custom Configured Watchlist IP',
    added_at: new Date().toISOString(),
    category: category || 'Configured Demo Indicator',
    notes: notes || 'User added via Sentinel Watchlist Manager'
  });
  res.status(201).json({ success: true, watchlist: db.getWatchlist() });
});

app.delete('/api/watchlist/:ip', (req: Request, res: Response) => {
  db.removeWatchlistIp(req.params.ip);
  res.json({ success: true, watchlist: db.getWatchlist() });
});

// -------------------------------------------------------------
// Dashboard & System Summary
// -------------------------------------------------------------
app.get('/api/dashboard/summary', (_req: Request, res: Response) => {
  const metrics = db.getMetrics();
  const recentDetections = db.getDetections(6);
  const recentEvents = db.getEvents(12);
  const rules = db.getRules();
  const alerts = db.getAlerts();

  res.json({
    metrics: {
      ...metrics,
      system_status: {
        rule_engine: 'ONLINE',
        event_collector: 'ONLINE',
        alert_manager: 'ONLINE',
        database: 'CONNECTED',
        real_time_channel: 'CONNECTED'
      }
    },
    recentDetections,
    recentEvents,
    rules,
    recentAlerts: alerts.slice(0, 5)
  });
});

app.get('/api/domains', (_req: Request, res: Response) => {
  res.json({
    domains: [
      {
        id: 'web',
        name: 'Web Applications & APIs',
        description: 'SaaS portals, user authentication gateways, and RESTful resource endpoints.',
        rulesSupported: ['BRUTE-001', 'RATE-001', 'IP-001'],
        endpoints: ['/api/web/login', '/api/web/profile', '/api/web/search', '/api/web/activity']
      },
      {
        id: 'ecommerce',
        name: 'E-Commerce ("Northwind Supply Co.")',
        description: 'Online store catalog, inventory search, customer checkout, and pricing APIs.',
        rulesSupported: ['RATE-001', 'IP-001'],
        endpoints: ['/api/ecommerce/products', '/api/ecommerce/search', '/api/ecommerce/cart']
      },
      {
        id: 'banking',
        name: 'Banking & FinTech ("Aegis Trust & Capital")',
        description: 'Fictional synthetic banking portal, transaction ledger, and controlled network diagnostics.',
        rulesSupported: ['BRUTE-001', 'SCAN-001', 'IP-001'],
        endpoints: ['/api/banking/login', '/api/banking/overview', '/api/banking/diagnostics/port-check']
      }
    ]
  });
});

// -------------------------------------------------------------
// Domain 1: Web Applications & APIs Handlers
// -------------------------------------------------------------
app.post('/api/web/login', (req: Request, res: Response) => {
  const { username, password, clientIp } = req.body;
  const effectiveIp = getClientIp(req, clientIp);

  const user = db.getUserByUsername(username);
  const isMatch = user && user.passwordHash === hashPassword(password);

  const pipelineResult = pipeline.process(
    {
      domain: 'web',
      source_ip: effectiveIp,
      event_type: 'AUTHENTICATION',
      action: 'LOGIN',
      status: isMatch ? 'SUCCESS' : 'FAILED',
      username: username || 'anonymous',
      endpoint: '/api/web/login',
      method: 'POST',
      metadata: { attempt_domain: 'web' }
    },
    effectiveIp,
    `Web Login attempt for user '${username || 'anonymous'}' (${isMatch ? 'Credentials Accepted' : 'Invalid Password'})`
  );

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify your username and password.',
      pipeline: pipelineResult
    });
  }

  res.json({
    success: true,
    user: { id: user.id, username: user.username, domain: user.domain },
    pipeline: pipelineResult
  });
});

app.get('/api/web/profile', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const pipelineResult = pipeline.process(
    {
      domain: 'web',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/web/profile',
      method: 'GET'
    },
    clientIp,
    'Accessed Web Profile Overview'
  );

  res.json({
    profile: {
      name: 'Alex Vance',
      role: 'Lead Systems Architect',
      email: 'alex.vance@sentinel-enterprise.internal',
      twoFactorEnabled: true,
      lastLogin: new Date(Date.now() - 3600000).toLocaleString()
    },
    pipeline: pipelineResult
  });
});

app.get('/api/web/activity', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const pipelineResult = pipeline.process(
    {
      domain: 'web',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/web/activity',
      method: 'GET'
    },
    clientIp,
    'Fetched Web Security Audit Activity'
  );

  res.json({
    activities: [
      { id: 'act-1', action: 'API Token Rotation', timestamp: '10 minutes ago', ip: '192.168.1.45', status: 'Success' },
      { id: 'act-2', action: 'SSH Key Added', timestamp: '2 hours ago', ip: '192.168.1.45', status: 'Success' },
      { id: 'act-3', action: 'Password Policy Audit', timestamp: 'Yesterday', ip: '192.168.1.100', status: 'Success' }
    ],
    pipeline: pipelineResult
  });
});

app.get('/api/web/search', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const query = (req.query.q as string) || '';

  const pipelineResult = pipeline.process(
    {
      domain: 'web',
      source_ip: clientIp,
      event_type: 'API_ACCESS',
      action: 'DATA_QUERY',
      status: 'SUCCESS',
      endpoint: `/api/web/search?q=${encodeURIComponent(query)}`,
      method: 'GET',
      metadata: { query }
    },
    clientIp,
    `Executed API search query: "${query}"`
  );

  res.json({
    query,
    results: [
      { title: 'Identity Federation Module', type: 'Documentation', path: '/docs/auth/sso' },
      { title: 'Rate Limiter Invariant Guidelines', type: 'Architecture', path: '/docs/security/rates' }
    ],
    pipeline: pipelineResult
  });
});

// -------------------------------------------------------------
// Domain 2: E-Commerce Handlers ("Northwind Supply Co.")
// -------------------------------------------------------------
const ECOMMERCE_PRODUCTS = [
  { id: 'prod-01', name: 'Precision Vernier Caliper (150mm)', category: 'Metrology', price: 1450, stock: 42, sku: 'MET-150V', description: 'Hardened stainless steel with dual scale metric/imperial readout and thumbscrew lock.' },
  { id: 'prod-02', name: 'Industrial Chronometer 24h Watch', category: 'Timepieces', price: 8200, stock: 15, sku: 'TIM-24HR', description: 'Swiss mechanical movement housed in matte bead-blasted 316L titanium.' },
  { id: 'prod-03', name: 'Heavy Canvas Field Dispatch Bag', category: 'Gear', price: 3400, stock: 28, sku: 'GER-BAG8', description: '18oz waxed duck canvas with brass hardware and reinforced saddle leather straps.' },
  { id: 'prod-04', name: 'Titanium Multi-Tool EDC Hex Wrench', category: 'Tools', price: 1950, stock: 60, sku: 'TOL-HEX9', description: 'Grade 5 titanium alloy with integrated bottle opener, pry bar, and 6 hex bit sockets.' },
  { id: 'prod-05', name: 'Optical Micro-Scribing Tool Set', category: 'Precision', price: 2850, stock: 19, sku: 'PRC-SCRIB', description: 'Tungsten carbide tips ground to 0.05mm radius for PCB trace repair and layout work.' },
  { id: 'prod-06', name: 'High-Temperature Ceramic Lab Mortar', category: 'Laboratory', price: 1100, stock: 34, sku: 'LAB-MORT', description: 'Unglazed high-alumina porcelain, chemically inert to 1200°C.' }
];

app.get('/api/ecommerce/products', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const pipelineResult = pipeline.process(
    {
      domain: 'ecommerce',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/ecommerce/products',
      method: 'GET'
    },
    clientIp,
    'Catalog Products Listing Request'
  );

  res.json({
    products: ECOMMERCE_PRODUCTS,
    pipeline: pipelineResult
  });
});

app.get('/api/ecommerce/search', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const q = ((req.query.q as string) || '').toLowerCase();

  const filtered = ECOMMERCE_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(q) || 
    p.category.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q)
  );

  const pipelineResult = pipeline.process(
    {
      domain: 'ecommerce',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'DATA_QUERY',
      status: 'SUCCESS',
      endpoint: `/api/ecommerce/search?q=${encodeURIComponent(q)}`,
      method: 'GET',
      metadata: { query: q, match_count: filtered.length }
    },
    clientIp,
    `E-Commerce Catalog Search: "${q}"`
  );

  res.json({
    query: q,
    results: filtered,
    pipeline: pipelineResult
  });
});

app.post('/api/ecommerce/cart/add', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.body.clientIp);
  const { productId, quantity } = req.body;

  const product = ECOMMERCE_PRODUCTS.find(p => p.id === productId);

  const pipelineResult = pipeline.process(
    {
      domain: 'ecommerce',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: product ? 'SUCCESS' : 'FAILED',
      endpoint: '/api/ecommerce/cart/add',
      method: 'POST',
      metadata: { productId, quantity }
    },
    clientIp,
    `Added ${quantity || 1}x ${product ? product.name : productId} to cart`
  );

  res.json({
    success: !!product,
    product,
    pipeline: pipelineResult
  });
});

// -------------------------------------------------------------
// Domain 3: Banking & FinTech Handlers ("Aegis Trust & Capital")
// -------------------------------------------------------------
app.post('/api/banking/login', (req: Request, res: Response) => {
  const { username, password, clientIp } = req.body;
  const effectiveIp = getClientIp(req, clientIp);

  const user = db.getUserByUsername(username);
  const isMatch = user && user.passwordHash === hashPassword(password);

  const pipelineResult = pipeline.process(
    {
      domain: 'banking',
      source_ip: effectiveIp,
      event_type: 'AUTHENTICATION',
      action: 'LOGIN',
      status: isMatch ? 'SUCCESS' : 'FAILED',
      username: username || 'anonymous_bank_user',
      endpoint: '/api/banking/login',
      method: 'POST',
      metadata: { institution: 'Aegis Trust & Capital' }
    },
    effectiveIp,
    `Banking Portal Auth Attempt for account '${username || 'anonymous'}' (${isMatch ? 'Authorized' : 'Rejected'})`
  );

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid customer credentials.',
      pipeline: pipelineResult
    });
  }

  res.json({
    success: true,
    user: { username: user.username, account: '**** 4821', balance: '₹82,450' },
    pipeline: pipelineResult
  });
});

app.get('/api/banking/overview', (req: Request, res: Response) => {
  const clientIp = getClientIp(req, req.query.clientIp as string);
  const pipelineResult = pipeline.process(
    {
      domain: 'banking',
      source_ip: clientIp,
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/banking/overview',
      method: 'GET'
    },
    clientIp,
    'Accessed Synthetic Banking Account Ledger'
  );

  res.json({
    account: {
      accountNumber: '**** 4821',
      accountHolder: 'P. R. Shrivastava',
      accountType: 'Commercial Treasury Reserve',
      balance: '₹82,450.00',
      availableCredit: '₹2,50,000.00',
      currency: 'INR',
      status: 'ACTIVE_DEMO'
    },
    transactions: [
      { id: 'TX-901', date: '2026-10-02', desc: 'Direct Deposit — Automated Clearing', amount: '+₹45,000.00', type: 'CREDIT', balance: '₹82,450.00' },
      { id: 'TX-902', date: '2026-09-28', desc: 'Hardware Logistics Corp Freight Bill', amount: '-₹14,250.00', type: 'DEBIT', balance: '₹37,450.00' },
      { id: 'TX-903', date: '2026-09-22', desc: 'Cloud Infrastructure Hosting Settlement', amount: '-₹8,300.00', type: 'DEBIT', balance: '₹51,700.00' }
    ],
    pipeline: pipelineResult
  });
});

// Controlled Network Diagnostics Port Check Endpoint
app.post('/api/banking/diagnostics/port-check', (req: Request, res: Response) => {
  const { port, targetIp, clientIp } = req.body;
  const effectiveIp = getClientIp(req, clientIp);
  const destIp = '10.10.0.10'; // Strictly enforced controlled synthetic target

  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return res.status(400).json({ error: 'Port must be a valid integer between 1 and 65535' });
  }

  // Common simulated open ports on demo target 10.10.0.10
  const openPorts = [22, 53, 80, 443, 3306, 5432, 8080];
  const isOpen = openPorts.includes(portNum);

  const pipelineResult = pipeline.process(
    {
      domain: 'banking',
      source_ip: effectiveIp,
      destination_ip: destIp,
      destination_port: portNum,
      protocol: 'TCP',
      event_type: 'NETWORK_CONNECTION',
      action: 'PORT_CHECK',
      status: isOpen ? 'SUCCESS' : 'BLOCKED',
      metadata: { target_alias: 'aegis-core-gateway', controlled_demo: true }
    },
    effectiveIp,
    `Network Diagnostic Probe to controlled target ${destIp}:${portNum} (TCP)`
  );

  res.json({
    target: destIp,
    port: portNum,
    state: isOpen ? 'OPEN' : 'FILTERED/CLOSED',
    latency_ms: Math.floor(2 + Math.random() * 8),
    pipeline: pipelineResult
  });
});

// -------------------------------------------------------------
// Automated Validation Test Suite Runner Endpoint
// -------------------------------------------------------------
app.post('/api/test/run', async (_req: Request, res: Response) => {
  const suiteResults = await runAutomatedValidationSuite();
  res.json(suiteResults);
});

// System Reset
app.post('/api/system/reset', (_req: Request, res: Response) => {
  db.resetToDefault();
  res.json({ success: true, message: 'System state reset to baseline demo configuration.' });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function setupViteOrStatic() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }
}

setupViteOrStatic().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sentinel Rule Engine] Server running on http://0.0.0.0:${PORT}`);
  });
});
