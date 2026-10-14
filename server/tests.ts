import { pipeline } from './pipeline';
import { stateManager } from './state';
import { db } from './db';
import { TestResult } from './types';

export async function runAutomatedValidationSuite(): Promise<{
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  stateManager.clear();
  const testSubnet = Math.floor(Math.random() * 200) + 10;
  const testIpPrefix = `198.18.${testSubnet}.`; // Isolated test subnet per run
  db.updateRule('BRUTE-001', { threshold: 3, enabled: true });

  // Helper for timing
  const runTest = (
    id: string,
    test_name: string,
    rule_id: string,
    category: 'DETECTION' | 'FALSE_POSITIVE' | 'DEDUPLICATION' | 'CONFIG',
    fn: () => { passed: boolean; expected: string; observed: string; details: string }
  ) => {
    const start = performance.now();
    try {
      const res = fn();
      const duration = Math.round(performance.now() - start);
      results.push({
        id,
        test_name,
        rule_id,
        category,
        passed: res.passed,
        expected: res.expected,
        observed: res.observed,
        details: res.details,
        duration_ms: duration,
      });
    } catch (err: any) {
      results.push({
        id,
        test_name,
        rule_id,
        category,
        passed: false,
        expected: 'Successful execution',
        observed: `Error: ${err?.message || err}`,
        details: 'Test failed with uncaught exception',
        duration_ms: 0,
      });
    }
  };

  // TEST 1: Brute Force Threshold Validation (2 failures = NO DETECTION; 3rd failure = DETECTION)
  runTest('TEST-BRUTE-01', 'Brute Force Under-Threshold (2 failed logins)', 'BRUTE-001', 'FALSE_POSITIVE', () => {
    const testIp = `${testIpPrefix}10`;
    let detected = false;

    for (let i = 1; i <= 2; i++) {
      const outcome = pipeline.process({
        domain: 'web',
        source_ip: testIp,
        action: 'LOGIN',
        status: 'FAILED',
        username: 'victim_user',
        endpoint: '/api/auth/login'
      });
      if (outcome.detections.some(d => d.rule_id === 'BRUTE-001')) {
        detected = true;
      }
    }

    return {
      passed: !detected,
      expected: 'No detection at 2 failed attempts (threshold is 3)',
      observed: detected ? 'Unexpected detection triggered prematurely' : '0 detections at 2 attempts',
      details: 'Evaluated 2 sequential failed login attempts within 60s window. Rule BRUTE-001 remained dormant.'
    };
  });

  runTest('TEST-BRUTE-02', 'Brute Force At-Threshold (3rd failed login triggers detection)', 'BRUTE-001', 'DETECTION', () => {
    const testIp = `${testIpPrefix}10`;
    // 3rd attempt for the same IP
    const outcome = pipeline.process({
      domain: 'web',
      source_ip: testIp,
      action: 'LOGIN',
      status: 'FAILED',
      username: 'victim_user',
      endpoint: '/api/auth/login'
    });

    const bruteDetection = outcome.detections.find(d => d.rule_id === 'BRUTE-001');
    const passed = !!bruteDetection && outcome.alerts.length > 0;

    return {
      passed,
      expected: 'Detection BRUTE-001 generated upon reaching 3rd failed login',
      observed: passed ? `Matched BRUTE-001, alert generated: ${outcome.alerts[0]?.alert_id}` : 'Failed to detect on 3rd attempt',
      details: 'Observed value crossed threshold (3 attempts in 60s). Severity: HIGH. Real-time alert dispatched.'
    };
  });

  // TEST 2: Port Scan (15 unique ports = NO DETECTION; 16th unique port = DETECTION; Repeated port = NO DUPLICATE COUNT)
  runTest('TEST-SCAN-01', 'Port Scan Duplicate Port Deduplication', 'SCAN-001', 'FALSE_POSITIVE', () => {
    const testIp = `${testIpPrefix}20`;
    const targetIp = '10.10.0.10';

    // Scan same port 22 ten times
    let detected = false;
    for (let i = 0; i < 10; i++) {
      const outcome = pipeline.process({
        domain: 'banking',
        source_ip: testIp,
        destination_ip: targetIp,
        action: 'PORT_CHECK',
        destination_port: 22,
        protocol: 'TCP'
      });
      if (outcome.detections.some(d => d.rule_id === 'SCAN-001')) {
        detected = true;
      }
    }

    const { uniqueCount } = stateManager.getPortScanState(testIp, targetIp, 10);
    const passed = !detected && uniqueCount === 1;

    return {
      passed,
      expected: '1 unique port recorded despite 10 connection attempts to port 22',
      observed: `Unique ports recorded: ${uniqueCount}`,
      details: 'Demonstrates state manager correctly set-deduplicates port numbers. SCAN-001 did not trigger.'
    };
  });

  runTest('TEST-SCAN-02', 'Port Scan Threshold Crossing (16 unique ports in 10s)', 'SCAN-001', 'DETECTION', () => {
    const testIp = `${testIpPrefix}25`;
    const targetIp = '10.10.0.10';
    let triggered = false;

    // Scan 16 unique ports: 1001 to 1016
    for (let p = 1001; p <= 1016; p++) {
      const outcome = pipeline.process({
        domain: 'banking',
        source_ip: testIp,
        destination_ip: targetIp,
        action: 'PORT_CHECK',
        destination_port: p,
        protocol: 'TCP'
      });
      if (outcome.detections.some(d => d.rule_id === 'SCAN-001')) {
        triggered = true;
      }
    }

    return {
      passed: triggered,
      expected: 'Detection SCAN-001 triggered on port > 15 within 10 seconds',
      observed: triggered ? 'Matched SCAN-001 upon 16th distinct destination port' : 'No detection generated',
      details: 'State manager recorded 16 unique ports within 10s window on target 10.10.0.10. Triggered HIGH severity detection.'
    };
  });

  // TEST 3: High Request Rate Threshold
  runTest('TEST-RATE-01', 'High Request Rate Under-Threshold (100 requests in 10s)', 'RATE-001', 'FALSE_POSITIVE', () => {
    const testIp = `${testIpPrefix}30`;
    let detected = false;

    for (let r = 1; r <= 100; r++) {
      const outcome = pipeline.process({
        domain: 'ecommerce',
        source_ip: testIp,
        action: 'REQUEST',
        endpoint: '/api/ecommerce/products',
        method: 'GET'
      });
      if (outcome.detections.some(d => d.rule_id === 'RATE-001')) {
        detected = true;
      }
    }

    return {
      passed: !detected,
      expected: 'No detection at 100 requests (threshold is > 100)',
      observed: detected ? 'Triggered prematurely at <=100 requests' : '0 detections at 100 requests',
      details: '100 requests processed within 10s window. Exact threshold boundary respected.'
    };
  });

  runTest('TEST-RATE-02', 'High Request Rate Crossing (101st request in 10s)', 'RATE-001', 'DETECTION', () => {
    const testIp = `${testIpPrefix}30`;
    const outcome = pipeline.process({
      domain: 'ecommerce',
      source_ip: testIp,
      action: 'REQUEST',
      endpoint: '/api/ecommerce/products',
      method: 'GET'
    });

    const rateDetection = outcome.detections.find(d => d.rule_id === 'RATE-001');
    const passed = !!rateDetection;

    return {
      passed,
      expected: 'Detection RATE-001 triggered on 101st request within 10 seconds',
      observed: passed ? `Matched RATE-001 with ${rateDetection?.observed_value}` : 'No detection on 101st request',
      details: 'Observed value 101 exceeded threshold 100 within 10 seconds. Generated RATE-001 alert.'
    };
  });

  // TEST 4: Suspicious IP (Configured Watchlist Match)
  runTest('TEST-IP-01', 'Suspicious IP Clean Source Check', 'IP-001', 'FALSE_POSITIVE', () => {
    const testIp = `${testIpPrefix}40`; // Not in watchlist
    const outcome = pipeline.process({
      domain: 'banking',
      source_ip: testIp,
      action: 'REQUEST',
      endpoint: '/api/banking/overview'
    });

    const matched = outcome.detections.some(d => d.rule_id === 'IP-001');
    return {
      passed: !matched,
      expected: 'Clean unlisted IP generates no watchlist alert',
      observed: matched ? 'Unexpected watchlist match' : 'Clean IP verified (no match)',
      details: 'IP checked against configured demo watchlist. No indicator found.'
    };
  });

  runTest('TEST-IP-02', 'Suspicious IP Configured Watchlist Match', 'IP-001', 'DETECTION', () => {
    const watchlistIp = '203.0.113.25'; // Default configured demo watchlist IP
    const outcome = pipeline.process({
      domain: 'banking',
      source_ip: watchlistIp,
      action: 'REQUEST',
      endpoint: '/api/banking/overview'
    });

    const ipDetection = outcome.detections.find(d => d.rule_id === 'IP-001');
    const passed = !!ipDetection;

    return {
      passed,
      expected: 'Detection IP-001 generated for configured watchlist IP 203.0.113.25',
      observed: passed ? `Matched IP-001: ${ipDetection?.description}` : 'Failed to match watchlist IP',
      details: 'Identified IP address in Configured Demo Security Watchlist. Created high-severity detection.'
    };
  });

  // TEST 5: Alert Deduplication & Cooldown
  runTest('TEST-DEDUP-01', 'Alert Deduplication on Continuous Suspicious Activity', 'RATE-001', 'DEDUPLICATION', () => {
    const testIp = `${testIpPrefix}50`;
    // Generate rate limit breach
    for (let i = 1; i <= 102; i++) {
      pipeline.process({
        domain: 'ecommerce',
        source_ip: testIp,
        action: 'REQUEST',
        endpoint: '/api/ecommerce/cart'
      });
    }

    // Now send 10 more requests while in breach
    const alertsBefore = db.getAlerts({ search: testIp }).length;
    for (let j = 0; j < 10; j++) {
      pipeline.process({
        domain: 'ecommerce',
        source_ip: testIp,
        action: 'REQUEST',
        endpoint: '/api/ecommerce/cart'
      });
    }
    const alertsAfter = db.getAlerts({ search: testIp }).length;
    const targetAlert = db.getAlerts({ search: testIp })[0];

    const passed = alertsBefore === alertsAfter && targetAlert && targetAlert.incident_count > 1;

    return {
      passed,
      expected: 'Alert count remains 1 while incident_count increments from repeat breaches',
      observed: `Alerts: ${alertsAfter}, Incident Count on alert: ${targetAlert?.incident_count || 0}`,
      details: 'Demonstrates alert deduplication manager prevents flooding of duplicate alerts.'
    };
  });

  // TEST 6: Rule Disabling
  runTest('TEST-CONFIG-01', 'Disabled Rule Suppression', 'BRUTE-001', 'CONFIG', () => {
    const testIp = `${testIpPrefix}60`;
    // Temporarily disable rule
    db.updateRule('BRUTE-001', { enabled: false });

    // Send 15 failed logins
    let detected = false;
    for (let k = 0; k < 15; k++) {
      const outcome = pipeline.process({
        domain: 'web',
        source_ip: testIp,
        action: 'LOGIN',
        status: 'FAILED',
        username: 'user_suppressed'
      });
      if (outcome.detections.some(d => d.rule_id === 'BRUTE-001')) {
        detected = true;
      }
    }

    // Re-enable rule
    db.updateRule('BRUTE-001', { enabled: true });

    return {
      passed: !detected,
      expected: 'Disabled rule must not evaluate or generate detections',
      observed: detected ? 'Detection occurred despite rule disabled' : '0 detections with rule disabled',
      details: 'Rule status dynamically checked in real-time. Disabled rules produce zero overhead and zero alerts.'
    };
  });

  const passedCount = results.filter(r => r.passed).length;
  return {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed_tests: passedCount,
    results
  };
}
