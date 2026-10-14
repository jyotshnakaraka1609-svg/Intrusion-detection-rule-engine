import crypto from 'crypto';
import { Detection, Alert, AlertStatus } from './types';
import { db } from './db';

export class AlertManager {
  // Cooldown window in ms (e.g., 30 seconds for the same rule + source IP + domain)
  private deduplicationCooldownMs = 30000;

  /**
   * Processes a new detection, checking deduplication before creating or updating an alert.
   */
  public processDetection(detection: Detection): { alert: Alert; isNewAlert: boolean } {
    const existingAlerts = db.getAlerts();
    const now = Date.now();

    // Check if an existing open alert matches the same rule_id and source_ip
    const recentMatchingAlert = existingAlerts.find(a => {
      if (a.status === 'RESOLVED') return false;
      if (a.rule_id !== detection.rule_id) return false;
      if (a.source_ip !== detection.source_ip) return false;
      if (a.domain !== detection.domain) return false;

      const alertAge = now - new Date(a.last_updated).getTime();
      return alertAge < this.deduplicationCooldownMs;
    });

    if (recentMatchingAlert) {
      // Deduplicate: Update existing incident with incremented count and refreshed evidence
      const updatedIncidentCount = (recentMatchingAlert.incident_count || 1) + 1;
      const updatedEvidence = Array.from(new Set([...recentMatchingAlert.evidence, ...detection.evidence]));

      const updated = db.updateAlert(recentMatchingAlert.alert_id, {
        incident_count: updatedIncidentCount,
        observed_value: detection.observed_value,
        evidence: updatedEvidence,
        last_updated: new Date().toISOString(),
      });

      return {
        alert: updated || recentMatchingAlert,
        isNewAlert: false
      };
    }

    // Create a new alert
    const alert_id = `ALT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const newAlert: Alert = {
      alert_id,
      detection_id: detection.detection_id,
      rule_id: detection.rule_id,
      attack_type: detection.attack_type,
      severity: detection.severity,
      source_ip: detection.source_ip,
      destination_ip: detection.destination_ip,
      detection_time: detection.detected_at,
      description: detection.description,
      evidence: detection.evidence,
      observed_value: detection.observed_value,
      threshold: detection.threshold,
      time_window: detection.time_window,
      status: 'NEW',
      domain: detection.domain,
      incident_count: 1,
      last_updated: new Date().toISOString()
    };

    db.addAlert(newAlert);
    return {
      alert: newAlert,
      isNewAlert: true
    };
  }

  /**
   * Updates an alert status: NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED
   */
  public updateStatus(alert_id: string, status: AlertStatus): Alert | null {
    return db.updateAlert(alert_id, { status });
  }
}

export const alertManager = new AlertManager();
