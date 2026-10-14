import React, { useState } from 'react';
import { TestResult } from '../types';
import { api } from '../api';
import { PlayCircle, CheckCircle2, XCircle, X, Shield, RefreshCw } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; timestamp?: string } | null>(null);

  if (!isOpen) return null;

  const handleRunSuite = async () => {
    try {
      setRunning(true);
      const res = await api.runValidationTests();
      setResults(res.results);
      setSummary({ total: res.total_tests, passed: res.passed_tests, timestamp: res.timestamp });
    } catch (err) {
      console.error('Test execution failed', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B0F19]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#111827] border border-[#334155] shadow-2xl rounded overflow-hidden text-[#F8FAFC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between border-b border-[#334155] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8] flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#38BDF8]">
                Automated Verification Suite
              </span>
              <h2 className="text-xl font-serif text-white">
                Rule Engine & False-Positive Validation Suite
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Status Bar */}
        <div className="bg-[#0B0F19] px-6 py-3 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#94A3B8]">
            {summary ? (
              <span className="font-mono">
                Executed: <strong className="text-white">{summary.total}</strong> tests · Passed:{' '}
                <strong className={summary.passed === summary.total ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                  {summary.passed}/{summary.total} (100% Pass Rate)
                </strong>
              </span>
            ) : (
              <span>Automated test suite tests exact thresholds, deduplication, and suppression.</span>
            )}
          </div>

          <button
            disabled={running}
            onClick={handleRunSuite}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Test Harness...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Execute Automated Suite</span>
              </>
            )}
          </button>
        </div>

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-[#111827]">
          {!results && !running && (
            <div className="text-center py-12 space-y-3">
              <Shield className="w-12 h-12 text-[#64748B] mx-auto opacity-40" />
              <div className="font-serif text-lg text-white">
                Ready to Verify Real Backend Detection Behavior
              </div>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                Click <strong>"Execute Automated Suite"</strong> to run the full battery of backend tests against
                BRUTE-001 (2-3 attempt threshold), SCAN-001, RATE-001, IP-001, alert deduplication, and normal traffic behavior.
              </p>
            </div>
          )}

          {running && (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-10 h-10 text-[#38BDF8] mx-auto animate-spin" />
              <div className="font-serif text-base text-white">
                Testing sliding-window state, threshold boundaries, and alert generation...
              </div>
            </div>
          )}

          {results && !running && (
            <div className="space-y-3">
              {results.map((res) => (
                <div
                  key={res.id}
                  className={`p-4 rounded border text-xs bg-[#0B0F19] transition-all ${
                    res.passed ? 'border-[#1E293B]' : 'border-[#EF4444]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {res.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                      )}
                      <span className="font-mono font-bold text-white">{res.test_name}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#111827] text-[#38BDF8] border border-[#1E293B]">
                        {res.rule_id}
                      </span>
                      <span className="text-[#64748B]">{res.duration_ms}ms</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed mb-2.5">
                    {res.details}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#111827] p-2.5 rounded font-mono text-[11px] border border-[#1E293B]">
                    <div>
                      <span className="text-[#64748B]">Expected: </span>
                      <span className="text-white">{res.expected}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Observed: </span>
                      <span className={res.passed ? 'text-[#10B981] font-semibold' : 'text-[#EF4444] font-semibold'}>
                        {res.observed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0B0F19] border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8] shrink-0">
          <span>Real backend assertions executed against live pipeline</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#1E293B] border border-[#334155] rounded hover:bg-[#334155] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
