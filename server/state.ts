import { SecurityEvent } from './types';

interface PortScanRecord {
  port: number;
  timestamp: number;
}

export class StateManager {
  // Map of source_ip -> array of failed login timestamps (epoch ms)
  private failedLoginsByIp: Map<string, number[]> = new Map();

  // Map of `${source_ip}:${destination_ip}` -> array of { port, timestamp }
  private portChecksByIpPair: Map<string, PortScanRecord[]> = new Map();

  // Map of source_ip -> array of request timestamps (epoch ms)
  private requestsByIp: Map<string, number[]> = new Map();

  /**
   * Updates state based on the incoming normalized event.
   */
  public updateState(event: SecurityEvent) {
    const now = event.epoch_ms;

    // 1. Brute Force tracking: Authentication failure
    if (event.event_type === 'AUTHENTICATION' && event.action === 'LOGIN' && event.status === 'FAILED') {
      const history = this.failedLoginsByIp.get(event.source_ip) || [];
      history.push(now);
      this.failedLoginsByIp.set(event.source_ip, history);
    }

    // 2. Port Scan tracking: Network connection port check
    if (event.action === 'PORT_CHECK' && event.destination_port) {
      const key = `${event.source_ip}:${event.destination_ip}`;
      const records = this.portChecksByIpPair.get(key) || [];
      records.push({ port: event.destination_port, timestamp: now });
      this.portChecksByIpPair.set(key, records);
    }

    // 3. High Request Rate tracking: All HTTP / API requests
    if (event.event_type === 'HTTP_REQUEST' || event.event_type === 'API_ACCESS') {
      const history = this.requestsByIp.get(event.source_ip) || [];
      history.push(now);
      this.requestsByIp.set(event.source_ip, history);
    }

    // Perform background pruning for this source IP
    this.pruneStale(now);
  }

  /**
   * Retrieves active failed login count for source_ip within windowSeconds.
   */
  public getFailedLoginCount(source_ip: string, windowSeconds: number, now = Date.now()): { count: number; timestamps: number[] } {
    const cutoff = now - windowSeconds * 1000;
    const history = (this.failedLoginsByIp.get(source_ip) || []).filter(ts => ts >= cutoff);
    this.failedLoginsByIp.set(source_ip, history);
    return { count: history.length, timestamps: history };
  }

  /**
   * Retrieves unique destination ports scanned by source_ip to destination_ip within windowSeconds.
   */
  public getPortScanState(source_ip: string, destination_ip: string, windowSeconds: number, now = Date.now()): {
    uniquePorts: number[];
    uniqueCount: number;
    allChecks: PortScanRecord[];
  } {
    const key = `${source_ip}:${destination_ip}`;
    const cutoff = now - windowSeconds * 1000;
    const records = (this.portChecksByIpPair.get(key) || []).filter(r => r.timestamp >= cutoff);
    this.portChecksByIpPair.set(key, records);

    const uniquePorts = Array.from(new Set(records.map(r => r.port)));
    return {
      uniquePorts,
      uniqueCount: uniquePorts.length,
      allChecks: records,
    };
  }

  /**
   * Retrieves active request count for source_ip within windowSeconds.
   */
  public getRequestCount(source_ip: string, windowSeconds: number, now = Date.now()): { count: number; timestamps: number[] } {
    const cutoff = now - windowSeconds * 1000;
    const history = (this.requestsByIp.get(source_ip) || []).filter(ts => ts >= cutoff);
    this.requestsByIp.set(source_ip, history);
    return { count: history.length, timestamps: history };
  }

  /**
   * Periodic pruning of old state to maintain memory discipline.
   */
  public pruneStale(now = Date.now()) {
    const maxWindow = 120000; // 2 minutes maximum window for any rule
    const cutoff = now - maxWindow;

    for (const [ip, list] of this.failedLoginsByIp.entries()) {
      const filtered = list.filter(ts => ts >= cutoff);
      if (filtered.length === 0) {
        this.failedLoginsByIp.delete(ip);
      } else {
        this.failedLoginsByIp.set(ip, filtered);
      }
    }

    for (const [key, records] of this.portChecksByIpPair.entries()) {
      const filtered = records.filter(r => r.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.portChecksByIpPair.delete(key);
      } else {
        this.portChecksByIpPair.set(key, filtered);
      }
    }

    for (const [ip, list] of this.requestsByIp.entries()) {
      const filtered = list.filter(ts => ts >= cutoff);
      if (filtered.length === 0) {
        this.requestsByIp.delete(ip);
      } else {
        this.requestsByIp.set(ip, filtered);
      }
    }
  }

  /**
   * Returns a snapshot of current active sliding windows for the backend inspector.
   */
  public getSnapshot(): {
    activeFailedLogins: Array<{ ip: string; count: number; timestamps: number[] }>;
    activePortScans: Array<{ ipPair: string; uniquePorts: number[]; count: number }>;
    activeRequestRates: Array<{ ip: string; count: number }>;
  } {
    this.pruneStale();
    const activeFailedLogins: Array<{ ip: string; count: number; timestamps: number[] }> = [];
    for (const [ip, ts] of this.failedLoginsByIp.entries()) {
      activeFailedLogins.push({ ip, count: ts.length, timestamps: ts });
    }

    const activePortScans: Array<{ ipPair: string; uniquePorts: number[]; count: number }> = [];
    for (const [pair, records] of this.portChecksByIpPair.entries()) {
      const ports = Array.from(new Set(records.map(r => r.port)));
      activePortScans.push({ ipPair: pair, uniquePorts: ports, count: ports.length });
    }

    const activeRequestRates: Array<{ ip: string; count: number }> = [];
    for (const [ip, ts] of this.requestsByIp.entries()) {
      activeRequestRates.push({ ip, count: ts.length });
    }

    return { activeFailedLogins, activePortScans, activeRequestRates };
  }

  /**
   * Clears state (used during test runner resets).
   */
  public clear() {
    this.failedLoginsByIp.clear();
    this.portChecksByIpPair.clear();
    this.requestsByIp.clear();
  }
}

export const stateManager = new StateManager();
