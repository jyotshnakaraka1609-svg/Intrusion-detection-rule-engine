export type SecurityDomain = 'web' | 'ecommerce' | 'banking';

export type EventType = 
  | 'AUTHENTICATION'
  | 'HTTP_REQUEST'
  | 'NETWORK_CONNECTION'
  | 'API_ACCESS';

export type EventAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'REQUEST'
  | 'PORT_CHECK'
  | 'TRANSACTION'
  | 'DATA_QUERY';

export type EventStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';

export interface SecurityEvent {
  event_id: string;
  timestamp: string; // ISO string
  epoch_ms: number;
  source_ip: string;
  destination_ip: string;
  source_port?: number;
  destination_port?: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS';
  event_type: EventType;
  action: EventAction;
  status: EventStatus;
  username?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  user_agent?: string;
  domain: SecurityDomain;
  metadata?: Record<string, any>;
}

export interface DetectionRule {
  rule_id: string;
  name: string;
  description: string;
  attack_type: string;
  severity: SeverityLevel;
  threshold: number;
  time_window: number; // in seconds
  enabled: boolean;
  domain?: SecurityDomain | 'ALL';
}

export interface PipelineTraceStep {
  step: string;
  name: string;
  timestamp: string;
  status: 'COMPLETED' | 'SKIPPED' | 'MATCHED' | 'NO_MATCH';
  details: string;
  data?: Record<string, any>;
}

export interface Detection {
  detection_id: string;
  rule_id: string;
  rule_name: string;
  attack_type: string;
  severity: SeverityLevel;
  source_ip: string;
  destination_ip?: string;
  domain: SecurityDomain;
  detected_at: string;
  observed_value: number | string;
  threshold: number | string;
  time_window: number; // in seconds
  evidence: string[];
  description: string;
  why_suspicious: string;
  remediation: string;
  trace: PipelineTraceStep[];
}

export interface Alert {
  alert_id: string;
  detection_id: string;
  rule_id: string;
  attack_type: string;
  severity: SeverityLevel;
  source_ip: string;
  destination_ip?: string;
  detection_time: string;
  description: string;
  evidence: string[];
  observed_value: number | string;
  threshold: number | string;
  time_window: number;
  status: AlertStatus;
  domain: SecurityDomain;
  incident_count: number;
  last_updated: string;
}

export interface WatchlistEntry {
  ip: string;
  label: string;
  added_at: string;
  category: string;
  notes: string;
}

export interface SystemMetrics {
  total_events: number;
  events_per_minute: number;
  active_alerts: number;
  high_severity_alerts: number;
  total_detections: number;
  enabled_rules_count: number;
  system_status: {
    rule_engine: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    event_collector: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    alert_manager: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
    database: 'CONNECTED' | 'DISCONNECTED';
    real_time_channel: 'CONNECTED' | 'STANDBY';
  };
}

export interface TestResult {
  id: string;
  test_name: string;
  rule_id: string;
  category: 'DETECTION' | 'FALSE_POSITIVE' | 'DEDUPLICATION' | 'CONFIG';
  passed: boolean;
  expected: string;
  observed: string;
  details: string;
  duration_ms: number;
}
