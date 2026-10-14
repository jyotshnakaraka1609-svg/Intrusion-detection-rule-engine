import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SecurityEvent, DetectionRule, Detection, Alert, WatchlistEntry } from './types';

const DATA_FILE = path.resolve(process.cwd(), 'data_store.json');

export interface DatabaseState {
  events: SecurityEvent[];
  rules: DetectionRule[];
  detections: Detection[];
  alerts: Alert[];
  watchlist: WatchlistEntry[];
  users: Array<{ id: string; username: string; passwordHash: string; domain: string }>;
}

const DEFAULT_RULES: DetectionRule[] = [
  {
    rule_id: 'BRUTE-001',
    name: 'Brute Force Login Detection',
    description: 'Detects repeated failed authentication attempts from the same source IP within a sliding 60-second window.',
    attack_type: 'Brute Force Authentication',
    severity: 'HIGH',
    threshold: 3,
    time_window: 60,
    enabled: true,
    domain: 'ALL',
  },
  {
    rule_id: 'SCAN-001',
    name: 'Port Scan Detection',
    description: 'Detects a source IP attempting connections to more than 15 unique destination ports on the same controlled target within 10 seconds.',
    attack_type: 'Reconnaissance / Port Scan',
    severity: 'HIGH',
    threshold: 15,
    time_window: 10,
    enabled: true,
    domain: 'ALL',
  },
  {
    rule_id: 'RATE-001',
    name: 'High Request Rate Detection',
    description: 'Detects unusually aggressive HTTP/API activity exceeding 100 requests from a single source IP within 10 seconds.',
    attack_type: 'Application Rate Abuse / Scraping / DoS',
    severity: 'HIGH',
    threshold: 100,
    time_window: 10,
    enabled: true,
    domain: 'ALL',
  },
  {
    rule_id: 'IP-001',
    name: 'Suspicious IP Watchlist Detection',
    description: 'Detects incoming network or application connections originating from an IP listed in the configured security watchlist.',
    attack_type: 'Watchlist Indicator Match',
    severity: 'HIGH',
    threshold: 1,
    time_window: 0,
    enabled: true,
    domain: 'ALL',
  }
];

const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  {
    ip: '203.0.113.25',
    label: 'Configured Demo Watchlist #1',
    added_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    category: 'Known Hostile Botnet Probe (RFC 5737 Test IP)',
    notes: 'Configured security watchlist test address for demonstration purposes.'
  },
  {
    ip: '198.51.100.10',
    label: 'Configured Demo Watchlist #2',
    added_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    category: 'Flagged Credential Harvester (RFC 5737 Test IP)',
    notes: 'Configured security watchlist test address for demonstration purposes.'
  }
];

// Helper to hash passwords using standard SHA-256 + salt
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`sentinel_salt_${password}`).digest('hex');
}

const DEFAULT_USERS = [
  { id: 'usr-1', username: 'alex.vance', passwordHash: hashPassword('SentinelSecure2026!'), domain: 'web' },
  { id: 'usr-2', username: 'shopper_carter', passwordHash: hashPassword('CartSecure99#'), domain: 'ecommerce' },
  { id: 'usr-3', username: 'fintech_admin', passwordHash: hashPassword('AegisFin2026@!'), domain: 'banking' }
];

