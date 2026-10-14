import React from 'react';
import { Shield, PlayCircle, RotateCcw, Activity } from 'lucide-react';

export type NavView = 
  | 'home'
  | 'demo'
  | 'backend'
  | 'rules'
  | 'architecture'
  | 'where_used'
  | 'about';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenTestRunner: () => void;
  onResetDemo: () => void;
  isStreamConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenTestRunner,
  onResetDemo,
  isStreamConnected
}) => {
  const navItems: { id: NavView; label: string; badge?: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'demo', label: 'Interactive Demo' },
    { id: 'backend', label: 'Backend Journey', badge: 'LIVE' },
    { id: 'rules', label: 'Rules' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'where_used', label: "Where It's Used" },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-b border-[#1E293B] px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand single text element wordmark */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] flex items-center justify-center font-serif text-base font-bold shadow-xs group-hover:bg-[#10B981]/25 transition-colors">
            <Shield className="w-4 h-4 text-[#10B981]" />
          </div>
          <span className="text-lg font-serif tracking-tight text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors whitespace-nowrap">
            Sentinel Rule Engine
          </span>
        </button>

        {/* Zone 2: Navigation Links (Dashboard and Alerts removed per user request) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-[#94A3B8]">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#F8FAFC] font-semibold bg-[#1E293B] border-b-2 border-[#10B981]'
                    : 'hover:text-[#F8FAFC] hover:bg-[#1E293B]/60'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          {/* Live Stream Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111827] border border-[#1E293B] text-[11px] font-mono text-[#94A3B8]">
            <span
              className={`w-2 h-2 rounded-full ${
                isStreamConnected ? 'bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'
              }`}
            />
            <span className="tabular-nums">
              {isStreamConnected ? 'STREAM ACTIVE' : 'CONNECTING'}
            </span>
          </div>

          {/* Test Runner Button */}
          <button
            onClick={onOpenTestRunner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] border border-[#38BDF8]/30 rounded shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Execute automated validation suite for the 4 core rules"
          >
            <PlayCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Validate Rules</span>
          </button>

          {/* Reset Demo State Button */}
          <button
            onClick={onResetDemo}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] border border-transparent hover:border-[#334155] rounded transition-colors cursor-pointer"
            title="Reset engine state to initial demo baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto pt-2 pb-1 text-xs text-[#94A3B8] border-t border-[#1E293B] mt-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap text-xs flex items-center gap-1 cursor-pointer ${
                isActive
                  ? 'text-[#F8FAFC] font-semibold bg-[#1E293B] border-b border-[#10B981]'
                  : 'hover:text-[#F8FAFC]'
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#10B981]/20 text-[#10B981]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
