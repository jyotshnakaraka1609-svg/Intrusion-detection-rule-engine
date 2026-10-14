import {
  SecurityEvent,
  DetectionRule,
  Detection,
  Alert,
  AlertStatus,
  WatchlistEntry,
  SystemMetrics,
  TestResult
} from './types';

export interface DashboardSummaryResponse {
  metrics: SystemMetrics;
  recentDetections: Detection[];
  recentEvents: SecurityEvent[];
  rules: DetectionRule[];
  recentAlerts: Alert[];
}

export const api = {
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const res = await fetch('/api/dashboard/summary');
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  async getEvents(limit = 100, domain?: string, event_type?: string): Promise<{ events: SecurityEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (domain) params.set('domain', domain);
    if (event_type) params.set('event_type', event_type);
    const res = await fetch(`/api/events?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load events');
    return res.json();
  },

  async getAlerts(filters?: {
    severity?: string;
    domain?: string;
    rule_id?: string;
    status?: string;
    search?: string;
  }): Promise<{ alerts: Alert[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.domain) params.set('domain', filters.domain);
    if (filters?.rule_id) params.set('rule_id', filters.rule_id);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const res = await fetch(`/api/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load alerts');
    return res.json();
  },

  async getAlertById(alert_id: string): Promise<{ alert: Alert }> {
    const res = await fetch(`/api/alerts/${encodeURIComponent(alert_id)}`);
    if (!res.ok) throw new Error('Failed to load alert');
    return res.json();
  },

  async updateAlertStatus(alert_id: string, status: AlertStatus): Promise<{ alert: Alert }> {
    const res = await fetch(`/api/alerts/${encodeURIComponent(alert_id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update alert status');
    return res.json();
  },

  async getRules(): Promise<{ rules: DetectionRule[] }> {
    const res = await fetch('/api/rules');
    if (!res.ok) throw new Error('Failed to load rules');
    return res.json();
  },

  async updateRule(rule_id: string, updates: Partial<DetectionRule>): Promise<{ rule: DetectionRule }> {
    const res = await fetch(`/api/rules/${encodeURIComponent(rule_id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update rule');
    return res.json();
  },

  async getDetections(limit = 50, domain?: string): Promise<{ detections: Detection[] }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (domain) params.set('domain', domain);
    const res = await fetch(`/api/detections?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load detections');
    return res.json();
  },

  async getBackgroundTrace(detectionId: string): Promise<Detection> {
    const res = await fetch(`/api/background/${encodeURIComponent(detectionId)}`);
    if (!res.ok) throw new Error('Failed to load detection trace');
    return res.json();
  },

  async getWatchlist(): Promise<{ watchlist: WatchlistEntry[] }> {
    const res = await fetch('/api/watchlist');
    if (!res.ok) throw new Error('Failed to load watchlist');
    return res.json();
  },

  async addWatchlistIp(ip: string, label: string, category: string): Promise<any> {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, label, category })
    });
    if (!res.ok) throw new Error('Failed to add watchlist IP');
    return res.json();
  },

  async removeWatchlistIp(ip: string): Promise<any> {
    const res = await fetch(`/api/watchlist/${encodeURIComponent(ip)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove watchlist IP');
    return res.json();
  },

  async runValidationTests(): Promise<{
    timestamp: string;
    total_tests: number;
    passed_tests: number;
    results: TestResult[];
  }> {
    const res = await fetch('/api/test/run', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to execute test suite');
    return res.json();
  },

  async resetSystem(): Promise<any> {
    const res = await fetch('/api/system/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset system');
    return res.json();
  },

  // SSE Real-time subscription
  subscribeToStream(onMessage: (msg: { event: string; data: any }) => void): () => void {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error('SSE JSON parse error', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection warning', err);
    };

    return () => {
      eventSource.close();
    };
  }
};
