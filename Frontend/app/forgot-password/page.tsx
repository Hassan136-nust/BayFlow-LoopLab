"use client";

import { API_BASE_URL } from "@/lib/api";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step 1: 'EMAIL', Step 2: 'RESET'
  const [step, setStep] = useState<"EMAIL" | "RESET">("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Verification code sent! Please check your email inbox.");
        setStep("RESET");
      } else {
        setErrorMsg(data.error || data.message || "Failed to dispatch reset code. Please check your email.");
      }
    } catch (err: any) {
      console.error("Forgot password API error:", err);
      setErrorMsg("Unable to reach BayFlow server. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Password reset successfully! Redirecting to Sign In...");
        setTimeout(() => {
          router.push("/login");
        }, 1200);
      } else {
        setErrorMsg(data.error || data.message || "Invalid or expired OTP code.");
      }
    } catch (err: any) {
      console.error("Reset password API error:", err);
      setErrorMsg("Unable to contact BayFlow server to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4F1] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#111827] selection:text-white">
      {/* Outer Floating Card Container */}
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
          <div className="relative z-10 text-xs sm:text-sm font-medium tracking-wide text-white/70">
            Account recovery and credential management for BayFlow.
          </div>

          {/* Center Main Headline & Car Visual */}
          <div className="relative z-10 my-auto pt-8 pb-4 flex flex-col items-center text-center">
            <h2 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Recover <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white">
                your access
              </span>
            </h2>

            {/* Floating Luxury Car Visual */}
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
          {/* Top Header Row: Brand Logo & Back to Sign In */}
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
                {step === "EMAIL" ? "Reset Password" : "Create New Password"}
              </h1>
              <p className="text-xs sm:text-sm text-[#2C2421]/60">
                {step === "EMAIL"
                  ? "Enter your email address to receive a 6-digit reset code."
                  : `Enter the code sent to ${email} and your new password.`}
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

            {/* STEP 1: REQUEST OTP FORM */}
            {step === "EMAIL" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <input
                    required
                    type="email"
                    placeholder="Enter your registered email (e.g. owner@bayflow.demo)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] hover:from-[#1E293B] hover:to-[#0F172A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#111827]/20 transition-all flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                      <span>Sending Code...</span>
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                        send
                      </span>
                      <span>Send Verification Code</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER OTP & NEW PASSWORD */}
            {step === "RESET" && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                {/* 6-Digit OTP Input */}
                <div>
                  <label className="block text-[11px] font-bold text-[#2C2421]/70 mb-1 px-3">
                    6-DIGIT VERIFICATION CODE
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 849201"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm font-mono tracking-widest text-center text-[#2C2421] placeholder-[#2C2421]/30 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-[#2C2421]/70 mb-1 px-3">
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="New password (8+ chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-[#2C2421]/70 mb-1 px-3">
                    CONFIRM NEW PASSWORD
                  </label>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-full text-xs sm:text-sm text-[#2C2421] placeholder-[#2C2421]/40 focus:outline-none focus:border-[#111827] focus:bg-white transition-all shadow-sm"
                  />
                </div>

                {/* Primary Reset Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] hover:from-[#1E293B] hover:to-[#0F172A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#111827]/20 transition-all flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                      <span>Resetting Password...</span>
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                        lock_reset
                      </span>
                      <span>Save &amp; Update Password</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("EMAIL")}
                    className="text-xs font-semibold text-[#2C2421]/60 hover:text-[#111827] hover:underline"
                  >
                    Change Email or Resend Code
                  </button>
                </div>
              </form>
            )}
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
      </motion.div>
    </div>
  );
}
