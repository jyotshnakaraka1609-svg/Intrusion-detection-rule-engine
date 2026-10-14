import React from 'react';
import { NavView } from '../components/Navbar';
import { Shield, ArrowRight, Activity, Cpu, Database, Eye, Terminal, Layers, CheckCircle2 } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: NavView) => void;
  onOpenTestRunner: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenTestRunner }) => {
  return (
    <div className="space-y-14 pb-16">
      {/* 1. Hero Section */}
      <section className="pt-8 sm:pt-14 pb-8 border-b border-[#1E293B]">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111827] border border-[#1E293B] text-[#38BDF8] text-xs font-mono mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Real-Time Rule-Based Intrusion Detection Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-[#F8FAFC] tracking-tight leading-[1.1] mb-5 text-balance">
            Sentinel Rule Engine
          </h1>

          <p className="text-base sm:text-lg text-[#94A3B8] font-normal leading-relaxed max-w-2xl mb-8">
            A reusable, stateful, explainable intrusion detection engine that monitors heterogeneous
            application domains through a unified security-event pipeline.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('demo')}
              className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Interactive Demos</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#38BDF8]" />
            </button>

            <button
              onClick={() => onNavigate('architecture')}
              className="px-4 py-2.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] font-medium transition-colors cursor-pointer"
            >
              Examine Architecture →
            </button>
          </div>
        </div>
      </section>

      {/* 2. Problem Statement */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8]">
            The Security Challenge
          </span>
          <h2 className="text-2xl font-serif text-[#F8FAFC] mt-1">
            Why Modern Applications Need Continuous Monitoring
          </h2>
        </div>
        <div className="md:col-span-8 space-y-4 text-sm text-[#94A3B8] leading-relaxed">
          <p>
            Applications do not exist in isolation. Modern enterprise stacks involve customer-facing
            web applications, e-commerce storefronts, and sensitive financial ledger services. Building
            isolated, ad-hoc security filters for every application leads to fragmented visibility,
            inconsistent alert policies, and high maintenance costs.
          </p>
          <p>
            <strong className="text-[#F8FAFC]">Sentinel Rule Engine</strong> introduces a single, unified security pipeline:
            heterogeneous applications emit raw activity telemetry, which is normalized into a standard
            security event schema, tracked across sliding time windows in memory, evaluated against deterministic
            detection rules, and dispatched to the live backend inspector.
          </p>
        </div>
      </section>

      {/* 3. How It Works: Pipeline Flow */}
      <section className="bg-[#111827] border border-[#1E293B] p-6 sm:p-8 rounded shadow-xs">
        <div className="mb-6">
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            End-To-End Ingestion Flow
          </span>
          <h2 className="text-2xl font-serif text-[#F8FAFC] mt-0.5">
            How The Security Pipeline Operates
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono text-xs">
          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 1</div>
            <div className="font-semibold text-white mt-1">Event Ingest</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Raw telemetry from Web, Store, Banking</div>
          </div>

          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 2</div>
            <div className="font-semibold text-white mt-1">Normalizer</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Standard SecurityEvent format</div>
          </div>

          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 3</div>
            <div className="font-semibold text-white mt-1">State Manager</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Sliding-window TTL history</div>
          </div>

          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 4</div>
            <div className="font-semibold text-white mt-1">Rule Engine</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Evaluates active rules & thresholds</div>
          </div>

          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 5</div>
            <div className="font-semibold text-white mt-1">Detection</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Detailed forensic object formed</div>
          </div>

          <div className="bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 6</div>
            <div className="font-semibold text-white mt-1">Alert Manager</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Incident deduplication & cooldown</div>
          </div>

          <div className="bg-[#0284C7]/20 border border-[#38BDF8]/40 text-white p-3 rounded">
            <div className="text-[10px] text-[#38BDF8] uppercase font-bold">Stage 7</div>
            <div className="font-semibold text-white mt-1">Live Backend</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Real-time SSE broadcast & trace</div>
          </div>
        </div>
      </section>

      {/* 4. Supported Domains */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            Multi-Domain Coverage
          </span>
          <h2 className="text-2xl font-serif text-[#F8FAFC] mt-0.5">
            Three Monitored Application Environments
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-xl">
            Each domain runs distinct business logic and generates domain-specific activities, but feeds into the same detection engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Web Applications */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-4 hover:border-[#38BDF8] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[#38BDF8] uppercase font-semibold">
                Domain 1
              </span>
              <h3 className="text-lg font-serif text-[#F8FAFC]">
                Web Applications
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Monitors SaaS authentication portals and user profile services. Detects credential brute forcing (2–3 failed logins) and unauthorized account access.
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#94A3B8] space-y-1">
                <div>· Primary Rule: <strong className="text-white">BRUTE-001</strong> (3 failed attempts)</div>
                <div>· Watchlist Rule: <strong className="text-white">IP-001</strong> (Watchlist Indicator Match)</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('demo')}
              className="w-full mt-4 py-2 text-xs font-medium bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] rounded transition-colors cursor-pointer"
            >
              Open Web Application Demo
            </button>
          </div>

          {/* Card 2: E-Commerce Store */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-4 hover:border-[#38BDF8] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[#38BDF8] uppercase font-semibold">
                Domain 2
              </span>
              <h3 className="text-lg font-serif text-[#F8FAFC]">
                E-Commerce ("Northwind Supply")
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Monitors online catalog browsing, cart operations, live inventory search, and checkout endpoints. Detects web scraping bots and watchlist IPs.
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#94A3B8] space-y-1">
                <div>· Primary Rule: <strong className="text-white">RATE-001</strong> (Scraping / Rate Limit)</div>
                <div>· Secondary Rule: <strong className="text-white">IP-001</strong> (Watchlist Indicator Match)</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('demo')}
              className="w-full mt-4 py-2 text-xs font-medium bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] rounded transition-colors cursor-pointer"
            >
              Open E-Commerce Demo
            </button>
          </div>

          {/* Card 3: Banking & FinTech */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-4 hover:border-[#38BDF8] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-[#38BDF8] uppercase font-semibold">
                Domain 3
              </span>
              <h3 className="text-lg font-serif text-[#F8FAFC]">
                Banking & FinTech ("Aegis Trust")
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Monitors synthetic account ledgers, transaction activity, and controlled network diagnostic probes. Detects port scans on controlled target 10.10.0.10.
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#94A3B8] space-y-1">
                <div>· Primary Rule: <strong className="text-white">SCAN-001</strong> (Port Scan on 10.10.0.10)</div>
                <div>· Secondary Rule: <strong className="text-white">IP-001</strong> (Watchlist Match)</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('demo')}
              className="w-full mt-4 py-2 text-xs font-medium bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] rounded transition-colors cursor-pointer"
            >
              Open Banking Demo
            </button>
          </div>
        </div>
      </section>

      {/* 5. Core Capabilities */}
      <section className="border-t border-[#1E293B] pt-12">
        <div className="mb-8">
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            System Capabilities
          </span>
          <h2 className="text-2xl font-serif text-[#F8FAFC] mt-0.5">
            Key Architectural Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center font-mono font-bold text-xs">
              01
            </div>
            <h4 className="text-base font-semibold text-white">Stateful Sliding Windows</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Maintains time-bound memory states (10s–60s) with active TTL pruning so that old traffic correctly expires from detection state.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center font-mono font-bold text-xs">
              02
            </div>
            <h4 className="text-base font-semibold text-white">Explainable Detection</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Every detection records the exact 10-stage execution journey, observed thresholds, timeline bounds, and forensic evidence logs.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center font-mono font-bold text-xs">
              03
            </div>
            <h4 className="text-base font-semibold text-white">Intelligent Deduplication</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Prevents alert flooding by collapsing continuous violations from the same IP into a single incident with an active counter.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center font-mono font-bold text-xs">
              04
            </div>
            <h4 className="text-base font-semibold text-white">Real-Time Streaming</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Uses Server-Sent Events (SSE) to deliver zero-polling live updates to the backend inspector as events occur.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
