import crypto from 'crypto';
import { SecurityEvent, SecurityDomain, EventType, EventAction, EventStatus } from './types';

export interface RawEventPayload {
  domain: SecurityDomain;
  source_ip?: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS';
  event_type?: EventType;
  action?: EventAction;
  status?: EventStatus;
  username?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export class EventNormalizer {
  /**
   * Transforms heterogeneous raw domain payloads into a strictly normalized SecurityEvent.
   */
  public static normalize(raw: RawEventPayload, fallbackIp: string = '192.168.1.45'): SecurityEvent {
    const now = Date.now();
    const event_id = `EVT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Normalize source IP (ensure fallback if missing)
    const source_ip = (raw.source_ip || fallbackIp || '192.168.1.1').trim();
    const destination_ip = raw.destination_ip || (raw.domain === 'banking' && raw.destination_port ? '10.10.0.10' : '10.0.0.1');

    // Default protocol
    let protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' = raw.protocol || 'HTTPS';
    if (raw.action === 'PORT_CHECK') {
      protocol = 'TCP';
    } else if (!raw.protocol) {
      protocol = 'HTTPS';
    }

    // Infer Event Type if not explicitly provided
    let event_type: EventType = raw.event_type || 'HTTP_REQUEST';
    if (raw.action === 'LOGIN' || raw.action === 'LOGOUT') {
      event_type = 'AUTHENTICATION';
    } else if (raw.action === 'PORT_CHECK') {
      event_type = 'NETWORK_CONNECTION';
    } else if (raw.endpoint && raw.endpoint.startsWith('/api/')) {
      event_type = 'API_ACCESS';
    }

    // Infer Action if not provided
    let action: EventAction = raw.action || 'REQUEST';

    // Status normalization
    let status: EventStatus = raw.status || 'SUCCESS';

    return {
      event_id,
      timestamp: raw.timestamp || new Date(now).toISOString(),
      epoch_ms: now,
      source_ip,
      destination_ip,
      source_port: raw.source_port || Math.floor(49152 + Math.random() * 10000),
      destination_port: raw.destination_port,
      protocol,
      event_type,
      action,
      status,
      username: raw.username,
      endpoint: raw.endpoint || (raw.action === 'PORT_CHECK' ? undefined : '/'),
      method: raw.method || (raw.action === 'LOGIN' ? 'POST' : 'GET'),
      user_agent: raw.user_agent || 'Mozilla/5.0 (Sentinel Security Agent; Client/1.0)',
      domain: raw.domain,
      metadata: raw.metadata || {},
    };
  }
}
