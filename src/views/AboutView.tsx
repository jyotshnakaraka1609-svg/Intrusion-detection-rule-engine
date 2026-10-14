import React from 'react';
import { Shield, Info, CheckCircle2, AlertTriangle, Layers, Code, Award } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-12 pb-16 max-w-5xl">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-5">
        <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
          Project Documentation & Academic Overview
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC] mt-0.5">
          About Sentinel Rule Engine
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
          Comprehensive project brief for B.Tech cybersecurity demonstration, thesis evaluation, and architectural review.
        </p>
      </div>

      {/* Honest Limitation Statement */}
      <div className="p-5 bg-[#111827] border-2 border-[#38BDF8]/40 rounded space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-mono text-xs uppercase font-bold text-white">
            Formal Project Limitation Statement
          </span>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed italic">
          "This project is a functional educational/prototype rule-based intrusion detection platform. It demonstrates the core event-processing and detection concepts used in security monitoring systems, but it is not intended to replace enterprise IDS/IPS/SIEM infrastructure."
        </p>
      </div>

      {/* Project Objective & Problem Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E293B] p-6 rounded space-y-3">
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            Project Objective
          </span>
          <h2 className="text-lg font-serif text-white">
            Unified, Stateful, Explainable Security
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The core goal of Sentinel is to prove that different application domains (Web APIs, E-Commerce, and FinTech)
            can be monitored effectively through <strong>one reusable security pipeline</strong> rather than fragmented, domain-coupled filters.
            Every detection is deterministic and accompanied by an explicit forensic evidence chain.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] p-6 rounded space-y-3">
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            Problem Statement
          </span>
          <h2 className="text-lg font-serif text-white">
            The Fragmented Monitoring Dilemma
          </h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Organizations frequently deploy separate point solutions for web authentication, API rate limits, and network monitoring.
            This creates data silos, inconsistent alert schemas, and alarm fatigue for SOC analysts. Sentinel bridges this gap by enforcing
            a universal event schema and centralized state management.
          </p>
        </div>
      </div>

      {/* Technologies & Implementation Details */}
      <div className="bg-[#111827] border border-[#1E293B] p-6 rounded space-y-4">
        <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
          Technology Stack
        </span>
        <h2 className="text-xl font-serif text-white">
          Full-Stack Engineering Specifications
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] uppercase">Backend Core</div>
            <div className="font-bold text-white mt-1">Node.js + Express</div>
            <div className="text-[10px] text-[#94A3B8] mt-1">TypeScript / tsx</div>
          </div>

          <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] uppercase">Frontend UI</div>
            <div className="font-bold text-white mt-1">React 19 + Vite</div>
            <div className="text-[10px] text-[#94A3B8] mt-1">Tailwind CSS v4</div>
          </div>

          <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] uppercase">Real-Time Channel</div>
            <div className="font-bold text-white mt-1">Server-Sent Events</div>
            <div className="text-[10px] text-[#94A3B8] mt-1">Native HTTP/1.1 SSE</div>
          </div>

          <div className="p-3 bg-[#0B0F19] rounded border border-[#1E293B]">
            <div className="text-[10px] text-[#64748B] uppercase">Typography</div>
            <div className="font-bold text-white mt-1">DM Serif + Inter</div>
            <div className="text-[10px] text-[#94A3B8] mt-1">JetBrains Mono figures</div>
          </div>
        </div>
      </div>

      {/* Mentor Demonstration Guide */}
      <div className="bg-[#0B0F19] border border-[#1E293B] text-white p-6 rounded space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#38BDF8]" />
          <h2 className="text-lg font-serif text-white">
            Recommended Mentor Demonstration Journey
          </h2>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Follow this structured sequence during project review or live mentor evaluation:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 1: BRUTE-001 (2-3 Fails)</span>
            <p className="text-[#94A3B8] text-[11px]">Go to Demo &gt; Web App, submit wrong passwords 2-3 times to observe warnings and trigger detection.</p>
          </div>

          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 2: Live Backend Journey</span>
            <p className="text-[#94A3B8] text-[11px]">Click "View Live Backend Pipeline Journey" to inspect the 10 stages executing in real-time.</p>
          </div>

          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 3: SCAN-001 Diagnostic</span>
            <p className="text-[#94A3B8] text-[11px]">Go to Demo &gt; Banking &gt; Network Diagnostics, run 16-port check on 10.10.0.10.</p>
          </div>

          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 4: Watchlist IP</span>
            <p className="text-[#94A3B8] text-[11px]">Select client IP 203.0.113.25 to trigger configured watchlist rule IP-001.</p>
          </div>

          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 5: Dynamic Rules</span>
            <p className="text-[#94A3B8] text-[11px]">Open Rules view, modify thresholds or toggle rules, showing immediate backend database synchronization.</p>
          </div>

          <div className="p-3 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Step 6: Automated Suite</span>
            <p className="text-[#94A3B8] text-[11px]">Click "Validate Rules" in top bar to execute all automated backend tests live!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
