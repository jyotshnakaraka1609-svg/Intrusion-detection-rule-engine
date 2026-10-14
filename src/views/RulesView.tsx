import React, { useState } from 'react';
import { DetectionRule, SecurityDomain } from '../types';
import { api } from '../api';
import { Sliders, CheckCircle2, XCircle, Shield, Edit3, Save, RefreshCw, Lock, ShoppingBag, Landmark, AlertTriangle, ArrowRight, Eye } from 'lucide-react';

interface RulesViewProps {
  rules: DetectionRule[];
  onRulesUpdated: () => void;
}

interface DomainRuleExplanation {
  domainId: 'all' | 'web' | 'ecommerce' | 'banking';
  domainName: string;
  icon: any;
  threatSummary: string;
  rulesApplied: {
    ruleId: string;
    ruleName: string;
    severity: string;
    thresholdDisplay: string;
    timeWindowDisplay: string;
    scenario: string;
    whySuspicious: string;
    demoAction: string;
    remediation: string;
  }[];
}

const DOMAIN_EXPLANATIONS: DomainRuleExplanation[] = [
  {
    domainId: 'web',
    domainName: 'Web Applications',
    icon: Lock,
    threatSummary: 'Protects user authentication gateways and identity portals from credential guessing and automated stuffing.',
    rulesApplied: [
      {
        ruleId: 'BRUTE-001',
        ruleName: 'Brute Force Login Detection',
        severity: 'HIGH',
        thresholdDisplay: '3 Failed Login Attempts',
        timeWindowDisplay: '60 Seconds Sliding Window',
        scenario: 'Credential Stuffing & Dictionary Attack against customer/admin login endpoints.',
        whySuspicious: 'Multiple failed authentication attempts from a single source IP in rapid succession indicate an automated tool attempting to guess passwords or reuse leaked credential dumps.',
        demoAction: 'In Web Applications demo, submit incorrect passwords. Attempt 1 is logged, Attempt 2 triggers a warning, and Attempt 3 immediately triggers BRUTE-001.',
        remediation: 'Enforce progressive exponential delays, require CAPTCHA verification after 2 failures, trigger temporary IP cooldown, and enforce mandatory Multi-Factor Authentication (MFA).'
      },
      {
        ruleId: 'IP-001',
        ruleName: 'Suspicious IP Watchlist Detection',
        severity: 'HIGH',
        thresholdDisplay: '1 Match (Immediate)',
        timeWindowDisplay: 'Real-Time Lookup',
        scenario: 'Connection from known hostile proxy or credential-harvester listed on threat intelligence feeds.',
        whySuspicious: 'Addresses on the demo watchlist (e.g., 203.0.113.25, 198.51.100.10) have prior associations with botnets, proxy exit nodes, or hostile scanning.',
        demoAction: 'Select client IP 203.0.113.25 from the Client IP selector in the Web demo. Any request immediately triggers IP-001.',
        remediation: 'Challenge session with device fingerprint verification, restrict access to sensitive administrative zones, and alert SOC analysts.'
      }
    ]
  },
  {
    domainId: 'ecommerce',
    domainName: 'E-Commerce Store ("Northwind Supply Co.")',
    icon: ShoppingBag,
    threatSummary: 'Shields product catalogs, live inventory searches, and checkout funnels from aggressive web scraping and automated inventory hoarding bots.',
    rulesApplied: [
      {
        ruleId: 'RATE-001',
        ruleName: 'High Request Rate & Scraping Detection',
        severity: 'HIGH',
        thresholdDisplay: '> 100 HTTP / API Requests',
        timeWindowDisplay: '10 Seconds Sliding Window',
        scenario: 'Competitor Price Scraping, Inventory Hoarding, and Layer 7 Denial of Service (DoS).',
        whySuspicious: 'Request rates exceeding 10 requests per second from a single client surpass human browsing physical limits, indicating automated scripts or bots exhausting store capacity.',
        demoAction: 'In the E-Commerce demo, click "Rapid Browse (+25 Requests)" multiple times. When request volume exceeds 100 within 10s, RATE-001 triggers.',
        remediation: 'Engage Web Application Firewall (WAF) rate limits using token-bucket algorithms, issue JavaScript challenges, and throttle aggressive IPs at edge proxies.'
      },
      {
        ruleId: 'IP-001',
        ruleName: 'Suspicious IP Watchlist Detection',
        severity: 'HIGH',
        thresholdDisplay: '1 Match (Immediate)',
        timeWindowDisplay: 'Real-Time Lookup',
        scenario: 'Flagged commercial botnet or anonymous scraping proxy attempting store scraping.',
        whySuspicious: 'Traffic from configured watchlist IPs is often masked using commercial proxy rotators to bypass standard bot detection filters.',
        demoAction: 'Select client IP 198.51.100.10 and browse any catalog item to observe immediate watchlist match.',
        remediation: 'Block anonymizing proxy networks from checkout endpoints and require verified customer accounts.'
      }
    ]
  },
  {
    domainId: 'banking',
    domainName: 'Banking & FinTech ("Aegis Trust & Capital")',
    icon: Landmark,
    threatSummary: 'Monitors perimeter banking gateways and synthetic ledger endpoints for unauthorized network reconnaissance and port scanning.',
    rulesApplied: [
      {
        ruleId: 'SCAN-001',
        ruleName: 'Network Diagnostics Port Scan Detection',
        severity: 'HIGH',
        thresholdDisplay: '> 15 Unique Destination Ports',
        timeWindowDisplay: '10 Seconds Sliding Window',
        scenario: 'Perimeter Network Reconnaissance & Service Discovery probing controlled target 10.10.0.10.',
        whySuspicious: 'A source attempting connection attempts across numerous distinct TCP ports (FTP 21, SSH 22, Telnet 23, SMTP 25, DNS 53, HTTP 80, MSSQL 1433, MySQL 3306, etc.) is mapping network attack surfaces to discover unpatched listening daemons.',
        demoAction: 'In Banking demo > Network Diagnostics, click "Run 16-Port Diagnostic". The system tests 16 safe ports on 10.10.0.10 within 10s, triggering SCAN-001.',
        remediation: 'Drop scanning source IP at edge firewall, disable unused ports, and ensure internal database ports are restricted behind VPNs.'
      },
      {
        ruleId: 'BRUTE-001',
        ruleName: 'Brute Force Authentication Detection',
        severity: 'HIGH',
        thresholdDisplay: '3 Failed Login Attempts',
        timeWindowDisplay: '60 Seconds Sliding Window',
        scenario: 'Unauthorized attempts to break into commercial treasury accounts.',
        whySuspicious: 'Repeated authentication failures on financial portals are high-severity indicators of targeted account takeover.',
        demoAction: 'Failed logins against banking credentials increment the same shared sliding-window counter in the central rule engine.',
        remediation: 'Freeze account temporarily, send SMS/email security alert to customer, and require out-of-band identity verification.'
      },
      {
        ruleId: 'IP-001',
        ruleName: 'Suspicious IP Watchlist Detection',
        severity: 'HIGH',
        thresholdDisplay: '1 Match (Immediate)',
        timeWindowDisplay: 'Real-Time Lookup',
        scenario: 'Transaction or diagnostic activity originating from a flagged IP.',
        whySuspicious: 'Financial transactions or network probes originating from flagged IP addresses carry severe fraud and compliance risks.',
        demoAction: 'Perform any banking interaction using simulated IP 203.0.113.25 to trigger IP-001 detection.',
        remediation: 'Immediately suspend high-value wire transfers and route the session to fraud compliance analysts.'
      }
    ]
  }
];

