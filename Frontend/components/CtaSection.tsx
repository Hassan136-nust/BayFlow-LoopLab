"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface CtaSectionProps {
  onOpenDemo?: () => void;
}

export default function CtaSection({ onOpenDemo }: CtaSectionProps) {
  const router = useRouter();

  const handleLaunchPlatform = () => {
    const token = getAuthToken();
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-white border-t border-[#2C2421]/15 relative overflow-hidden">
      <div className="max-w-5xl mx-auto rounded-3xl bg-[#2C2421] text-white p-8 sm:p-12 lg:p-16 relative shadow-2xl overflow-hidden text-center flex flex-col items-center">
        {/* Decorative subtle ambient Obsidian Carbon glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-slate-500/15 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-4 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Ready for Production Deployment</span>
          </div>

          <h2 className="font-headline text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Get Started with BayFlow Today
          </h2>

          <p className="mt-4 text-base text-[#F4F4F1]/80 font-normal leading-relaxed">
            Manage your auto garage staff, technician job cards, stock allocations, estimate approvals, and customer notifications in one unified platform.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={handleLaunchPlatform}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#F4F4F1] text-[#2C2421] font-bold text-sm shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">play_circle</span>
              <span>Launch Platform</span>
            </button>
            <a
              href="#shop-access"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm transition-all"
            >
              View System Accounts
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
