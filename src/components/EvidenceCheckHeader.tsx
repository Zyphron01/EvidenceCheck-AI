"use client";

import React from "react";
import { ShieldCheck, Search, Database, Archive, Cpu, Sparkles } from "lucide-react";

export type ActiveTab = "investigate" | "archive" | "dashboard";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  databaseConfigured: boolean;
}

export function EvidenceCheckHeader({
  activeTab,
  onTabChange,
  databaseConfigured,
}: HeaderProps) {
  return (
    <header className="border-b border-[rgba(35,201,197,0.15)] bg-[#080D16]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#23C9C5]/20 to-[#10B981]/10 border border-[#23C9C5]/30 flex items-center justify-center text-[#23C9C5] shadow-lg shadow-[#23C9C5]/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-zinc-100 tracking-tight text-lg">
                  EvidenceCheck<span className="text-[#23C9C5]">.ai</span>
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#23C9C5]/10 text-[#23C9C5] border border-[#23C9C5]/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Constellation</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden md:block">
                Citation-Audited Evidence Intelligence Platform
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onTabChange("investigate")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "investigate"
                  ? "bg-[#192739] text-[#23C9C5] border border-[#23C9C5]/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111B2A]/60"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Investigate</span>
            </button>

            <button
              onClick={() => onTabChange("archive")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "archive"
                  ? "bg-[#192739] text-[#23C9C5] border border-[#23C9C5]/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111B2A]/60"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Verified Run</span>
            </button>

            <button
              onClick={() => onTabChange("dashboard")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-[#192739] text-[#23C9C5] border border-[#23C9C5]/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111B2A]/60"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Dashboard</span>
              {!databaseConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" title="Database unconfigured" />
              )}
            </button>
          </nav>

          {/* System Spec Pill */}
          <div className="hidden lg:flex items-center space-x-2.5 text-xs text-zinc-400 border border-zinc-800 rounded-xl px-3 py-1.5 bg-[#111B2A]/70">
            <Cpu className="w-3.5 h-3.5 text-[#23C9C5]" />
            <span className="font-mono text-[11px] text-zinc-300">Nemotron 120B</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-[11px] text-zinc-300">Tavily Dual</span>
          </div>
        </div>
      </div>
    </header>
  );
}
