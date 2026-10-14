import crypto from 'crypto';
import { SecurityEvent, DetectionRule, Detection, PipelineTraceStep } from './types';
import { db } from './db';
import { stateManager } from './state';

export interface RuleEvaluationResult {
  matched: boolean;
  rule: DetectionRule;
  observed_value: number | string;
  evidence: string[];
  description: string;
  why_suspicious: string;
  remediation: string;
  traceSteps: PipelineTraceStep[];
}

export class RuleEngine {
  /**
   * Evaluates all enabled rules against the incoming event and current state.
   */
  public evaluate(event: SecurityEvent, baseTrace: PipelineTraceStep[]): Detection[] {
    const enabledRules = db.getRules().filter(r => r.enabled);
    const detections: Detection[] = [];

    for (const rule of enabledRules) {
      // Check domain match if specified
      if (rule.domain && rule.domain !== 'ALL' && rule.domain !== event.domain) {
        continue;
      }

      const evalResult = this.evaluateSingleRule(rule, event, baseTrace);
      if (evalResult.matched) {
        const detection_id = `DET-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        const detection: Detection = {
          detection_id,
          rule_id: rule.rule_id,
          rule_name: rule.name,
          attack_type: rule.attack_type,
          severity: rule.severity,
          source_ip: event.source_ip,
          destination_ip: event.destination_ip,
          domain: event.domain,
          detected_at: new Date().toISOString(),
          observed_value: evalResult.observed_value,
          threshold: rule.threshold,
          time_window: rule.time_window,
          evidence: evalResult.evidence,
          description: evalResult.description,
          why_suspicious: evalResult.why_suspicious,
          remediation: evalResult.remediation,
          trace: evalResult.traceSteps,
        };

        detections.push(detection);
      }
    }

    return detections;
  }

  private evaluateSingleRule(rule: DetectionRule, event: SecurityEvent, baseTrace: PipelineTraceStep[]): RuleEvaluationResult {
    switch (rule.rule_id) {
      case 'BRUTE-001':
        return this.evaluateBruteForce(rule, event, baseTrace);
      case 'SCAN-001':
        return this.evaluatePortScan(rule, event, baseTrace);
      case 'RATE-001':
        return this.evaluateRateLimit(rule, event, baseTrace);
      case 'IP-001':
        return this.evaluateWatchlistIp(rule, event, baseTrace);
      default:
        return {
          matched: false,
          rule,
          observed_value: 0,
          evidence: [],
          description: '',
          why_suspicious: '',
          remediation: '',
          traceSteps: [...baseTrace]
        };
    }
  }

  // 1. RULE 1 — BRUTE FORCE LOGIN (BRUTE-001)
  private evaluateBruteForce(rule: DetectionRule, event: SecurityEvent, baseTrace: PipelineTraceStep[]): RuleEvaluationResult {
    const traceSteps = [...baseTrace];
    
    // Only check on authentication failure events
    if (event.event_type !== 'AUTHENTICATION' || event.action !== 'LOGIN' || event.status !== 'FAILED') {
      return {
        matched: false,
        rule,
        observed_value: 0,
        evidence: [],
        description: '',
        why_suspicious: '',
        remediation: '',
        traceSteps
      };
    }

    const { count, timestamps } = stateManager.getFailedLoginCount(event.source_ip, rule.time_window, event.epoch_ms);

    traceSteps.push({
      step: 'RULE_ENGINE',
      name: 'Rule Engine Evaluation',
      timestamp: new Date().toISOString(),
      status: count >= rule.threshold ? 'MATCHED' : 'NO_MATCH',
      details: `Evaluated ${rule.rule_id} for source ${event.source_ip}. Observed ${count} failed logins (Threshold: ${rule.threshold}, Window: ${rule.time_window}s).`,
      data: {
        rule_id: rule.rule_id,
        source_ip: event.source_ip,
        observed_failed_count: count,
        threshold: rule.threshold,
        window_seconds: rule.time_window,
      }
    });

    if (count >= rule.threshold) {
      const firstTs = new Date(timestamps[0]).toLocaleTimeString();
      const lastTs = new Date(timestamps[timestamps.length - 1]).toLocaleTimeString();

      const evidence = [
        `Source IP: ${event.source_ip}`,
        `Target Username: ${event.username || 'unspecified'}`,
        `Failed Attempts in Window: ${count} (Threshold: ${rule.threshold})`,
        `Sliding Time Window: ${rule.time_window} seconds`,
        `Earliest attempt in window: ${firstTs}`,
        `Latest attempt in window: ${lastTs}`,
        `Authentication Endpoint: ${event.endpoint || '/api/auth/login'}`,
        `Domain: ${event.domain}`
      ];

      return {
        matched: true,
        rule,
        observed_value: `${count} failed attempts in ${rule.time_window}s`,
        evidence,
        description: `Source IP ${event.source_ip} generated ${count} failed login attempts within ${rule.time_window} seconds against domain '${event.domain}'.`,
        why_suspicious: 'A rapid sequence of failed login attempts from a single IP is a primary signature of credential stuffing, dictionary attacks, or password spray reconnaissance.',
        remediation: 'Implement progressive exponential backoff delays, enforce CAPTCHA verification on the target account, and consider temporary IP address cooldown.',
        traceSteps
      };
    }

    return {
      matched: false,
      rule,
      observed_value: count,
      evidence: [],
      description: '',
      why_suspicious: '',
      remediation: '',
      traceSteps
    };
  }

  // 2. RULE 2 — PORT SCAN (SCAN-001)
  private evaluatePortScan(rule: DetectionRule, event: SecurityEvent, baseTrace: PipelineTraceStep[]): RuleEvaluationResult {
    const traceSteps = [...baseTrace];

    // Only network connection / port checks
    if (event.action !== 'PORT_CHECK' || !event.destination_port) {
      return {
        matched: false,
        rule,
        observed_value: 0,
        evidence: [],
        description: '',
        why_suspicious: '',
        remediation: '',
        traceSteps
      };
    }

    const { uniquePorts, uniqueCount } = stateManager.getPortScanState(
      event.source_ip,
      event.destination_ip,
      rule.time_window,
      event.epoch_ms
    );

    traceSteps.push({
      step: 'RULE_ENGINE',
      name: 'Rule Engine Evaluation',
      timestamp: new Date().toISOString(),
      status: uniqueCount > rule.threshold ? 'MATCHED' : 'NO_MATCH',
      details: `Evaluated ${rule.rule_id} for ${event.source_ip} -> ${event.destination_ip}. Observed ${uniqueCount} unique ports (Threshold: >${rule.threshold}, Window: ${rule.time_window}s).`,
      data: {
        rule_id: rule.rule_id,
        source_ip: event.source_ip,
        destination_ip: event.destination_ip,
        observed_unique_ports: uniqueCount,
        threshold: rule.threshold,
        ports_sample: uniquePorts.slice(0, 10),
      }
    });

    // Rule condition: "more than 15 unique destination ports within 10 seconds"
    if (uniqueCount > rule.threshold) {
      const portListSample = uniquePorts.slice(-10).join(', ') + (uniquePorts.length > 10 ? ` (+${uniquePorts.length - 10} more)` : '');

      const evidence = [
        `Source IP: ${event.source_ip}`,
        `Destination IP: ${event.destination_ip}`,
        `Unique Destination Ports Scanned: ${uniqueCount} (Threshold: >${rule.threshold})`,
        `Sliding Time Window: ${rule.time_window} seconds`,
        `Observed Ports Sample: [ ${portListSample} ]`,
        `Protocol: ${event.protocol}`,
        `Domain: ${event.domain}`
      ];

      return {
        matched: true,
        rule,
        observed_value: `${uniqueCount} unique ports in ${rule.time_window}s`,
        evidence,
        description: `Source IP ${event.source_ip} probed ${uniqueCount} unique destination ports on target ${event.destination_ip} within ${rule.time_window} seconds.`,
        why_suspicious: 'Rapid connection probes across multiple destination ports indicate systematic service discovery and vulnerability reconnaissance preceding an targeted exploit attempt.',
        remediation: 'Blackhole or rate-limit probing IP at the boundary firewall/gateway, verify that non-essential listening ports on target 10.10.0.10 are closed or protected by VPN.',
        traceSteps
      };
    }

    return {
      matched: false,
      rule,
      observed_value: uniqueCount,
      evidence: [],
      description: '',
      why_suspicious: '',
      remediation: '',
      traceSteps
    };
  }

  // 3. RULE 3 — HIGH REQUEST RATE (RATE-001)
  private evaluateRateLimit(rule: DetectionRule, event: SecurityEvent, baseTrace: PipelineTraceStep[]): RuleEvaluationResult {
    const traceSteps = [...baseTrace];

    // Only HTTP / API request events
    if (event.event_type !== 'HTTP_REQUEST' && event.event_type !== 'API_ACCESS') {
      return {
        matched: false,
        rule,
        observed_value: 0,
        evidence: [],
        description: '',
        why_suspicious: '',
        remediation: '',
        traceSteps
      };
    }

    const { count } = stateManager.getRequestCount(event.source_ip, rule.time_window, event.epoch_ms);

    traceSteps.push({
      step: 'RULE_ENGINE',
      name: 'Rule Engine Evaluation',
      timestamp: new Date().toISOString(),
      status: count > rule.threshold ? 'MATCHED' : 'NO_MATCH',
      details: `Evaluated ${rule.rule_id} for source ${event.source_ip}. Observed ${count} requests (Threshold: >${rule.threshold}, Window: ${rule.time_window}s).`,
      data: {
        rule_id: rule.rule_id,
        source_ip: event.source_ip,
        observed_request_count: count,
        threshold: rule.threshold,
        window_seconds: rule.time_window,
      }
    });

    // Rule condition: "more than 100 requests within 10 seconds"
    if (count > rule.threshold) {
      const evidence = [
        `Source IP: ${event.source_ip}`,
        `Request Volume: ${count} requests (Threshold: >${rule.threshold})`,
        `Sliding Time Window: ${rule.time_window} seconds`,
        `Last Endpoint Accessed: ${event.method} ${event.endpoint}`,
        `User Agent: ${event.user_agent || 'Unknown'}`,
        `Domain: ${event.domain}`
      ];

      return {
        matched: true,
        rule,
        observed_value: `${count} requests in ${rule.time_window}s`,
        evidence,
        description: `Source IP ${event.source_ip} issued ${count} HTTP requests within ${rule.time_window} seconds against domain '${event.domain}'.`,
        why_suspicious: 'Request volumes exceeding 10 req/sec from a single source client indicate automated scraping, script-based content enumeration, or Layer 7 volumetric denial-of-service.',
        remediation: 'Engage edge rate limiting / token bucket algorithm, require JavaScript challenge or CAPTCHA verification, and inspect request headers for bot signatures.',
        traceSteps
      };
    }

    return {
      matched: false,
      rule,
      observed_value: count,
      evidence: [],
      description: '',
      why_suspicious: '',
      remediation: '',
      traceSteps
    };
  }

  // 4. RULE 4 — SUSPICIOUS IP (IP-001)
  private evaluateWatchlistIp(rule: DetectionRule, event: SecurityEvent, baseTrace: PipelineTraceStep[]): RuleEvaluationResult {
    const traceSteps = [...baseTrace];
    const isWatchlisted = db.isIpInWatchlist(event.source_ip);

    traceSteps.push({
      step: 'RULE_ENGINE',
      name: 'Watchlist Evaluation',
      timestamp: new Date().toISOString(),
      status: isWatchlisted ? 'MATCHED' : 'NO_MATCH',
      details: `Checked ${event.source_ip} against configured demo security watchlist: ${isWatchlisted ? 'FOUND' : 'CLEAN'}.`,
      data: {
        rule_id: rule.rule_id,
        source_ip: event.source_ip,
        is_watchlisted: isWatchlisted,
      }
    });

    if (isWatchlisted) {
      const watchlistEntries = db.getWatchlist().filter(w => w.ip === event.source_ip);
      const entry = watchlistEntries[0] || { label: 'Configured Demo Watchlist', category: 'Demo Watchlist IP' };

      const evidence = [
        `Source IP: ${event.source_ip}`,
        `Watchlist Classification: ${entry.category}`,
        `Watchlist Label: ${entry.label}`,
        `Associated Action: ${event.action} (${event.event_type})`,
        `Target Endpoint: ${event.endpoint || 'N/A'}`,
        `Domain: ${event.domain}`,
        `Note: Configured Security Watchlist / Demo Watchlist`
      ];

      return {
        matched: true,
        rule,
        observed_value: `Match on Demo Watchlist: ${entry.label}`,
        evidence,
        description: `Connection received from source IP ${event.source_ip}, which is listed on the Configured Demo Security Watchlist.`,
        why_suspicious: 'IP addresses listed on threat intelligence and security watchlists have prior history of hostile scanning, brute forcing, or unauthorized command & control communications.',
        remediation: 'Flag session for mandatory multi-factor authentication, place in restricted sandbox network zone, and alert SOC analysts for triage.',
        traceSteps
      };
    }

    return {
      matched: false,
      rule,
      observed_value: 'Clean IP (Not in watchlist)',
      evidence: [],
      description: '',
      why_suspicious: '',
      remediation: '',
      traceSteps
    };
  }
}

export const ruleEngine = new RuleEngine();
