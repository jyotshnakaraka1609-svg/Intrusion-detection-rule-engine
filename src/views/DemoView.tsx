import React, { useState } from 'react';
import { SecurityDomain, Detection } from '../types';
import { Shield, Lock, ShoppingBag, Landmark, Search, Plus, ShoppingCart, Activity, AlertCircle, RefreshCw, Terminal, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface DemoViewProps {
  onDetectionTriggered: (detection: Detection) => void;
  onViewTrace: (detection: Detection) => void;
  onNavigateToBackend: (detection?: Detection) => void;
}

export const DemoView: React.FC<DemoViewProps> = ({
  onDetectionTriggered,
  onViewTrace,
  onNavigateToBackend
}) => {
  const [activeDomain, setActiveDomain] = useState<SecurityDomain>('web');

  // Client IP (clean standard client IP)
  const selectedClientIp = '192.168.1.45';

  // -------------------------------------------------------------
  // Domain 1: Web State
  // -------------------------------------------------------------
  const [webUsername, setWebUsername] = useState('demo.analyst');
  const [webPassword, setWebPassword] = useState('');
  const [webAuthStatus, setWebAuthStatus] = useState<string | null>(null);
  const [webFailedCount, setWebFailedCount] = useState<number>(0);
  const [lastAuthDetection, setLastAuthDetection] = useState<Detection | null>(null);
  const [webActiveSubTab, setWebActiveSubTab] = useState<'login' | 'profile'>('login');

  // -------------------------------------------------------------
  // Domain 2: E-Commerce State ("Northwind Supply Co.")
  // -------------------------------------------------------------
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([
    { id: 'prod-01', name: 'Precision Vernier Caliper', price: 1450, qty: 1 }
  ]);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [storeRapidCount, setStoreRapidCount] = useState<number>(0);

  // -------------------------------------------------------------
  // Domain 3: Banking State ("Aegis Trust & Capital")
  // -------------------------------------------------------------
  const [scannedPorts, setScannedPorts] = useState<number[]>([]);
  const [targetPortInput, setTargetPortInput] = useState<string>('22');
  const [diagOutput, setDiagOutput] = useState<string[]>([]);
  const [isScanningBatch, setIsScanningBatch] = useState(false);

  // -------------------------------------------------------------
  // Web Handlers
  // -------------------------------------------------------------
  const handleWebLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/web/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: webUsername,
          password: webPassword,
          clientIp: selectedClientIp
        })
      });
      const data = await res.json();

      if (!res.ok) {
        const newCount = webFailedCount + 1;
        setWebFailedCount(newCount);

        if (newCount === 1) {
          setWebAuthStatus(`Attempt 1 failed. State Manager recorded 1 failed attempt for source IP ${selectedClientIp}. (Rule BRUTE-001 threshold is 3 attempts).`);
        } else if (newCount === 2) {
          setWebAuthStatus(`Attempt 2 failed! ⚠️ Warning: 1 more failed attempt from ${selectedClientIp} will trigger BRUTE-001 detection.`);
        } else if (newCount >= 3) {
          setWebAuthStatus(`Attempt ${newCount} failed! 🚨 THRESHOLD CROSSED: 3 failed logins detected within 60s from ${selectedClientIp}.`);
        }
      } else {
        setWebAuthStatus(`Authentication Successful. Logged in as ${data.user.username}`);
        setWebFailedCount(0);
      }

      // Check if pipeline generated any detections
      if (data.pipeline?.detections?.length > 0) {
        const det: Detection = data.pipeline.detections[0];
        setLastAuthDetection(det);
        onDetectionTriggered(det);
      }
    } catch (err) {
      setWebAuthStatus('Connection error with backend.');
    }
  };

  // -------------------------------------------------------------
  // E-Commerce Handlers
  // -------------------------------------------------------------
  const handleStoreSearch = async (query: string) => {
    setStoreSearch(query);
    try {
      const res = await fetch(`/api/ecommerce/search?q=${encodeURIComponent(query)}&clientIp=${selectedClientIp}`);
      const data = await res.json();
      if (data.pipeline?.detections?.length > 0) {
        data.pipeline.detections.forEach((d: Detection) => onDetectionTriggered(d));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRapidBrowsing = async (batchCount = 25) => {
    setStoreStatus(`Generating ${batchCount} genuine HTTP catalog requests from ${selectedClientIp}...`);
    for (let i = 0; i < batchCount; i++) {
      try {
        const res = await fetch(`/api/ecommerce/products?clientIp=${selectedClientIp}&nonce=${i}`);
        const data = await res.json();
        setStoreRapidCount(c => c + 1);
        if (data.pipeline?.detections?.length > 0) {
          data.pipeline.detections.forEach((d: Detection) => onDetectionTriggered(d));
          setStoreStatus(`Threshold crossed! Detection RATE-001 triggered.`);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    setStoreStatus(`Processed ${batchCount} requests. Continue browsing to reach the 100 req / 10s threshold.`);
  };

  // -------------------------------------------------------------
  // Banking Handlers
  // -------------------------------------------------------------
  const handlePortCheck = async (portNum: number) => {
    try {
      const res = await fetch('/api/banking/diagnostics/port-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: portNum,
          clientIp: selectedClientIp
        })
      });
      const data = await res.json();
      setScannedPorts(prev => Array.from(new Set([...prev, portNum])));
      setDiagOutput(prev => [
        `[${new Date().toLocaleTimeString()}] Probe 10.10.0.10:${portNum} (TCP) -> ${data.state} (${data.latency_ms}ms)`,
        ...prev.slice(0, 8)
      ]);

      if (data.pipeline?.detections?.length > 0) {
        data.pipeline.detections.forEach((d: Detection) => onDetectionTriggered(d));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunPortRange = async () => {
    setIsScanningBatch(true);
    const testPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 993, 995, 1433, 3306, 5432, 6379, 8080];
    for (const p of testPorts) {
      await handlePortCheck(p);
      await new Promise(r => setTimeout(r, 120));
    }
    setIsScanningBatch(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Domain Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
        <div>
          <span className="text-xs font-mono uppercase text-[#38BDF8] font-semibold">
            Interactive Multi-Domain Sandbox
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#F8FAFC] mt-0.5">
            Application Demonstration Hub
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Interact with real application workflows. All activity flows into the backend pipeline in real time.
          </p>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E293B]">
        <button
          onClick={() => setActiveDomain('web')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeDomain === 'web'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>1. Web Applications</span>
        </button>

        <button
          onClick={() => setActiveDomain('ecommerce')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeDomain === 'ecommerce'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>2. E-Commerce Store</span>
        </button>

        <button
          onClick={() => setActiveDomain('banking')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
            activeDomain === 'banking'
              ? 'border-[#38BDF8] text-[#F8FAFC] font-semibold bg-[#111827]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>3. Banking & FinTech</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DOMAIN 1: WEB APPLICATIONS */}
      {/* ========================================================================= */}
      {activeDomain === 'web' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase text-[#38BDF8] font-semibold">
                  SaaS Customer Identity Gateway
                </span>
                <h2 className="text-xl font-serif text-[#F8FAFC]">
                  Sentinel Enterprise Web Portal
                </h2>
              </div>

              {/* Sub tabs (API Query button removed per user request) */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setWebActiveSubTab('login')}
                  className={`px-3 py-1 rounded cursor-pointer ${webActiveSubTab === 'login' ? 'bg-[#0284C7] text-white font-semibold' : 'bg-[#1E293B] text-[#94A3B8]'}`}
                >
                  Auth Login
                </button>
                <button
                  onClick={() => setWebActiveSubTab('profile')}
                  className={`px-3 py-1 rounded cursor-pointer ${webActiveSubTab === 'profile' ? 'bg-[#0284C7] text-white font-semibold' : 'bg-[#1E293B] text-[#94A3B8]'}`}
                >
                  User Profile
                </button>
              </div>
            </div>

            {/* Sub Tab: Login Form */}
            {webActiveSubTab === 'login' && (
              <div className="max-w-xl mx-auto py-2 space-y-4">
                {/* 2 to 3 failed logins guidance banner as requested */}
                <div className="p-3 bg-[#0B0F19] border border-[#1E293B] rounded text-xs text-[#94A3B8] leading-relaxed">
                  <div className="font-semibold text-[#38BDF8] font-mono mb-1">
                    Brute Force Authentication Test (BRUTE-001):
                  </div>
                  Enter an incorrect password <strong>2 to 3 times</strong> below.
                  The backend tracks sliding-window history for IP <code className="font-mono text-[#F8FAFC]">{selectedClientIp}</code>.
                  After 2 failures, a warning is raised; on the 3rd failure, <strong>BRUTE-001</strong> triggers and generates a full backend explanation!
                </div>

                <form onSubmit={handleWebLogin} className="space-y-4 bg-[#0B0F19] p-5 rounded border border-[#1E293B]">
                  <div>
                    <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      value={webUsername}
                      onChange={(e) => setWebUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] rounded focus:outline-none focus:border-[#38BDF8]"
                      placeholder="e.g. alex.vance"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-[#94A3B8] mb-1 font-semibold">
                      Password (Valid: SentinelSecure2026!)
                    </label>
                    <input
                      type="password"
                      value={webPassword}
                      onChange={(e) => setWebPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] rounded focus:outline-none focus:border-[#38BDF8]"
                      placeholder="Enter wrong password to test 2-3 fails"
                    />
                  </div>

                  {/* Progress Indicator for 2 to 3 fails */}
                  <div className="p-3 bg-[#111827] border border-[#1E293B] rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#94A3B8]">Failed Logins in Current Window:</span>
                      <span className={`font-bold ${webFailedCount >= 3 ? 'text-[#EF4444]' : webFailedCount === 2 ? 'text-amber-400' : 'text-[#38BDF8]'}`}>
                        {webFailedCount} / 3 Attempts
                      </span>
                    </div>

                    {/* Step progress pills */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                      <div className={`p-1 rounded border ${webFailedCount >= 1 ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]' : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'}`}>
                        Attempt 1: Logged
                      </div>
                      <div className={`p-1 rounded border ${webFailedCount >= 2 ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'}`}>
                        Attempt 2: Warning
                      </div>
                      <div className={`p-1 rounded border ${webFailedCount >= 3 ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] font-bold' : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'}`}>
                        Attempt 3: Detected!
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setWebFailedCount(0);
                        setWebAuthStatus(null);
                        setLastAuthDetection(null);
                      }}
                      className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] underline cursor-pointer"
                    >
                      Reset Count
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded transition-colors cursor-pointer"
                    >
                      Submit Login Attempt
                    </button>
                  </div>

                  {webAuthStatus && (
                    <div className={`p-3 text-xs font-mono rounded border ${
                      webFailedCount >= 3
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#FCA5A5]'
                        : webFailedCount === 2
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-[#111827] border-[#1E293B] text-[#F8FAFC]'
                    }`}>
                      {webAuthStatus}
                    </div>
                  )}
                </form>

                {/* Direct Link to Backend Journey upon 2-3 fails (Requested feature!) */}
                {lastAuthDetection && (
                  <div className="bg-[#111827] border-2 border-[#10B981] p-4 rounded space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>BRUTE-001 Detection Successfully Produced!</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        3 Failed Attempts Observed
                      </span>
                    </div>

                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {lastAuthDetection.description} The backend evaluated the 60-second sliding window, matched the rule condition, created forensic evidence, and logged the 10-stage execution journey.
                    </p>

                    <button
                      onClick={() => onNavigateToBackend(lastAuthDetection)}
                      className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#0B0F19] text-xs font-bold font-mono rounded flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                    >
                      <span>👉 View Live Backend Pipeline Journey on Backend Page</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub Tab: Profile */}
            {webActiveSubTab === 'profile' && (
              <div className="max-w-lg mx-auto py-4 space-y-4">
                <div className="bg-[#0B0F19] p-5 rounded border border-[#1E293B] space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-[#94A3B8]">Account Name:</span>
                    <span className="font-semibold text-white">Alex Vance</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-[#94A3B8]">Role:</span>
                    <span className="text-[#38BDF8] font-semibold">Lead Systems Architect</span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-[#94A3B8]">Email:</span>
                    <span className="text-white">alex.vance@sentinel-enterprise.internal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">MFA Status:</span>
                    <span className="text-[#10B981] font-semibold">HARDWARE KEY ENFORCED</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOMAIN 2: E-COMMERCE ("Northwind Supply Co.") */}
      {/* ========================================================================= */}
      {activeDomain === 'ecommerce' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase text-[#38BDF8] font-semibold">
                  Retail Storefront
                </span>
                <h2 className="text-xl font-serif text-[#F8FAFC]">
                  Northwind Supply Co. — Metrology & Workshop
                </h2>
              </div>

              {/* Rapid Rate Limit Stress Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRapidBrowsing(25)}
                  className="px-3.5 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Issues 25 rapid catalog requests from the selected client IP"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rapid Browse (+25 Requests)</span>
                </button>
              </div>
            </div>

            {/* Live Search & Cart Counter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => handleStoreSearch(e.target.value)}
                  placeholder="Live search catalog (caliper, watch, titanium)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#111827] border border-[#1E293B] text-xs font-mono text-white rounded focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-[#94A3B8]">
                <div>
                  Requests in Window: <strong className="text-white">{storeRapidCount}</strong> (Threshold: &gt;100)
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <ShoppingCart className="w-4 h-4 text-[#38BDF8]" />
                  <span>{cart.reduce((a, b) => a + b.qty, 0)} Items in Cart</span>
                </div>
              </div>
            </div>

            {storeStatus && (
              <div className="p-3 text-xs font-mono bg-[#0B0F19] border border-[#1E293B] rounded text-white flex items-center justify-between">
                <span>{storeStatus}</span>
                <button
                  onClick={() => onNavigateToBackend()}
                  className="text-xs text-[#38BDF8] hover:underline ml-3 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>View in Backend Engine →</span>
                </button>
              </div>
            )}

            {/* Product Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'prod-01', name: 'Precision Vernier Caliper (150mm)', cat: 'Metrology', price: 1450, sku: 'MET-150V' },
                { id: 'prod-02', name: 'Industrial Chronometer 24h Watch', cat: 'Timepieces', price: 8200, sku: 'TIM-24HR' },
                { id: 'prod-03', name: 'Heavy Canvas Field Dispatch Bag', cat: 'Gear', price: 3400, sku: 'GER-BAG8' },
                { id: 'prod-04', name: 'Titanium Multi-Tool Hex Wrench', cat: 'Tools', price: 1950, sku: 'TOL-HEX9' },
                { id: 'prod-05', name: 'Optical Micro-Scribing Tool Set', cat: 'Precision', price: 2850, sku: 'PRC-SCRIB' },
                { id: 'prod-06', name: 'Ceramic Lab Mortar & Pestle', cat: 'Laboratory', price: 1100, sku: 'LAB-MORT' },
              ].map((p) => (
                <div key={p.id} className="bg-[#0B0F19] border border-[#1E293B] p-4 rounded space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-[#38BDF8] uppercase font-semibold">
                        {p.cat}
                      </span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">{p.sku}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1">{p.name}</h4>
                    <div className="text-xs font-mono font-bold text-[#10B981] mt-2">
                      ₹{p.price.toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCart(c => [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }]);
                      fetch('/api/ecommerce/cart/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: p.id, clientIp: selectedClientIp })
                      }).then(res => res.json()).then(data => {
                        if (data.pipeline?.detections?.length > 0) {
                          data.pipeline.detections.forEach((d: Detection) => onDetectionTriggered(d));
                        }
                      });
                    }}
                    className="w-full py-1.5 bg-[#111827] hover:bg-[#1E293B] border border-[#334155] text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Order</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOMAIN 3: BANKING & FINTECH ("Aegis Trust & Capital") */}
      {/* ========================================================================= */}
      {activeDomain === 'banking' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1E293B] rounded p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#FCA5A5] text-[10px] font-mono font-bold mb-1">
                  DEMO / SYNTHETIC DATA ENVIRONMENT ONLY
                </div>
                <h2 className="text-xl font-serif text-[#F8FAFC]">
                  Aegis Trust & Capital — Corporate Banking Portal
                </h2>
              </div>

              <div className="font-mono text-xs text-right">
                <div className="text-[#94A3B8]">Account: **** 4821</div>
                <div className="text-base font-bold text-[#10B981]">Balance: ₹82,450.00</div>
              </div>
            </div>

            {/* Banking Ledger & Controlled Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Ledger */}
              <div className="lg:col-span-6 space-y-4">
                <h3 className="text-xs font-mono font-semibold uppercase text-[#94A3B8]">
                  Recent Fictional Transaction Ledger
                </h3>

                <div className="bg-[#0B0F19] rounded border border-[#1E293B] overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#111827] text-[#94A3B8] border-b border-[#1E293B]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      <tr>
                        <td className="py-2.5 px-3 text-[#94A3B8]">2026-10-02</td>
                        <td className="py-2.5 px-3 text-white">Direct Clearing Settlement</td>
                        <td className="py-2.5 px-3 text-right text-[#10B981] font-semibold">+₹45,000.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-[#94A3B8]">2026-09-28</td>
                        <td className="py-2.5 px-3 text-white">Freight Bill Settlement</td>
                        <td className="py-2.5 px-3 text-right text-[#EF4444] font-semibold">-₹14,250.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-[#94A3B8]">2026-09-22</td>
                        <td className="py-2.5 px-3 text-white">Cloud Infrastructure Billing</td>
                        <td className="py-2.5 px-3 text-right text-[#EF4444] font-semibold">-₹8,300.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Network Diagnostics */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-semibold uppercase text-[#94A3B8]">
                    Controlled Network Diagnostics (SCAN-001)
                  </h3>
                  <span className="text-[10px] font-mono text-[#38BDF8] font-semibold">
                    Target: 10.10.0.10
                  </span>
                </div>

                <div className="bg-[#0B0F19] p-4 rounded border border-[#1E293B] space-y-3">
                  <div className="text-xs text-[#94A3B8] leading-relaxed">
                    Check safe ports on controlled demo target <strong>10.10.0.10</strong>.
                    If more than <strong>15 unique destination ports</strong> are checked within <strong>10 seconds</strong>,
                    the Rule Engine detects a Port Scan (<strong>SCAN-001</strong>).
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={targetPortInput}
                      onChange={(e) => setTargetPortInput(e.target.value)}
                      placeholder="Port (e.g. 22, 80)..."
                      className="w-28 px-3 py-1.5 bg-[#111827] border border-[#1E293B] text-xs font-mono text-white rounded focus:outline-none"
                    />
                    <button
                      onClick={() => handlePortCheck(parseInt(targetPortInput, 10) || 80)}
                      className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white text-xs font-medium rounded transition-colors cursor-pointer"
                    >
                      Check Port
                    </button>

                    <button
                      disabled={isScanningBatch}
                      onClick={handleRunPortRange}
                      className="px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold rounded transition-colors ml-auto flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{isScanningBatch ? 'Testing 16 Ports...' : 'Run 16-Port Diagnostic'}</span>
                    </button>
                  </div>

                  <div className="bg-[#000000] text-white p-3 rounded font-mono text-[11px] h-32 overflow-y-auto space-y-1 border border-[#1E293B]">
                    <div className="text-[#38BDF8]"># Controlled Target Diagnostic Log [10.10.0.10]</div>
                    {diagOutput.length === 0 ? (
                      <div className="text-[#64748B]">Click 'Check Port' or 'Run 16-Port Diagnostic' to probe ports.</div>
                    ) : (
                      diagOutput.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between items-center">
                    <span>Unique Ports Probed: <strong className="text-white">{scannedPorts.length}</strong> / 15 threshold</span>
                    <button
                      onClick={() => onNavigateToBackend()}
                      className="text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect in Backend Page →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
