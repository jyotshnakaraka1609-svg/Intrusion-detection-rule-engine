import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavView } from './components/Navbar';
import { DetectionNotificationModal } from './components/DetectionNotificationModal';
import { TestRunnerModal } from './components/TestRunnerModal';

import { HomeView } from './views/HomeView';
import { DemoView } from './views/DemoView';
import { BackendView } from './views/BackendView';
import { RulesView } from './views/RulesView';
import { ArchitectureView } from './views/ArchitectureView';
import { WhereUsedView } from './views/WhereUsedView';
import { AboutView } from './views/AboutView';

import { api } from './api';
import {
  SystemMetrics,
  Detection,
  SecurityEvent,
  DetectionRule,
  Alert
} from './types';

const INITIAL_METRICS: SystemMetrics = {
  total_events: 0,
  events_per_minute: 0,
  active_alerts: 0,
  high_severity_alerts: 0,
  total_detections: 0,
  enabled_rules_count: 4,
  system_status: {
    rule_engine: 'ONLINE',
    event_collector: 'ONLINE',
    alert_manager: 'ONLINE',
    database: 'CONNECTED',
    real_time_channel: 'CONNECTED'
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [isStreamConnected, setIsStreamConnected] = useState(false);

  // Core Data State
  const [metrics, setMetrics] = useState<SystemMetrics>(INITIAL_METRICS);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Selected Detection for the Backend Journey View
  const [currentDetectionForTrace, setCurrentDetectionForTrace] = useState<Detection | null>(null);

  // Modals
  const [activeDetectionForNotification, setActiveDetectionForNotification] = useState<Detection | null>(null);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);

  // Load baseline summary from backend
  const loadSummary = useCallback(async () => {
    try {
      const summary = await api.getDashboardSummary();
      setMetrics(summary.metrics);
      setDetections(summary.recentDetections);
      setRecentEvents(summary.recentEvents);
      setRules(summary.rules);
      setAlerts(summary.recentAlerts);
      if (summary.recentDetections.length > 0 && !currentDetectionForTrace) {
        setCurrentDetectionForTrace(summary.recentDetections[0]);
      }
    } catch (err) {
      console.error('Failed to load summary', err);
    }
  }, [currentDetectionForTrace]);

  const loadRules = useCallback(async () => {
    try {
      const res = await api.getRules();
      setRules(res.rules);
    } catch (err) {
      console.error('Failed to load rules', err);
    }
  }, []);

  useEffect(() => {
    loadSummary();

    // Subscribe to real-time SSE stream
    const unsubscribe = api.subscribeToStream((msg) => {
      setIsStreamConnected(true);

      if (msg.event === 'CONNECTED') {
        setIsStreamConnected(true);
      } else if (msg.event === 'EVENT') {
        setRecentEvents((prev) => [msg.data, ...prev.slice(0, 49)]);
      } else if (msg.event === 'METRICS') {
        setMetrics((prev) => ({ ...prev, ...msg.data }));
      } else if (msg.event === 'DETECTION') {
        const detection: Detection = msg.data;
        setDetections((prev) => [detection, ...prev.slice(0, 49)]);
        setCurrentDetectionForTrace(detection);
        // Trigger notification modal
        setActiveDetectionForNotification(detection);
      } else if (msg.event === 'ALERT') {
        const alert: Alert = msg.data;
        setAlerts((prev) => {
          const idx = prev.findIndex((a) => a.alert_id === alert.alert_id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = alert;
            return copy;
          }
          return [alert, ...prev];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadSummary]);

  // Reset System Handler
  const handleResetDemo = async () => {
    if (confirm('Reset Sentinel Rule Engine to initial demo baseline?')) {
      await api.resetSystem();
      await loadSummary();
    }
  };

  // Navigate to Backend Journey with a specific detection trace
  const handleNavigateToBackendWithTrace = (detection?: Detection) => {
    if (detection) {
      setCurrentDetectionForTrace(detection);
    }
    setCurrentView('backend');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#0284C7]/30">
      {/* 3-Zone Top Navigation Bar (Dashboard & Alerts removed) */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
        onResetDemo={handleResetDemo}
        isStreamConnected={isStreamConnected}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === 'home' && (
          <HomeView
            onNavigate={setCurrentView}
            onOpenTestRunner={() => setIsTestRunnerOpen(true)}
          />
        )}

        {currentView === 'demo' && (
          <DemoView
            onDetectionTriggered={(d) => {
              setActiveDetectionForNotification(d);
              setCurrentDetectionForTrace(d);
              setDetections((prev) => [d, ...prev.slice(0, 49)]);
            }}
            onViewTrace={handleNavigateToBackendWithTrace}
            onNavigateToBackend={handleNavigateToBackendWithTrace}
          />
        )}

        {currentView === 'backend' && (
          <BackendView
            currentDetectionForTrace={currentDetectionForTrace}
            recentEvents={recentEvents}
            recentDetections={detections}
            onSelectDetectionTrace={(d) => setCurrentDetectionForTrace(d)}
            onNavigateToDemo={() => setCurrentView('demo')}
          />
        )}

        {currentView === 'rules' && (
          <RulesView
            rules={rules}
            onRulesUpdated={loadRules}
          />
        )}

        {currentView === 'architecture' && <ArchitectureView />}

        {currentView === 'where_used' && <WhereUsedView />}

        {currentView === 'about' && <AboutView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#0B0F19] py-6 px-4 text-center text-xs text-[#64748B] font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sentinel Rule Engine · Real-Time Intrusion Detection & Security Monitoring Platform</span>
          <div className="flex items-center gap-3">
            <span>RFC 5737 Test IP Targets</span>
            <span>·</span>
            <span>Synthetic Demonstration Data</span>
            <span>·</span>
            <span>Deterministic Heuristics</span>
          </div>
        </div>
      </footer>

      {/* Detection Notification Modal */}
      <DetectionNotificationModal
        detection={activeDetectionForNotification}
        onClose={() => setActiveDetectionForNotification(null)}
        onViewBackground={(d) => {
          setActiveDetectionForNotification(null);
          handleNavigateToBackendWithTrace(d);
        }}
      />

      {/* Test Runner Modal */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />
    </div>
  );
}
