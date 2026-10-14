import React, { useState, useEffect } from 'react';
import { SecurityEvent, Detection, PipelineTraceStep } from '../types';
import { api } from '../api';
import { Activity, CheckCircle2, ChevronRight, Terminal, Cpu, Database, RefreshCw, Zap, PlayCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface BackendViewProps {
  currentDetectionForTrace?: Detection | null;
  recentEvents: SecurityEvent[];
  recentDetections: Detection[];
  onSelectDetectionTrace: (detection: Detection) => void;
  onNavigateToDemo: () => void;
}

export const BackendView: React.FC<BackendViewProps> = ({
  currentDetectionForTrace,
  recentEvents,
  recentDetections,
  onSelectDetectionTrace,
  onNavigateToDemo
}) => {
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(
    currentDetectionForTrace || (recentDetections.length > 0 ? recentDetections[0] : null)
  );
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [testingInBackend, setTestingInBackend] = useState<boolean>(false);
  const [testLog, setTestLog] = useState<string | null>(null);

  // Sync if parent updates currentDetectionForTrace
  useEffect(() => {
    if (currentDetectionForTrace) {
      setSelectedDetection(currentDetectionForTrace);
      setSelectedStepIndex(0);
    } else if (!selectedDetection && recentDetections.length > 0) {
      setSelectedDetection(recentDetections[0]);
    }
  }, [currentDetectionForTrace, recentDetections]);

  const traceSteps: PipelineTraceStep[] = selectedDetection?.trace || [];
  const currentStep = traceSteps[selectedStepIndex] || traceSteps[0];

  // Quick test from Backend page directly to demonstrate the 3 failed logins flow
  const handleTriggerThreeFailedLogins = async () => {
    setTestingInBackend(true);
    setTestLog('Simulating 3 sequential failed logins from IP 192.168.1.99...');
    try {
      let finalDetection: Detection | null = null;
      for (let i = 1; i <= 3; i++) {
        const res = await fetch('/api/web/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'admin.target',
            password: `WrongPassAttempt_${i}`,
            clientIp: '192.168.1.99'
          })
        });
        const data = await res.json();
        setTestLog(`Attempt ${i}/3 processed by backend pipeline...`);
        if (data.pipeline?.detections?.length > 0) {
          finalDetection = data.pipeline.detections[0];
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (finalDetection) {
        setSelectedDetection(finalDetection);
        setSelectedStepIndex(5); // Jump to rule evaluation step
        setTestLog('Detection BRUTE-001 created on 3rd attempt! Loaded full 10-stage execution journey.');
      } else {
        setTestLog('Processed 3 attempts. Check recent detections list.');
      }
    } catch (err) {
      setTestLog('Error communicating with backend.');
    } finally {
      setTestingInBackend(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
              Live Pipeline Architecture
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs font-mono text-[#10B981] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              CONNECTED TO DEMO INTERACTIONS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC]">
            Live Backend Event & Execution Journey
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
            Inspect the exact journey of security events as they traverse the 10 stages: Ingestion, Normalization,
            Sliding-Window State, Rule Evaluation, Detection, Alert Deduplication, and Database/SSE Broadcast.
          </p>
        </div>

        {/* Action button to test directly */}
        <div className="flex items-center gap-2">
          <button
            disabled={testingInBackend}
            onClick={handleTriggerThreeFailedLogins}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#38BDF8]/40 text-[#38BDF8] text-xs font-mono rounded cursor-pointer transition-colors"
            title="Sends 3 failed logins to trigger BRUTE-001 and trace its backend journey"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{testingInBackend ? 'Executing...' : 'Test 3 Failed Logins Flow'}</span>
          </button>

          <button
            onClick={onNavigateToDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded shadow-xs cursor-pointer transition-colors"
          >
            <span>Open Demo Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {testLog && (
        <div className="p-3 bg-[#1E293B] border border-[#38BDF8]/30 rounded text-xs font-mono text-[#38BDF8] flex items-center justify-between">
          <span>{testLog}</span>
          <button onClick={() => setTestLog(null)} className="text-[#94A3B8] hover:text-white">✕</button>
        </div>
      )}

      {/* Select Detection to Inspect Bar */}
      <div className="bg-[#111827] border border-[#1E293B] p-3 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#94A3B8]">Inspecting Trace For:</span>
          {recentDetections.length === 0 ? (
            <span className="text-amber-400">No detections recorded yet. Perform actions in Demo to see live traces.</span>
          ) : (
            <select
              value={selectedDetection?.detection_id || ''}
              onChange={(e) => {
                const det = recentDetections.find(d => d.detection_id === e.target.value);
                if (det) {
                  setSelectedDetection(det);
                  setSelectedStepIndex(0);
                }
              }}
              className="bg-[#0B0F19] border border-[#334155] text-[#F8FAFC] px-3 py-1 rounded text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
            >
              {recentDetections.map((d) => (
                <option key={d.detection_id} value={d.detection_id}>
                  {d.detection_id} — {d.rule_id} ({d.domain.toUpperCase()}) — {new Date(d.detected_at).toLocaleTimeString()}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedDetection && (
          <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
            <span>IP: <strong className="text-[#F8FAFC]">{selectedDetection.source_ip}</strong></span>
            <span>·</span>
            <span>Rule: <strong className="text-[#38BDF8]">{selectedDetection.rule_id}</strong></span>
            <span>·</span>
            <span className="text-[#10B981] font-semibold">{traceSteps.length} Pipeline Stages</span>
          </div>
        )}
      </div>

      {/* Main 10-Stage Pipeline Journey Explorer */}
      {selectedDetection ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Stage Sequence Timeline */}
          <div className="lg:col-span-5 border-r border-[#1E293B] bg-[#0B0F19] p-4 space-y-2 max-h-[620px] overflow-y-auto">
            <div className="text-[11px] font-mono uppercase text-[#94A3B8] font-semibold mb-2">
              Sequential Pipeline Stages
            </div>

            {traceSteps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`w-full text-left p-3 rounded border transition-all text-xs flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E293B] border-[#38BDF8] shadow-sm text-white'
                      : 'bg-[#111827]/70 border-[#1E293B] hover:bg-[#1E293B]/50 text-[#94A3B8]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-[#38BDF8]' : 'text-[#10B981]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-[#38BDF8] font-semibold uppercase">
                        Stage {idx + 1}
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-medium text-[#F8FAFC] truncate">
                      {step.name}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">
                      {step.details}
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-1 transition-transform ${isSelected ? 'text-[#38BDF8] translate-x-0.5' : 'text-[#334155]'}`} />
                </button>
              );
            })}
          </div>

          {/* Right Column: Deep Stage Inspection & Data Payload */}
          <div className="lg:col-span-7 bg-[#111827] p-6 space-y-5 max-h-[620px] overflow-y-auto">
            {currentStep && (
              <>
                <div className="border-b border-[#1E293B] pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8]">
                      Stage {selectedStepIndex + 1} of {traceSteps.length} · {currentStep.step}
                    </span>
                    <span className="text-[11px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-0.5 rounded">
                      {currentStep.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif text-[#F8FAFC]">
                    {currentStep.name}
                  </h3>
                  <div className="text-xs font-mono text-[#64748B] mt-1">
                    Executed Monotonically at: {currentStep.timestamp}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
                    Backend Operation Mechanics
                  </h4>
                  <p className="text-sm text-[#F8FAFC] leading-relaxed bg-[#0B0F19] p-3.5 rounded border border-[#1E293B]">
                    {currentStep.details}
                  </p>
                </div>

                {/* Telemetry Payload */}
                {currentStep.data && (
                  <div>
                    <h4 className="text-xs font-mono uppercase text-[#94A3B8] mb-1.5 font-semibold">
                      Recorded State / Telemetry Payload
                    </h4>
                    <pre className="text-xs font-mono bg-[#0B0F19] text-[#38BDF8] p-3.5 rounded border border-[#1E293B] overflow-x-auto">
                      {JSON.stringify(currentStep.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Educational Insight for this Step */}
                <div className="p-3.5 bg-[#1E293B]/40 rounded border border-[#1E293B] text-xs text-[#94A3B8] space-y-1">
                  <div className="font-semibold text-[#F8FAFC]">Architectural Engineering Note:</div>
                  <p>
                    {selectedStepIndex === 0 && 'The user interaction on the frontend dispatches a real HTTP REST call to the domain endpoint. No simulated front-end text tricks are used.'}
                    {selectedStepIndex === 1 && 'The domain subsystem wraps parameters into a domain event, tagging source IP socket data and action verbs.'}
                    {selectedStepIndex === 2 && 'The central Event Collector receives the packet, enforces payload sanity, and pushes it to the ingestion queue.'}
                    {selectedStepIndex === 3 && 'The Normalization engine maps domain-specific keys into the canonical SecurityEvent schema for uniform rule processing.'}
                    {selectedStepIndex === 4 && 'The in-memory State Manager tracks active sliding windows (60s for login attempts, 10s for port scans and rates), pruning stale records.'}
                    {selectedStepIndex === 5 && 'The Rule Engine evaluates active rules against the event and window counter. Threshold crossing triggers a match.'}
                    {selectedStepIndex === 6 && 'A Detection object is generated containing full forensic evidence, observed vs threshold values, and remediation steps.'}
                    {selectedStepIndex === 7 && 'The Alert Manager applies deduplication cooldowns (30s) to aggregate ongoing attacks into single incidents.'}
                    {selectedStepIndex >= 8 && 'The event, detection, and alert are written to the audit store, and a Server-Sent Events (SSE) notification is pushed to all connected clients.'}
                  </p>
                </div>

                {/* Stage Pagination Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={selectedStepIndex === 0}
                    onClick={() => setSelectedStepIndex(s => Math.max(0, s - 1))}
                    className="px-3 py-1.5 text-xs font-medium border border-[#334155] text-[#94A3B8] hover:text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1E293B] cursor-pointer"
                  >
                    ← Previous Stage
                  </button>

                  <button
                    disabled={selectedStepIndex === traceSteps.length - 1}
                    onClick={() => setSelectedStepIndex(s => Math.min(traceSteps.length - 1, s + 1))}
                    className="px-3 py-1.5 text-xs font-medium bg-[#0284C7] text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0369A1] cursor-pointer"
                  >
                    Next Stage →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1E293B] p-12 text-center rounded space-y-3">
          <Terminal className="w-10 h-10 text-[#38BDF8] mx-auto opacity-40" />
          <h3 className="text-base font-serif text-[#F8FAFC]">
            Ready to Trace Real Backend Execution
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            Go to the <strong>Interactive Demo</strong> page and enter incorrect passwords (3 attempts), or test a port scan.
            The backend engine will immediately execute every stage and render the complete live journey right here!
          </p>
          <button
            onClick={onNavigateToDemo}
            className="mt-2 px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Go to Interactive Demo
          </button>
        </div>
      )}

      {/* Live Recent Ingestion Stream on Backend Page */}
      <div className="bg-[#111827] border border-[#1E293B] rounded p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-semibold font-serif text-[#F8FAFC]">
              Recent Events Ingested by Central Pipeline
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            Showing latest {recentEvents.slice(0, 8).length} events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {recentEvents.slice(0, 8).map((evt) => {
            const isAuthFail = evt.event_type === 'AUTHENTICATION' && evt.status === 'FAILED';
            return (
              <div
                key={evt.event_id}
                className={`p-2.5 rounded border ${
                  isAuthFail
                    ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#FCA5A5]'
                    : 'bg-[#0B0F19] border-[#1E293B] text-[#94A3B8]'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#64748B]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  <span className="uppercase text-[#38BDF8] font-bold">{evt.domain}</span>
                </div>
                <div className="font-semibold text-white truncate">
                  {evt.action} {evt.status === 'FAILED' ? '(FAILED)' : ''}
                </div>
                <div className="text-[10px] text-[#64748B] truncate mt-1">
                  {evt.source_ip} → {evt.destination_port ? `Port ${evt.destination_port}` : (evt.endpoint || '/')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
