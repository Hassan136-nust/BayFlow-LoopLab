"use client";

import { API_BASE_URL } from "@/lib/api";
import { setAuthToken, setAuthRole } from "@/lib/auth";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get("email") || "user@bayflow.demo";

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update email if query param changes
  useEffect(() => {
    const qEmail = searchParams?.get("email");
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Focus active digit input
  useEffect(() => {
    if (inputRefs.current[activeIndex]) {
      inputRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const char = cleanVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance
    if (index < 5) {
      setActiveIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        setActiveIndex(index - 1);
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      setActiveIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (pasteData) {
      const pasteArray = pasteData.slice(0, 6).split("");
      const newDigits = [...digits];
      pasteArray.forEach((char, i) => {
        newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextActive = Math.min(pasteArray.length, 5);
      setActiveIndex(nextActive);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
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
        setSuccessMsg("A fresh 6-digit verification code has been dispatched to your email and WhatsApp.");
        setTimer(60);
        setCanResend(false);
      } else {
        setErrorMsg(data.error || data.message || "Failed to resend code. Please try again.");
      }
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setErrorMsg("Network error contacting server. Please check your backend connection.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join("");
    if (otpCode.length < 6) {
      setErrorMsg("Please enter all 6 digits of your verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Account verified successfully! Redirecting to your dashboard...");
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
        }, 800);
      } else {
        setErrorMsg(data.error || data.message || "Invalid or expired OTP code. Please try again.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setErrorMsg(err.message || "Unable to reach BayFlow server for verification. Please verify backend is running.");
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
            Secure two-step authentication for your BayFlow workspace.
          </div>

          {/* Center Main Headline & Car Visual */}
          <div className="relative z-10 my-auto pt-8 pb-4 flex flex-col items-center text-center">
            <h2 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Verify <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white">
                your identity
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
          {/* Top Header Row: Brand Logo & Back to Login */}
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
              <span className="material-symbols-outlined text-base text-[#2C2421]/70">arrow_back</span>
              <span>Back to Sign In</span>
            </Link>
          </div>

          {/* Center Form Container */}
          <div className="w-full max-w-md mx-auto my-auto py-4 space-y-5">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F5C45]/10 text-[#1F5C45] text-xs font-bold mb-2">
                <span className="material-symbols-outlined text-sm">mark_email_read</span>
                <span>OTP Verification</span>
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#2C2421] tracking-tight">
                Enter 6-Digit Code
              </h1>
              <p className="text-xs sm:text-sm text-[#2C2421]/60">
                We sent a temporary verification code to{" "}
                <span className="font-bold text-[#2C2421] bg-[#F4F4F1] px-2 py-0.5 rounded-md font-mono">
                  {email}
                </span>
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

            <form onSubmit={handleVerify} className="space-y-5">
              {/* 6-Digit Inputs Grid */}
              <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
                {digits.map((digit, idx) => {
                  const isCurrent = idx === activeIndex;
                  const isFilled = digit !== "";

                  return (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onFocus={() => setActiveIndex(idx)}
                      className={`h-12 sm:h-14 w-full text-center text-lg sm:text-2xl font-mono font-extrabold rounded-2xl transition-all outline-none ${
                        isCurrent
                          ? "border-2 border-[#111827] bg-white text-[#111827] shadow-md scale-105"
                          : isFilled
                          ? "border border-[#111827]/40 bg-white text-[#111827]"
                          : "border border-[#2C2421]/15 bg-[#F8F8F5] text-[#2C2421]/40"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Resend Timer Box */}
              <div className="bg-[#F8F8F5] border border-[#2C2421]/10 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <span className="text-[#2C2421]/70 font-medium">Didn&apos;t receive the code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-bold text-[#111827] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>Resend Code</span>
                  </button>
                ) : (
                  <span className="text-[#2C2421]/60 font-semibold font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    <span>Resend in {timer}s</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-[#2C2421]/60 bg-[#F4F4F1] p-2.5 rounded-xl border border-[#2C2421]/10 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#111827]">info</span>
                <span>Your 6-digit OTP code has been dispatched to your email and WhatsApp. Please check your inbox &amp; spam folder.</span>
              </div>

              {/* Primary Verify Button */}
              <button
                type="submit"
                disabled={loading || digits.join("").length < 6}
                className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827] hover:from-[#1E293B] hover:to-[#0F172A] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#111827]/20 transition-all flex items-center justify-center gap-2 group hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                    <span>Verifying Code...</span>
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                      lock_open
                    </span>
                    <span>Verify &amp; Continue</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Row */}
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

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#F4F4F1] flex items-center justify-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
