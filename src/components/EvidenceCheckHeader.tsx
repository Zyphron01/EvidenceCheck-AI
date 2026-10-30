"use client";

import React from "react";
import { ShieldCheck, Search, Database, Archive, Cpu } from "lucide-react";

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
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-100 tracking-tight text-lg">
                  EvidenceCheck AI
                </span>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Citation-Audited
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Contradiction-aware fact verification with deterministic quote matching
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onTabChange("investigate")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "investigate"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Investigate</span>
            </button>

            <button
              onClick={() => onTabChange("archive")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "archive"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Verified Run</span>
            </button>

            <button
              onClick={() => onTabChange("dashboard")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dashboard</span>
              {!databaseConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" title="Database unconfigured" />
              )}
            </button>
          </nav>

          {/* System Spec Pill */}
          <div className="hidden lg:flex items-center space-x-2 text-xs text-zinc-400 border border-zinc-800 rounded-lg px-2.5 py-1 bg-zinc-900/50">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] text-zinc-300">Nemotron 120B</span>
            <span className="text-zinc-600">|</span>
            <span className="font-mono text-[11px] text-zinc-300">Tavily Dual</span>
          </div>
        </div>
      </div>
    </header>
  );
}

