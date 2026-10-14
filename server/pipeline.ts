import { SecurityEvent, Detection, Alert, PipelineTraceStep } from './types';
import { RawEventPayload, EventNormalizer } from './normalizer';
import { stateManager } from './state';
import { ruleEngine } from './rules';
import { alertManager } from './alerts';
import { db } from './db';

// SSE client manager
type SSEClient = (data: { event: string; data: any }) => void;
const sseClients: Set<SSEClient> = new Set();

export function registerSSEClient(client: SSEClient) {
  sseClients.add(client);
  return () => sseClients.delete(client);
}

export function broadcastSSE(type: string, data: any) {
  for (const client of sseClients) {
    try {
      client({ event: type, data });
    } catch {
      sseClients.delete(client);
    }
  }
}

export interface IngestionResult {
  event: SecurityEvent;
  detections: Detection[];
  alerts: Alert[];
}

export class SecurityPipeline {
  /**
   * Main entrypoint: Ingests raw domain activity, runs the end-to-end detection pipeline.
   */
  public process(raw: RawEventPayload, clientIp?: string, userActionLabel?: string): IngestionResult {
    const trace: PipelineTraceStep[] = [];
    const timestampStr = new Date().toISOString();

    // 1. User Action
    trace.push({
      step: 'USER_ACTION',
      name: 'User Action Initiated',
      timestamp: timestampStr,
      status: 'COMPLETED',
      details: userActionLabel || `Action '${raw.action || 'REQUEST'}' triggered in domain '${raw.domain}'`,
      data: {
        raw_action: raw.action,
        domain: raw.domain,
        username: raw.username,
        endpoint: raw.endpoint
      }
    });

    // 2. Application Event
    trace.push({
      step: 'APPLICATION_EVENT',
      name: 'Application Event Emitted',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      details: `Generated domain event from ${raw.domain.toUpperCase()} domain subsystem.`,
      data: { ...raw }
    });

    // 3. Event Collector
    trace.push({
      step: 'EVENT_COLLECTOR',
      name: 'Event Collector Ingestion',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      details: `Collector received payload at ingestion gateway. Assigned ingestion worker.`,
    });

    // 4. Normalizer
    const normalizedEvent = EventNormalizer.normalize(raw, clientIp);
    trace.push({
      step: 'NORMALIZER',
      name: 'Event Normalization',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      details: `Normalized heterogeneous payload into standard SecurityEvent ID: ${normalizedEvent.event_id}`,
      data: {
        event_id: normalizedEvent.event_id,
        event_type: normalizedEvent.event_type,
        action: normalizedEvent.action,
        status: normalizedEvent.status,
        protocol: normalizedEvent.protocol,
      }
    });

    // 5. State / History Manager
    stateManager.updateState(normalizedEvent);
    trace.push({
      step: 'STATE_MANAGER',
      name: 'State / History Tracking',
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      details: `Sliding-window state updated for source IP ${normalizedEvent.source_ip}. Expired stale records.`,
      data: {
        source_ip: normalizedEvent.source_ip,
        target_domain: normalizedEvent.domain,
      }
    });

    // 6. Database Storage (Persist Event)
    db.addEvent(normalizedEvent);

    // 7. Rule Engine Evaluation
    const detections = ruleEngine.evaluate(normalizedEvent, trace);
    const alerts: Alert[] = [];

    if (detections.length > 0) {
      for (const detection of detections) {
        // 8. Detection Created
        detection.trace.push({
          step: 'DETECTION',
          name: 'Detection Object Formed',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          details: `Detection created for ${detection.rule_id} (${detection.attack_type}). Severity: ${detection.severity}.`,
          data: {
            detection_id: detection.detection_id,
            observed_value: detection.observed_value,
            threshold: detection.threshold,
          }
        });

        // Save detection
        db.addDetection(detection);

        // 9. Alert Manager Deduplication / Creation
        const { alert, isNewAlert } = alertManager.processDetection(detection);
        alerts.push(alert);

        detection.trace.push({
          step: 'ALERT_MANAGER',
          name: isNewAlert ? 'Alert Created' : 'Alert Deduplicated & Updated',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          details: isNewAlert
            ? `New ${alert.severity} alert ${alert.alert_id} dispatched to analyst queue.`
            : `Incident deduplicated on existing alert ${alert.alert_id}. Occurrence count incremented to ${alert.incident_count}.`,
          data: {
            alert_id: alert.alert_id,
            incident_count: alert.incident_count,
            status: alert.status,
          }
        });

        // 10. Database Persistence & Real-time Channel
        detection.trace.push({
          step: 'DATABASE_AND_REALTIME',
          name: 'Real-Time Notification Broadcast',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          details: `Detection and Alert committed to audit store. Real-time SSE event dispatched to dashboard clients.`,
        });

        // Broadcast detection & alert
        broadcastSSE('DETECTION', detection);
        broadcastSSE('ALERT', alert);
      }
    }

    // Broadcast the new normalized event to live stream
    broadcastSSE('EVENT', normalizedEvent);
    broadcastSSE('METRICS', db.getMetrics());

    return {
      event: normalizedEvent,
      detections,
      alerts
    };
  }
}

export const pipeline = new SecurityPipeline();
