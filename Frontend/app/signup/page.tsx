"use client";

import { API_BASE_URL } from "@/lib/api";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: "OWNER" as "OWNER" | "CUSTOMER",
    shopName: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Call API at http://localhost:4000/api/auth/register
      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      if (formData.name) payload.name = formData.name;
      if (formData.phoneNumber) payload.phoneNumber = formData.phoneNumber;
      if (formData.role === "OWNER" && formData.shopName) payload.shopName = formData.shopName;

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Registration successful! Redirecting to OTP verification...");
        setTimeout(() => {
          router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
        }, 1000);
      } else {
        const extractedError =
          Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.map((err: any) => err.message).join(". ")
            : data.error || data.message || "Registration failed. Please verify your input details.";
        setErrorMsg(extractedError);
      }
    } catch (err: any) {
      console.error("Backend API Error during registration:", err);
      setErrorMsg(err.message || "Unable to connect to BayFlow backend server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F1] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#111827] selection:text-white">
      {/* Outer Floating Card Container - REVERSED LAYOUT (Form on Left, Dark Hero on Right) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.98, x: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-6xl bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(44,36,33,0.12)] border border-[#2C2421]/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] sm:min-h-[700px]"
      >
        {/* ================= LEFT HALF: CLEAN WHITE FORM PANE ================= */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-y-auto">
          {/* Top Header Row: Brand Logo & Sign In Link */}
          <div className="flex items-center justify-between w-full pb-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md shadow-[#111827]/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">build_circle</span>
              </div>
              <span className="font-headline text-lg font-extrabold tracking-tight text-[#2C2421]">
                BAYFLOW
              </span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2C2421] hover:text-[#111827] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#2C2421]/70">login</span>
              <span>Sign In</span>
            </Link>
          </div>

          {/* Center Form Container */}
          <div className="w-full max-w-md mx-auto my-auto py-4 space-y-5">
            <div className="space-y-1">
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#2C2421] tracking-tight">
                Create Account
              </h1>
              <p className="text-xs sm:text-sm text-[#2C2421]/60">
                Join BayFlow as a Shop Owner or Customer.
              </p>
            </div>

            {/* Alert Notifications */}
            {errorMsg && (
              <div className="p-3 bg-[#E85D22]/10 border border-[#E85D22]/30 rounded-2xl text-xs font-semibold text-[#E85D22] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-[#1F5C45]/10 border border-[#1F5C45]/30 rounded-2xl text-xs font-semibold text-[#1F5C45] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Account Role Selector */}
              <div className="flex bg-[#F4F4F1] p-1 rounded-full border border-[#2C2421]/15">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "OWNER" })}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                    formData.role === "OWNER"
                      ? "bg-[#111827] text-white shadow-sm"
                      : "text-[#2C2421]/70 hover:text-[#2C2421]"
                  }`}
                >
                  Shop Owner
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "CUSTOMER" })}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                    formData.role === "CUSTOMER"
                      ? "bg-[#111827] text-white shadow-sm"
                      : "text-[#2C2421]/70 hover:text-[#2C2421]"
                  }`}
                >
                  Customer Account
                </button>
              </div>

              {/* Full Name */}
              <div>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Email */}
              <div>
                <input
                  required
                  type="email"
                  placeholder="Email Address (e.g. owner@bayflow.com)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Shop Name (if Owner) */}
              {formData.role === "OWNER" && (
                <div>
                  <input
                    required
                    type="text"
                    placeholder="Shop / Garage Name (e.g. Lahore Auto Care)"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. +923001234567)"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (e.g. BayFlow#2026)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-5 pr-12 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2C2421]/50 hover:text-[#2C2421] p-1"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <div className="text-[10px] text-[#2C2421]/60 px-3 pt-1">
                  Must be 8+ chars with uppercase, lowercase, number &amp; symbol (e.g. <code className="font-mono bg-[#F4F4F1] px-1 py-0.5 rounded text-[#2C2421]">BayFlow#2026</code>)
                </div>
              </div>

              {/* Primary Action Button (Matches Sign In Gradient Pill Style) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-6 rounded-full bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] hover:from-[#1E293B] hover:to-[#0F172A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#111827]/20 transition-all flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                    <span>Create Account &amp; Verify</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Row inside Form Card */}
          <div className="pt-4 border-t border-[#2C2421]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#2C2421]/50 font-medium">
            <div>© 2026 BayFlow Auto Repair Inc.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#2C2421] transition-colors">
                Privacy Policy
              </a>
              <span className="text-[#2C2421]/30">•</span>
              <a href="#" className="hover:text-[#2C2421] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        {/* ================= RIGHT HALF: DARK HERO PANE WITH CAR VISUAL ================= */}
        <div className="lg:col-span-6 bg-[#111827] text-white p-8 sm:p-12 lg:p-14 relative flex flex-col justify-between overflow-hidden">
          {/* Concentric Wireframe Circular Decorative Geometry */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border border-white/10 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-white/10 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] border border-white/15 rounded-full pointer-events-none" />

          {/* Top Tagline */}
          <div className="relative z-10 text-xs sm:text-sm font-medium tracking-wide text-white/70">
            Join hundreds of garages running on BayFlow Auto Repair Platform.
          </div>

          {/* Center Main Headline & Car Visual */}
          <div className="relative z-10 my-auto pt-8 pb-4 flex flex-col items-center text-center">
            <h2 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Scale <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white">
                your garage
              </span>
            </h2>

            {/* Floating Luxury Car Visual (Clean dedicated Login car asset) */}
            <div className="relative w-full max-w-md mt-4 flex items-center justify-center">
              <div className="absolute w-64 h-64 bg-slate-400/15 blur-3xl rounded-full pointer-events-none" />
              <img
                src="/assets/luxury_silver_car_login.png"
                alt="BayFlow Silver Luxury Vehicle"
                className="relative z-10 w-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform duration-500 pointer-events-none [mask-image:radial-gradient(circle_at_center,black_75%,transparent_100%)]"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