// Seed recent nominal events so the dashboard starts in an active, healthy operational state
function generateSeedEvents(): SecurityEvent[] {
  const now = Date.now();
  const seed: SecurityEvent[] = [
    {
      event_id: 'EVT-SEED-001',
      timestamp: new Date(now - 120000).toISOString(),
      epoch_ms: now - 120000,
      source_ip: '192.168.1.105',
      destination_ip: '10.0.0.1',
      source_port: 52140,
      destination_port: 443,
      protocol: 'HTTPS',
      event_type: 'AUTHENTICATION',
      action: 'LOGIN',
      status: 'SUCCESS',
      username: 'alex.vance',
      endpoint: '/api/auth/login',
      method: 'POST',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      domain: 'web',
      metadata: { session_type: 'standard_user' }
    },
    {
      event_id: 'EVT-SEED-002',
      timestamp: new Date(now - 90000).toISOString(),
      epoch_ms: now - 90000,
      source_ip: '192.168.1.110',
      destination_ip: '10.0.0.1',
      protocol: 'HTTP',
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/ecommerce/products',
      method: 'GET',
      domain: 'ecommerce',
      metadata: { response_time_ms: 18 }
    },
    {
      event_id: 'EVT-SEED-003',
      timestamp: new Date(now - 60000).toISOString(),
      epoch_ms: now - 60000,
      source_ip: '192.168.1.110',
      destination_ip: '10.0.0.1',
      protocol: 'HTTP',
      event_type: 'HTTP_REQUEST',
      action: 'REQUEST',
      status: 'SUCCESS',
      endpoint: '/api/ecommerce/cart',
      method: 'GET',
      domain: 'ecommerce',
      metadata: { items_in_cart: 2 }
    },
    {
      event_id: 'EVT-SEED-004',
      timestamp: new Date(now - 30000).toISOString(),
      epoch_ms: now - 30000,
      source_ip: '192.168.1.140',
      destination_ip: '10.10.0.10',
      source_port: 49120,
      destination_port: 443,
      protocol: 'HTTPS',
      event_type: 'NETWORK_CONNECTION',
      action: 'PORT_CHECK',
      status: 'SUCCESS',
      domain: 'banking',
      metadata: { target_host: 'aegis-gateway.internal' }
    }
  ];
  return seed;
}

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays exist
        return {
          events: parsed.events || generateSeedEvents(),
          rules: parsed.rules || DEFAULT_RULES,
          detections: parsed.detections || [],
          alerts: parsed.alerts || [],
          watchlist: parsed.watchlist || DEFAULT_WATCHLIST,
          users: parsed.users || DEFAULT_USERS,
        };
      }
    } catch (err) {
      console.error('[DB] Error loading state from disk, using defaults:', err);
    }

    const initial: DatabaseState = {
      events: generateSeedEvents(),
      rules: DEFAULT_RULES,
      detections: [],
      alerts: [],
      watchlist: DEFAULT_WATCHLIST,
      users: DEFAULT_USERS,
    };
    this.saveState(initial);
    return initial;
  }

  private saveState(stateToSave: DatabaseState) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(stateToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save state to disk:', err);
    }
  }

  public save() {
    this.saveState(this.state);
  }

  public resetToDefault() {
    this.state = {
      events: generateSeedEvents(),
      rules: DEFAULT_RULES,
      detections: [],
      alerts: [],
      watchlist: DEFAULT_WATCHLIST,
      users: DEFAULT_USERS,
    };
    this.save();
  }

  // Events
  public addEvent(event: SecurityEvent) {
    this.state.events.unshift(event);
    // Keep max 2,000 events to prevent unbounded growth
    if (this.state.events.length > 2000) {
      this.state.events = this.state.events.slice(0, 2000);
    }
    this.save();
  }

  public getEvents(limit = 100, domain?: string, event_type?: string): SecurityEvent[] {
    let list = this.state.events;
    if (domain) {
      list = list.filter(e => e.domain === domain);
    }
    if (event_type) {
      list = list.filter(e => e.event_type === event_type);
    }
    return list.slice(0, limit);
  }

  public getEventCount(): number {
    return this.state.events.length;
  }

  // Rules
  public getRules(): DetectionRule[] {
    return this.state.rules;
  }

  public getRule(rule_id: string): DetectionRule | undefined {
    return this.state.rules.find(r => r.rule_id === rule_id);
  }

  public updateRule(rule_id: string, updates: Partial<DetectionRule>): DetectionRule | null {
    const idx = this.state.rules.findIndex(r => r.rule_id === rule_id);
    if (idx === -1) return null;
    this.state.rules[idx] = { ...this.state.rules[idx], ...updates };
    this.save();
    return this.state.rules[idx];
  }

  // Detections
  public addDetection(detection: Detection) {
    this.state.detections.unshift(detection);
    if (this.state.detections.length > 500) {
      this.state.detections = this.state.detections.slice(0, 500);
    }
    this.save();
  }

  public getDetections(limit = 50, domain?: string): Detection[] {
    let list = this.state.detections;
    if (domain) {
      list = list.filter(d => d.domain === domain);
    }
    return list.slice(0, limit);
  }

  public getDetectionById(detection_id: string): Detection | undefined {
    return this.state.detections.find(d => d.detection_id === detection_id);
  }

  // Alerts
  public addAlert(alert: Alert) {
    this.state.alerts.unshift(alert);
    if (this.state.alerts.length > 500) {
      this.state.alerts = this.state.alerts.slice(0, 500);
    }
    this.save();
  }

  public getAlerts(filters?: {
    severity?: string;
    domain?: string;
    rule_id?: string;
    status?: string;
    search?: string;
  }): Alert[] {
    let list = this.state.alerts;
    if (!filters) return list;

    if (filters.severity) {
      list = list.filter(a => a.severity.toLowerCase() === filters.severity!.toLowerCase());
    }
    if (filters.domain) {
      list = list.filter(a => a.domain.toLowerCase() === filters.domain!.toLowerCase());
    }
    if (filters.rule_id) {
      list = list.filter(a => a.rule_id.toLowerCase() === filters.rule_id!.toLowerCase());
    }
    if (filters.status) {
      list = list.filter(a => a.status.toLowerCase() === filters.status!.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a => 
        a.alert_id.toLowerCase().includes(q) ||
        a.source_ip.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.attack_type.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getAlertById(alert_id: string): Alert | undefined {
    return this.state.alerts.find(a => a.alert_id === alert_id);
  }

  public updateAlert(alert_id: string, updates: Partial<Alert>): Alert | null {
    const idx = this.state.alerts.findIndex(a => a.alert_id === alert_id);
    if (idx === -1) return null;
    this.state.alerts[idx] = { 
      ...this.state.alerts[idx], 
      ...updates,
      last_updated: new Date().toISOString()
    };
    this.save();
    return this.state.alerts[idx];
  }

  // Watchlist
  public getWatchlist(): WatchlistEntry[] {
    return this.state.watchlist;
  }

  public isIpInWatchlist(ip: string): boolean {
    return this.state.watchlist.some(w => w.ip === ip);
  }

  public addWatchlistIp(entry: WatchlistEntry) {
    if (!this.isIpInWatchlist(entry.ip)) {
      this.state.watchlist.push(entry);
      this.save();
    }
  }

  public removeWatchlistIp(ip: string) {
    this.state.watchlist = this.state.watchlist.filter(w => w.ip !== ip);
    this.save();
  }

  // Users
  public getUserByUsername(username: string) {
    return this.state.users.find(u => u.username === username);
  }

  public getMetrics(): {
    total_events: number;
    events_per_minute: number;
    active_alerts: number;
    high_severity_alerts: number;
    total_detections: number;
    enabled_rules_count: number;
  } {
    const now = Date.now();
    const oneMinAgo = now - 60000;
    const eventsPerMin = this.state.events.filter(e => e.epoch_ms >= oneMinAgo).length;

    const activeAlerts = this.state.alerts.filter(a => a.status === 'NEW' || a.status === 'INVESTIGATING').length;
    const highAlerts = this.state.alerts.filter(a => (a.severity === 'HIGH' || a.severity === 'CRITICAL') && a.status !== 'RESOLVED').length;
    const enabledRules = this.state.rules.filter(r => r.enabled).length;

    return {
      total_events: this.state.events.length,
      events_per_minute: eventsPerMin,
      active_alerts: activeAlerts,
      high_severity_alerts: highAlerts,
      total_detections: this.state.detections.length,
      enabled_rules_count: enabledRules,
    };
  }
}

export const db = new Database();
