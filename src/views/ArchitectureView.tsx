import React, { useState } from 'react';
import { Layers, ArrowDown, Database, Cpu, Activity, Shield, Terminal, Bell } from 'lucide-react';

interface ComponentDetail {
  id: string;
  name: string;
  role: string;
  purpose: string;
  input: string;
  processing: string;
  output: string;
  example: string;
  relationship: string;
}

const ARCHITECTURE_COMPONENTS: ComponentDetail[] = [
  {
    id: 'domain_apps',
    name: '1. Domain Applications (Web, E-Commerce, Banking)',
    role: 'Source Telemetry Producers',
    purpose: 'Execute realistic business logic across customer-facing portals, store checkout services, and financial ledgers.',
    input: 'End-user interactions: HTTP form submissions, catalog queries, API explorer requests, diagnostic port tests.',
    processing: 'Wraps user activity into domain events and delivers them asynchronously or synchronously to the centralized collector gateway.',
    output: 'Raw application events containing domain name, client source IP, action, endpoint, and parameters.',
    example: '{ domain: "banking", action: "PORT_CHECK", destination_ip: "10.10.0.10", destination_port: 22, protocol: "TCP" }',
    relationship: 'Feeds un-normalized activity directly into the Event Collection subsystem.'
  },
  {
    id: 'collection',
    name: '2. Event Collection Layer',
    role: 'Central Ingestion Gateway',
    purpose: 'Acts as the single point of entry for all security telemetry, shielding downstream stages from network latency.',
    input: 'Raw domain event payloads sent over HTTP REST endpoints (/api/events/ingest, domain proxy routes).',
    processing: 'Validates payload structure, extracts client socket IP and headers, stamps monotonic receipt timestamps, and queues worker threads.',
    output: 'Validated ingestion packet passed to the Normalization layer.',
    example: 'Raw payload stamped with ingest_id: "ING-8291" and client_ip: "192.168.1.45".',
    relationship: 'Directly upstream of the Normalization Layer.'
  },
  {
    id: 'normalization',
    name: '3. Normalization Engine',
    role: 'Schema Standardizer',
    purpose: 'Converts heterogeneous application payloads into a strictly typed, application-agnostic SecurityEvent object.',
    input: 'Varied domain payloads with different key names (e.g. "user" vs "account_id", "route" vs "endpoint").',
    processing: 'Applies canonical mapping rules to populate event_id, event_type, action, status, source_ip, destination_ip, protocol, domain, and metadata.',
    output: 'Normalized SecurityEvent instance conforming to the system-wide contract.',
    example: '{ event_id: "EVT-8F92A", event_type: "AUTHENTICATION", action: "LOGIN", status: "FAILED", source_ip: "192.168.1.25" }',
    relationship: 'Receives from Collector; outputs to State Manager and Database.'
  },
  {
    id: 'state_manager',
    name: '4. State & History Manager',
    role: 'Time-Bound Sliding Window Tracker',
    purpose: 'Maintains in-memory sliding windows with strict TTL expiration, allowing the engine to evaluate multi-event patterns over time.',
    input: 'Normalized SecurityEvent instances.',
    processing: 'Appends event timestamps to IP-keyed buckets, removes events older than the active window (e.g., 10s or 60s), and aggregates unique port sets.',
    output: 'Current window counts: active failed login attempts, unique ports scanned, and request frequencies per client IP.',
    example: 'State for 192.168.1.25: { failed_login_timestamps: [1728000010, 1728000015], count: 2, window: 60s }',
    relationship: 'Queried synchronously by the Rule Engine during evaluation.'
  },
  {
    id: 'rule_engine',
    name: '5. Deterministic Rule Engine',
    role: 'Heuristic Evaluator',
    purpose: 'Evaluates active detection rules against the current normalized event and sliding-window state without hallucination.',
    input: 'Current event + time-window state metrics + enabled DetectionRules from the database.',
    processing: 'Tests conditions: BRUTE-001 (failed logins >= 3 in 60s), SCAN-001 (unique ports > 15 in 10s), RATE-001 (requests > 100 in 10s), IP-001 (watchlist lookup).',
    output: 'Instantiated Detection object with observed vs threshold values, forensic evidence list, and 10-stage execution trace.',
    example: 'Rule BRUTE-001 MATCH: observed 3 failed logins vs threshold 3 within 60 seconds.',
    relationship: 'Receives normalized events and state; emits detections to Alert Manager.'
  },
  {
    id: 'alert_manager',
    name: '6. Alert Manager & Deduplication',
    role: 'Incident Lifecycle & Flooding Guard',
    purpose: 'Prevents SOC alert fatigue by deduplicating recurring breach signals into unified incidents within cooldown windows.',
    input: 'Confirmed Detection objects from the Rule Engine.',
    processing: 'Checks existing open alerts for same rule_id and source_ip within cooldown (30s). If found, increments incident count; otherwise creates new Alert.',
    output: 'Canonical Alert entity with status (NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED).',
    example: 'Updated ALT-39FA: incremented incident_count from 1 to 2; avoided redundant alert dispatch.',
    relationship: 'Transmits new and updated alerts to Database and Real-Time Channel.'
  },
  {
    id: 'database',
    name: '7. Database & Audit Store',
    role: 'Single Source of Truth',
    purpose: 'Persistently stores all normalized events, detection rules, forensic detection traces, security alerts, and watchlists.',
    input: 'All pipeline artifacts.',
    processing: 'Performs indexed queries, atomic state synchronization, and audit history preservation.',
    output: 'Queryable event histories, triage states, and metric summaries for dashboards.',
    example: 'Stored in data_store.json with bounded FIFO rotation (up to 2,000 events, 500 detections).',
    relationship: 'Persists pipeline state; queried by REST API layer.'
  },
  {
    id: 'realtime_channel',
    name: '8. Real-Time Streaming Channel (SSE)',
    role: 'Event Pusher',
    purpose: 'Pushes live security events, detections, and alerts to connected browser sessions without requiring manual page refresh.',
    input: 'Pipeline execution notifications.',
    processing: 'Maintains open Server-Sent Events (SSE) connections at /api/stream with heartbeat keep-alives.',
    output: 'Formatted text/event-stream packets (EVENT, DETECTION, ALERT, METRICS).',
    example: 'data: {"event": "DETECTION", "data": { "detection_id": "DET-912A", "rule_id": "BRUTE-001" }}',
    relationship: 'Broadcasts updates from Pipeline directly to Real-Time Dashboard.'
  },
  {
    id: 'backend_inspector',
    name: '9. Live Backend Journey Inspector',
    role: 'Explainable Execution Surface',
    purpose: 'Allows analysts and mentors to trace the exact chronological flow of every security event across all 10 stages.',
    input: 'Live SSE streams + contextual telemetry payloads from Demo page.',
    processing: 'Renders step-by-step audit logs, microsecond execution markers, and parameter assertions.',
    output: 'Explainable evidence verifying that detection happened deterministically on the backend.',
    example: 'Inspecting Stage 5 Rule Engine: observed 3 attempts within 60s, matched BRUTE-001.',
    relationship: 'Provides absolute explainability for all detections.'
  }
];

