import React from 'react';
import { Globe, Building2, ShoppingCart, Landmark, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export const WhereUsedView: React.FC = () => {
  return (
    <div className="space-y-12 pb-16 max-w-5xl">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-5">
        <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
          Domain Applicability & Production Context
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC] mt-0.5">
          Where Sentinel Rule Engine is Used
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
          How reusable rule engines protect multi-application enterprise topologies, and how this controlled prototype
          relates to production SIEM and SOC deployments.
        </p>
      </div>

      {/* Distinction Banner */}
      <div className="p-5 bg-[#111827] border-l-4 border-[#38BDF8] border border-[#1E293B] rounded shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-mono text-xs uppercase font-bold text-white">
            Prototype Architecture vs. Enterprise Production Deployment
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#94A3B8] leading-relaxed pt-1">
          <div className="bg-[#0B0F19] p-3.5 rounded border border-[#1E293B]">
            <strong className="text-white block mb-1">Current Sentinel Prototype:</strong>
            <p>
              A fully functional, educational and demonstrable prototype designed for B.Tech thesis evaluation and mentor demonstration.
              It implements real backend event pipelines, stateful sliding windows, deterministic rule evaluation, and live SSE broadcasts across synthetic applications.
            </p>
          </div>
          <div className="bg-[#0B0F19] p-3.5 rounded border border-[#1E293B]">
            <strong className="text-white block mb-1">Enterprise Production Deployment:</strong>
            <p>
              A production deployment would ingest high-volume telemetry from cloud log routers (AWS CloudWatch, GCP Cloud Logging),
              API gateways (Kong, Envoy), web application firewalls (Cloudflare, AWS WAF), network taps (Zeek, Suricata), and feed into enterprise SIEMs (Splunk, Elastic Security).
            </p>
          </div>
        </div>
      </div>

      {/* Primary Production Domains */}
      <div className="space-y-6">
        <h2 className="text-xl font-serif text-[#F8FAFC]">
          Primary Monitored Domains
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Web Apps & APIs */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Globe className="w-5 h-5 text-[#38BDF8]" />
              <h3 className="font-serif text-base text-white">Web Applications & APIs</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Used in multi-tenant SaaS platforms, enterprise identity portals, customer management systems, and public REST/GraphQL APIs.
            </p>
            <div className="font-mono text-[11px] text-[#94A3B8] pt-2 border-t border-[#1E293B] space-y-1">
              <div>· Detects automated credential stuffing (2–3 attempts)</div>
              <div>· Protects against API resource enumeration</div>
              <div>· Mitigates account takeover (ATO) attacks</div>
            </div>
          </div>

          {/* E-Commerce */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <ShoppingCart className="w-5 h-5 text-[#38BDF8]" />
              <h3 className="font-serif text-base text-white">E-Commerce Platforms</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Used across online retail storefronts, inventory pricing engines, marketplace checkout gateways, and shopping cart services.
            </p>
            <div className="font-mono text-[11px] text-[#94A3B8] pt-2 border-t border-[#1E293B] space-y-1">
              <div>· Stops aggressive price scraping bots</div>
              <div>· Flags inventory hoarding scripts</div>
              <div>· Identifies traffic from suspicious IP proxies</div>
            </div>
          </div>

          {/* Banking & FinTech */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded space-y-3">
            <div className="flex items-center gap-2 text-[#38BDF8]">
              <Landmark className="w-5 h-5 text-[#38BDF8]" />
              <h3 className="font-serif text-base text-white">Banking & FinTech</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Used in core transaction settlement systems, treasury portals, mobile payment backends, and regulatory audit pipelines.
            </p>
            <div className="font-mono text-[11px] text-[#94A3B8] pt-2 border-t border-[#1E293B] space-y-1">
              <div>· Detects unauthorized network service discovery</div>
              <div>· Flags perimeter gateway port probing</div>
              <div>· Correlates login failures with threat watchlists</div>
            </div>
          </div>
        </div>
      </div>

      {/* Future Extensions */}
      <div className="space-y-4 pt-4 border-t border-[#1E293B]">
        <h2 className="text-xl font-serif text-[#F8FAFC]">
          Future Extensions & Enterprise Roadmap
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Threat Feeds</span>
            <p className="text-[#94A3B8]">Integration with STIX/TAXII automated threat intelligence feeds for dynamic IP reputation updates.</p>
          </div>

          <div className="p-3.5 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">SOAR Automation</span>
            <p className="text-[#94A3B8]">Automated webhooks to trigger Cloudflare firewall IP blocks and Slack incident channel notifications.</p>
          </div>

          <div className="p-3.5 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">GeoIP Analytics</span>
            <p className="text-[#94A3B8]">Enriching connection events with MaxMind GeoLite2 country, ASN, and impossible travel detection.</p>
          </div>

          <div className="p-3.5 bg-[#111827] border border-[#1E293B] rounded">
            <span className="text-[#38BDF8] font-bold block mb-1">Enterprise SIEM</span>
            <p className="text-[#94A3B8]">Exporting normalized Syslog/CEF event streams to Splunk, Sentinel, and Elastic Security clusters.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
