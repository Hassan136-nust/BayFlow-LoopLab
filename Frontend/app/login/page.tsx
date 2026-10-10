"use client";

import { API_BASE_URL } from "@/lib/api";
import { setAuthToken, setAuthRole } from "@/lib/auth";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Attempt call to BayFlow API at http://localhost:4000/api/auth/login
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Signed in successfully!");
        if (data.accessToken) {
          setAuthToken(data.accessToken);
          try {
            const payload = JSON.parse(atob(data.accessToken.split(".")[1]));
            if (payload?.role) {
              setAuthRole(payload.role);
            }
          } catch (e) {
            console.warn("Could not decode JWT payload:", e);
          }
        }
        setTimeout(() => {
          router.push("/dashboard");
        }, 600);
      } else {
        // API error returned from backend
        setErrorMsg(data.error || data.message || "Invalid credentials. Please check your email and password.");
      }
    } catch (err: any) {
      console.error("Backend API error during sign in:", err);
      setErrorMsg(err.message || "Unable to connect to BayFlow backend server. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F1] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#111827] selection:text-white">
      {/* Outer Floating Card Container (Matches Payoneer reference layout structure) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-6xl bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(44,36,33,0.12)] border border-[#2C2421]/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] sm:min-h-[700px]"
      >
        {/* ================= LEFT HALF: DARK HERO PANE WITH CAR VISUAL ================= */}
        <div className="lg:col-span-6 bg-[#111827] text-white p-8 sm:p-12 lg:p-14 relative flex flex-col justify-between overflow-hidden">
          {/* Concentric Wireframe Circular Decorative Geometry */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border border-white/10 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-white/10 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] border border-white/15 rounded-full pointer-events-none" />

          {/* Top Tagline */}
          {/* <div className="relative z-10 text-xs sm:text-sm font-medium tracking-wide text-white/70">
            Multi-Tenant Auto Repair Management made simple — online solutions for your shop.
          </div> */}

          {/* Center Main Headline & Car Visual */}
          <div className="relative z-10 my-auto pt-8 pb-4 flex flex-col items-center text-center">
            <h2 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Manage <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white">
                your shop
              </span>
            </h2>

            {/* Floating Luxury Car Visual (Seamless dedicated Login car asset) */}
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

        {/* ================= RIGHT HALF: CLEAN WHITE FORM PANE ================= */}
        <div className="lg:col-span-6 bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-y-auto">
          {/* Top Header Row: Brand Logo & Sign Up Link */}
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
              href="/signup"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2C2421] hover:text-[#111827] transition-colors"
            >
              <span className="material-symbols-outlined text-base text-[#2C2421]/70">person_add</span>
              <span>Sign Up</span>
            </Link>
          </div>

          {/* Center Form Container */}
          <div className="w-full max-w-md mx-auto my-auto py-6 space-y-6">
            <div className="space-y-1">
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#2C2421] tracking-tight">
                Sign In
              </h1>
              <p className="text-xs sm:text-sm text-[#2C2421]/60">
                Access your role-based garage POS or customer portal account.
              </p>
            </div>

            {/* Alert Notifications */}
            {errorMsg && (
              <div className="p-3.5 bg-[#E85D22]/10 border border-[#E85D22]/30 rounded-2xl text-xs font-semibold text-[#E85D22] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-[#1F5C45]/10 border border-[#1F5C45]/30 rounded-2xl text-xs font-semibold text-[#1F5C45] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Field 1: Email or Username */}
              <div>
                <div className="relative">
                  <input
                    required
                    type="email"
                    placeholder="Email or Username"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-5 pr-12 py-3.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2C2421]/50 hover:text-[#2C2421] p-1"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-start pt-2 px-2">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#E85D22] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Primary Action Button (Matches Payoneer Gradient Pill Style) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] hover:from-[#1E293B] hover:to-[#0F172A] text-white font-bold text-sm shadow-lg shadow-[#111827]/20 transition-all flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">
                      login
                    </span>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Row inside Form Card */}
          <div className="pt-6 border-t border-[#2C2421]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#2C2421]/50 font-medium">
            <div>© 2026 BayFlow Auto Repair Inc.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#2C2421] transition-colors">
                Contact Support
              </a>
              <span className="text-[#2C2421]/30">•</span>
              <div className="flex items-center gap-1 hover:text-[#2C2421] cursor-pointer">
                <span>English</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
