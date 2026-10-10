"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onOpenDemo?: () => void;
}

export default function HeroSection({ onOpenDemo }: HeroSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"live-job" | "multi-shop" | "ai-voice">("live-job");

  const handleLaunchPlatform = () => {
    const token = getAuthToken();
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <section className="relative w-full pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden bg-[#F4F4F1]">
      {/* Background Subtle Warm Carbon Glow */}
      <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#111827]/5 via-slate-200/50 to-transparent blur-[130px] rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 2-Column Hero Header Layout: Left-Aligned Text & Right-Positioned Luxury Car */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center mb-16">
          {/* Left Column: Text & Action Controls */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#2C2421]/15 text-[#2C2421] text-xs font-semibold shadow-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#111827] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#111827]"></span>
                </span>
                <span>Multi-Tenant Auto Repair Shop Platform</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#2C2421] leading-[1.1]"
            >
              The Operating System for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827]">
                Auto Repair Garages
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-[#2C2421]/80 max-w-xl font-normal leading-relaxed"
            >
              Connect customer bookings, technician estimates, parts inventory, mandatory quality control, and AI front desk into one clean, role-based platform.
            </motion.p>

            {/* Action CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={handleLaunchPlatform}
                className="px-6 py-3.5 rounded-xl bg-[#111827] hover:bg-[#0F172A] text-white font-bold text-sm shadow-xl shadow-[#111827]/15 transition-all flex items-center gap-2 group hover:scale-[1.02] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">play_circle</span>
                <span>Launch Platform</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <Link
                href="/shops"
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#F4F4F1] border border-[#2C2421]/15 text-[#2C2421] font-semibold text-sm transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-[#111827] text-lg">storefront</span>
                <span>Find Workshops</span>
              </Link>
              <a
                href="#roles-pos"
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#F4F4F1] border border-[#2C2421]/15 text-[#2C2421] font-semibold text-sm transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-[#111827] text-lg">view_cozy</span>
                <span>Explore 5 Roles</span>
              </a>
            </motion.div>
          </div>

          {/* Right Column: Sleek Silver Luxury Car Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-6 relative flex items-center justify-center lg:justify-end"
          >
            <div className="relative z-10 w-full max-w-2xl lg:max-w-none flex items-center justify-center overflow-visible">
              {/* Soft Inset Blur on Corners and Edges so no boundary shows */}
              <div className="absolute -inset-4 pointer-events-none z-20 [box-shadow:inset_0_0_60px_45px_#F4F4F1]" />

              {/* Radial Edge Vignette blending seamlessly into #F4F4F1 background */}
              <div className="absolute -inset-1 pointer-events-none z-20 [background:radial-gradient(ellipse_85%_80%_at_center,transparent_55%,rgba(244,244,241,0.5)_75%,#F4F4F1_96%)]" />

              <video
                src="/assets/video.mp4"
                poster="/assets/luxury_silver_car.png"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  maskImage:
                    "radial-gradient(ellipse 85% 80% at center, black 55%, rgba(0,0,0,0.85) 75%, transparent 97%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 85% 80% at center, black 55%, rgba(0,0,0,0.85) 75%, transparent 97%)",
                }}
                className="w-full h-auto max-h-[520px] lg:max-h-[580px] object-contain mix-blend-multiply contrast-[106%] brightness-[105%] hover:scale-[1.02] transition-transform duration-500 pointer-events-none"
              />
            </div>
          </motion.div>
        </div>

        {/* Pure White Minimal Dashboard Preview Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 max-w-5xl mx-auto rounded-2xl bg-white border border-[#2C2421]/12 shadow-[0_20px_50px_rgba(44,36,33,0.06)] overflow-hidden"
        >
          {/* Dashboard Window Header Bar */}
          <div className="px-6 py-4 bg-[#F4F4F1]/70 border-b border-[#2C2421]/12 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#2C2421]/20" />
                <div className="w-3 h-3 rounded-full bg-[#2C2421]/20" />
                <div className="w-3 h-3 rounded-full bg-[#2C2421]/20" />
              </div>
              <span className="font-semibold text-xs text-[#2C2421] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#111827]" />
                Lahore Auto Care — Service Workspace
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#2C2421]/12 shadow-sm">
              <button
                onClick={() => setActiveTab("live-job")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "live-job"
                    ? "bg-[#111827] text-white shadow-sm font-bold"
                    : "text-[#2C2421]/70 hover:text-[#2C2421]"
                }`}
              >
                Active Job Card
              </button>
              <button
                onClick={() => setActiveTab("multi-shop")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "multi-shop"
                    ? "bg-[#111827] text-white shadow-sm font-bold"
                    : "text-[#2C2421]/70 hover:text-[#2C2421]"
                }`}
              >
                Multi-Shop View
              </button>
              <button
                onClick={() => setActiveTab("ai-voice")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "ai-voice"
                    ? "bg-[#111827] text-white shadow-sm font-bold"
                    : "text-[#2C2421]/70 hover:text-[#2C2421]"
                }`}
              >
                AI Front Desk
              </button>
            </div>
          </div>

          {/* Dashboard Preview Body */}
          <div className="p-6 lg:p-8 bg-white">
            {activeTab === "live-job" && (
              <div className="flex flex-col gap-6">
                {/* Vehicle Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#F4F4F1]/60 border border-[#2C2421]/12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#111827]/10 border border-[#111827]/15 flex items-center justify-center text-[#111827]">
                      <span className="material-symbols-outlined text-2xl">directions_car</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-[#2C2421]">Honda Civic 2016</span>
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-white text-[#2C2421] border border-[#2C2421]/15 font-bold">
                          LEA-1234
                        </span>
                      </div>
                      <div className="text-xs text-[#2C2421]/70 mt-1">
                        Customer: <strong className="text-[#2C2421]">Ahmed Khan</strong> • Tech: <strong className="text-[#2C2421]">Imran Mechanic</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#111827]/10 text-[#111827] border border-[#111827]/20">
                      ESTIMATE_APPROVED
                    </span>
                    <button
                      onClick={onOpenDemo}
                      className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold transition-colors shadow-sm"
                    >
                      Assign Parts
                    </button>
                  </div>
                </div>

                {/* Streamlined Step Bar */}
                <div className="p-4 rounded-xl bg-[#F4F4F1]/60 border border-[#2C2421]/12">
                  <div className="text-xs text-[#2C2421] font-bold mb-3 flex items-center justify-between">
                    <span>BOOKING WORKFLOW</span>
                    <span className="text-[#111827] font-bold">Step 3 of 5</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#111827]/10 border border-[#111827]/20 text-[#111827] text-center font-bold">
                      ✓ 1. Booking
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#111827]/10 border border-[#111827]/20 text-[#111827] text-center font-bold">
                      ✓ 2. Inspection
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#111827] text-white text-center font-bold shadow-sm">
                      ● 3. Approved
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#2C2421]/12 text-[#2C2421]/50 text-center">
                      4. Parts
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#2C2421]/12 text-[#2C2421]/50 text-center">
                      5. QC &amp; Pick-up
                    </div>
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-white border border-[#2C2421]/12 shadow-sm">
                    <div className="text-xs font-bold text-[#2C2421] uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Itemized Estimate</span>
                      <span className="text-[#111827] font-bold text-sm">PKR 16,100</span>
                    </div>
                    <ul className="text-xs text-[#2C2421]/80 space-y-2">
                      <li className="flex justify-between py-1 border-b border-[#2C2421]/10">
                        <span>Ignition Coil x1</span>
                        <span className="text-[#2C2421] font-semibold">PKR 6,500</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#2C2421]/10">
                        <span>Engine Oil 4L</span>
                        <span className="text-[#2C2421] font-semibold">PKR 5,200</span>
                      </li>
                      <li className="flex justify-between py-1">
                        <span>Labor Charge</span>
                        <span className="text-[#2C2421] font-semibold">PKR 4,400</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-[#2C2421]/12 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#2C2421] uppercase tracking-wider mb-2">
                        Customer Activity Log
                      </div>
                      <p className="text-xs text-[#2C2421]/80 leading-relaxed">
                        Customer approved estimate via mobile portal at <strong className="text-[#111827]">10:14 AM</strong>.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-[#2C2421]/10 flex items-center justify-between text-xs">
                      <span className="text-[#2C2421]/60">Next Step:</span>
                      <span className="font-bold text-[#111827]">Allocate Parts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "multi-shop" && (
              <div className="p-6 rounded-xl bg-[#F4F4F1]/60 border border-[#2C2421]/12 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2C2421]/12">
                  <span className="font-bold text-sm text-[#2C2421]">Multi-Shop Owner View</span>
                  <span className="text-xs bg-[#111827]/10 text-[#111827] px-2.5 py-1 rounded-full border border-[#111827]/20 font-semibold">
                    2 Locations Active
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-white border border-[#111827]/30 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-[#2C2421] text-base">Lahore Auto Care</div>
                      <div className="text-xs text-[#2C2421]/60 mt-1">Gulberg III • 4 Team Members</div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2C2421]/10 flex items-center justify-between text-xs">
                      <span className="text-[#111827] font-bold">12 Active Jobs</span>
                      <span className="px-2.5 py-0.5 rounded bg-[#111827] text-white font-bold text-[11px]">Selected</span>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-white border border-[#2C2421]/12 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-[#2C2421] text-base">Karachi Speed Repair</div>
                      <div className="text-xs text-[#2C2421]/60 mt-1">Clifton • 6 Team Members</div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2C2421]/10 flex items-center justify-between text-xs">
                      <span className="text-[#2C2421]/70 font-medium">18 Active Jobs</span>
                      <button onClick={onOpenDemo} className="text-[#111827] hover:underline font-bold">
                        Switch Shop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai-voice" && (
              <div className="p-6 rounded-xl bg-[#F4F4F1]/60 border border-[#2C2421]/12 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2C2421]/12">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#111827] animate-pulse" />
                    <span className="font-bold text-sm text-[#2C2421]">AI Front Desk Call Assistant</span>
                  </div>
                  <span className="text-xs text-[#2C2421]/60 font-medium">Automatic Call Transcript</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#2C2421]/12 text-xs space-y-3 font-sans leading-relaxed">
                  <div className="text-[#2C2421]/80">
                    <span className="text-[#111827] font-bold">[AI FRONT DESK]:</span> &ldquo;Hello! Thanks for calling Lahore Auto Care. Your Honda Civic estimate of PKR 16,100 is ready for approval in your portal link.&rdquo;
                  </div>
                  <div className="text-[#2C2421]">
                    <span className="text-[#111827] font-bold">[CALLER AHMED]:</span> &ldquo;Great, approving now.&rdquo;
                  </div>
                  <div className="p-3 rounded-lg bg-[#111827]/5 border border-[#111827]/15 text-[#111827] font-medium mt-2">
                    <strong>Auto Task Logged:</strong> Customer reminded &amp; estimate approved.
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