export const RulesView: React.FC<RulesViewProps> = ({ rules, onRulesUpdated }) => {
  const [selectedDomainTab, setSelectedDomainTab] = useState<'all' | 'web' | 'ecommerce' | 'banking'>('all');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState<number>(0);
  const [editWindow, setEditWindow] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const startEdit = (rule: DetectionRule) => {
    setEditingRuleId(rule.rule_id);
    setEditThreshold(rule.threshold);
    setEditWindow(rule.time_window);
    setStatusMsg(null);
  };

  const handleSave = async (ruleId: string) => {
    try {
      setSaving(true);
      await api.updateRule(ruleId, {
        threshold: editThreshold,
        time_window: editWindow,
      });
      setEditingRuleId(null);
      setStatusMsg(`Rule ${ruleId} updated successfully on backend.`);
      onRulesUpdated();
    } catch (err) {
      setStatusMsg('Failed to update rule on backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnable = async (rule: DetectionRule) => {
    try {
      await api.updateRule(rule.rule_id, {
        enabled: !rule.enabled
      });
      setStatusMsg(`Rule ${rule.rule_id} is now ${!rule.enabled ? 'ENABLED' : 'DISABLED'}.`);
      onRulesUpdated();
    } catch (err) {
      setStatusMsg('Failed to toggle rule.');
    }
  };

  const filteredExplanations = DOMAIN_EXPLANATIONS.filter(d => 
    selectedDomainTab === 'all' || d.domainId === selectedDomainTab
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            Detection Policy Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC] mt-0.5">
            Detection Rules & Domain Explanations
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
            Sentinel's four deterministic detection rules protect multiple application domains through a single engine.
            Below is the full breakdown of how each rule monitors Web Applications, E-Commerce, and Banking demos.
          </p>
        </div>

        <div className="text-xs font-mono text-[#94A3B8]">
          Active Rules: <strong className="text-[#10B981]">{rules.filter(r => r.enabled).length} / {rules.length}</strong>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-[#111827] border border-[#38BDF8]/40 rounded text-xs font-mono text-[#38BDF8]">
          {statusMsg}
        </div>
      )}

      {/* Domain Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E293B]">
        <button
          onClick={() => setSelectedDomainTab('all')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            selectedDomainTab === 'all'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          All Domains (4 Rules)
        </button>

        <button
          onClick={() => setSelectedDomainTab('web')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            selectedDomainTab === 'web'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Web Applications</span>
        </button>

        <button
          onClick={() => setSelectedDomainTab('ecommerce')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            selectedDomainTab === 'ecommerce'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>E-Commerce Store</span>
        </button>

        <button
          onClick={() => setSelectedDomainTab('banking')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            selectedDomainTab === 'banking'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Banking & FinTech</span>
        </button>
      </div>

      {/* 1. Core Rules Table with Threshold Configuration */}
      <div className="bg-[#111827] border border-[#1E293B] rounded shadow-xs overflow-hidden space-y-2">
        <div className="px-5 py-3.5 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase text-white">
            Configured Backend Rules Registry
          </span>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            Click 'Configure' to modify threshold or toggle status
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0F19] text-[#94A3B8] border-b border-[#1E293B]">
              <tr>
                <th className="py-3 px-4 font-medium">Rule ID</th>
                <th className="py-3 px-4 font-medium">Attack Type</th>
                <th className="py-3 px-4 font-medium">Threshold</th>
                <th className="py-3 px-4 font-medium">Time Window</th>
                <th className="py-3 px-4 font-medium">Severity</th>
                <th className="py-3 px-4 font-medium">Engine Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {rules.map((rule) => {
                const isEditing = editingRuleId === rule.rule_id;

                return (
                  <tr key={rule.rule_id} className="hover:bg-[#1E293B]/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {rule.rule_id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#F8FAFC]">{rule.attack_type}</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">{rule.description}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing && rule.rule_id !== 'IP-001' ? (
                        <input
                          type="number"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-1 bg-[#0B0F19] border border-[#334155] rounded text-xs font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                        />
                      ) : (
                        <span className="font-bold text-white">
                          {rule.rule_id === 'IP-001' ? 'Watchlist Match' : rule.threshold}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing && rule.rule_id !== 'IP-001' ? (
                        <input
                          type="number"
                          value={editWindow}
                          onChange={(e) => setEditWindow(parseInt(e.target.value, 10) || 0)}
                          className="w-20 px-2 py-1 bg-[#0B0F19] border border-[#334155] rounded text-xs font-mono text-white focus:outline-none focus:border-[#38BDF8]"
                        />
                      ) : (
                        <span className="text-[#94A3B8]">
                          {rule.time_window > 0 ? `${rule.time_window}s` : 'Immediate'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[#EF4444] font-bold">
                      {rule.severity}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnable(rule)}
                        className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                          rule.enabled
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/25'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={saving}
                            onClick={() => handleSave(rule.rule_id)}
                            className="px-2.5 py-1 bg-[#0284C7] text-white rounded text-[11px] hover:bg-[#0369A1] flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="px-2.5 py-1 bg-[#1E293B] border border-[#334155] text-[#94A3B8] rounded text-[11px] hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        rule.rule_id !== 'IP-001' && (
                          <button
                            onClick={() => startEdit(rule)}
                            className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-[#334155] rounded text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Configure
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Comprehensive Domain-by-Domain Rule Explanations (Requested by user) */}
      <div className="space-y-6">
        <div>
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            In-Depth Domain Threat Models & Explanations
          </span>
          <h2 className="text-xl font-serif text-[#F8FAFC] mt-0.5">
            How Rules Apply to Each Monitored Application Demo
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Detailed breakdown of what each domain generates, why attacks are suspicious, and how the engine intervenes.
          </p>
        </div>

        <div className="space-y-6">
          {filteredExplanations.map((domainExp) => {
            const Icon = domainExp.icon;

            return (
              <div
                key={domainExp.domainId}
                className="bg-[#111827] border border-[#1E293B] rounded p-6 space-y-5"
              >
                {/* Domain Card Header */}
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4">
                  <div className="w-9 h-9 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-white">
                      {domainExp.domainName}
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      {domainExp.threatSummary}
                    </p>
                  </div>
                </div>

                {/* Rules List for this Domain */}
                <div className="space-y-4">
                  {domainExp.rulesApplied.map((r) => (
                    <div
                      key={r.ruleId}
                      className="bg-[#0B0F19] border border-[#1E293B] rounded p-4.5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2 py-0.5 rounded">
                            {r.ruleId}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {r.ruleName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-white font-bold">
                            Condition: {r.thresholdDisplay}
                          </span>
                          <span className="text-[#64748B]">·</span>
                          <span className="text-[#94A3B8]">
                            Window: {r.timeWindowDisplay}
                          </span>
                        </div>
                      </div>

                      {/* Explanation Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#111827] p-3 rounded border border-[#1E293B] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-[#38BDF8] font-bold block">
                            Threat Scenario & Attack Vector
                          </span>
                          <p className="text-[#94A3B8] leading-relaxed">
                            {r.scenario}
                          </p>
                        </div>

                        <div className="bg-[#111827] p-3 rounded border border-[#1E293B] space-y-1">
                          <span className="text-[10px] font-mono uppercase text-[#EF4444] font-bold block">
                            Why Is This Suspicious?
                          </span>
                          <p className="text-[#94A3B8] leading-relaxed">
                            {r.whySuspicious}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#111827] p-3 rounded border border-[#1E293B] text-xs space-y-1">
                        <span className="text-[10px] font-mono uppercase text-[#10B981] font-bold block">
                          How To Demonstrate In Demo Application
                        </span>
                        <p className="text-[#F8FAFC] leading-relaxed">
                          {r.demoAction}
                        </p>
                      </div>

                      <div className="text-[11px] font-mono text-[#94A3B8] pt-1">
                        <strong className="text-white">Remediation & Defense:</strong> {r.remediation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
