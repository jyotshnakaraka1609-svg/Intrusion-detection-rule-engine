import React from 'react';
import { Detection } from '../types';
import { AlertTriangle, ArrowRight, X, Activity } from 'lucide-react';

interface DetectionNotificationModalProps {
  detection: Detection | null;
  onClose: () => void;
  onViewBackground: (detection: Detection) => void;
}

export const DetectionNotificationModal: React.FC<DetectionNotificationModalProps> = ({
  detection,
  onClose,
  onViewBackground
}) => {
  if (!detection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#334155] shadow-2xl rounded overflow-hidden text-[#F8FAFC]">
        {/* Header Banner */}
        <div className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#38BDF8]">
                Security Detection Confirmed
              </span>
              <h2 className="text-xl font-serif text-white leading-tight">
                {detection.rule_id} — {detection.rule_name}
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

        {/* Body content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 1. What happened? */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8] mb-1">
              What Happened?
            </h3>
            <p className="text-sm text-white font-medium leading-relaxed bg-[#0B0F19] p-3 rounded border-l-2 border-[#EF4444] border border-[#1E293B]">
              {detection.description}
            </p>
          </div>

          {/* 2. What did the system observe? */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8] mb-2">
              What Did The System Observe?
            </h3>
            <div className="bg-[#0B0F19] p-3.5 rounded border border-[#1E293B] font-mono text-xs space-y-1.5 text-white">
              <div className="flex justify-between py-0.5 border-b border-[#1E293B]">
                <span className="text-[#94A3B8]">Source IP:</span>
                <span className="font-semibold text-white">{detection.source_ip}</span>
              </div>
              {detection.destination_ip && (
                <div className="flex justify-between py-0.5 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8]">Destination Target:</span>
                  <span className="font-semibold text-white">{detection.destination_ip}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 border-b border-[#1E293B]">
                <span className="text-[#94A3B8]">Observed Value:</span>
                <span className="font-semibold text-[#EF4444]">{detection.observed_value}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[#1E293B]">
                <span className="text-[#94A3B8]">Configured Threshold:</span>
                <span className="font-semibold text-white">{detection.threshold}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#94A3B8]">Sliding Time Window:</span>
                <span className="font-semibold text-white">{detection.time_window} seconds</span>
              </div>
            </div>
          </div>

          {/* 3. Forensic Evidence */}
          <div>
            <span className="text-[11px] font-mono uppercase text-[#38BDF8] block mb-1 font-semibold">
              Forensic Evidence Log
            </span>
            <div className="bg-[#0B0F19] border border-[#1E293B] p-3 rounded font-mono text-xs space-y-1 text-[#94A3B8]">
              {detection.evidence.map((item, idx) => (
                <div key={idx} className="truncate text-white">· {item}</div>
              ))}
            </div>
          </div>

          {/* 4. Why is this suspicious? */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8] mb-1">
              Why Is This Suspicious?
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#0B0F19] p-3 rounded border border-[#1E293B]">
              {detection.why_suspicious}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-[#0B0F19] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#94A3B8] hover:text-white font-medium cursor-pointer"
          >
            Dismiss
          </button>

          <button
            onClick={() => {
              onClose();
              onViewBackground(detection);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded shadow-sm transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Open in Live Backend Journey →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