export const ArchitectureView: React.FC = () => {
  const [selectedCompId, setSelectedCompId] = useState<string>('rule_engine');
  const selectedComp = ARCHITECTURE_COMPONENTS.find(c => c.id === selectedCompId) || ARCHITECTURE_COMPONENTS[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-5">
        <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
          System Blueprints & Pipeline Topology
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC] mt-0.5">
          End-to-End Architectural Pipeline
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
          Sentinel Rule Engine decouples domain applications from security heuristics. Telemetry flows
          through a single pipeline from ingestion to live explainability. Click any component below to inspect its operational contract.
        </p>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Pipeline Stack */}
        <div className="lg:col-span-6 space-y-2">
          <div className="text-[11px] font-mono uppercase text-[#94A3B8] font-semibold mb-2">
            Click Any Stage to Inspect Technical Specification
          </div>

          {ARCHITECTURE_COMPONENTS.map((comp, idx) => {
            const isSelected = selectedCompId === comp.id;

            return (
              <React.Fragment key={comp.id}>
                <button
                  onClick={() => setSelectedCompId(comp.id)}
                  className={`w-full text-left p-3 rounded border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#0284C7]/20 text-white border-[#38BDF8] shadow-sm'
                      : 'bg-[#111827] hover:bg-[#1E293B] text-[#F8FAFC] border-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-[#38BDF8] text-[#0B0F19] font-bold' : 'bg-[#1E293B] text-[#94A3B8]'}`}>
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold">{comp.name}</div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-[#38BDF8]' : 'text-[#94A3B8]'}`}>
                        {comp.role}
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-mono ${isSelected ? 'text-[#38BDF8]' : 'text-[#64748B]'}`}>
                    {isSelected ? 'ACTIVE' : 'SELECT'}
                  </span>
                </button>

                {idx < ARCHITECTURE_COMPONENTS.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-3.5 h-3.5 text-[#38BDF8]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Column: Deep Architectural Component Specification */}
        <div className="lg:col-span-6 bg-[#111827] border border-[#1E293B] rounded shadow-xs p-6 space-y-5 sticky top-20">
          <div className="border-b border-[#1E293B] pb-4">
            <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
              Component Deep Dive
            </span>
            <h3 className="text-xl font-serif text-[#F8FAFC] mt-1">
              {selectedComp.name}
            </h3>
            <div className="text-xs font-mono text-[#94A3B8] mt-0.5">
              Role: <strong className="text-[#38BDF8]">{selectedComp.role}</strong>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <h4 className="text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
              Purpose & Responsibilities
            </h4>
            <p className="text-xs text-[#F8FAFC] leading-relaxed bg-[#0B0F19] p-3.5 rounded border border-[#1E293B]">
              {selectedComp.purpose}
            </p>
          </div>

          {/* Input & Output Contracts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B] space-y-1">
              <span className="text-[10px] font-mono text-[#38BDF8] uppercase font-bold block">
                Incoming Input
              </span>
              <p className="text-[11px] text-[#94A3B8] leading-snug">
                {selectedComp.input}
              </p>
            </div>

            <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B] space-y-1">
              <span className="text-[10px] font-mono text-[#38BDF8] uppercase font-bold block">
                Produced Output
              </span>
              <p className="text-[11px] text-[#94A3B8] leading-snug">
                {selectedComp.output}
              </p>
            </div>
          </div>

          {/* Processing Logic */}
          <div>
            <h4 className="text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
              Internal Processing Mechanics
            </h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#111827] p-3 rounded border border-[#1E293B]">
              {selectedComp.processing}
            </p>
          </div>

          {/* Payload Example */}
          <div>
            <h4 className="text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
              Payload / Data Signature Example
            </h4>
            <pre className="p-3 bg-[#0B0F19] text-[#38BDF8] text-[11px] font-mono rounded overflow-x-auto border border-[#1E293B]">
              {selectedComp.example}
            </pre>
          </div>

          {/* Relationship */}
          <div className="text-[11px] font-mono text-[#94A3B8] pt-2 border-t border-[#1E293B]">
            <strong>Inter-Component Coupling:</strong> {selectedComp.relationship}
          </div>
        </div>
      </div>
    </div>
  );
};
