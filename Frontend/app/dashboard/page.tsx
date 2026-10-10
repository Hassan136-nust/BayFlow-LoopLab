"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerView from "@/components/dashboard/CustomerView";
import OwnerView from "@/components/dashboard/OwnerView";
import StaffPosView from "@/components/dashboard/StaffPosView";
import NotificationBell from "@/components/NotificationBell";

interface DecodedToken {
  userId: string;
  role: string;
  shopId?: string | null;
  email?: string;
  exp?: number;
  iat?: number;
}

export default function UnifiedDashboardPage() {
  const router = useRouter();
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<DecodedToken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      setRawToken(token);

      const base64Url = token.split(".")[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const parsed = JSON.parse(jsonPayload);
        
        // Check token expiration
        if (parsed.exp && parsed.exp * 1000 < Date.now()) {
          clearAuthToken();
          clearAuthRole();
          router.replace("/login");
          return;
        }

        setTokenData(parsed);
      } else {
        router.replace("/login");
      }
    } catch (err) {
      console.error("Failed to decode auth session token:", err);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleSignOut = () => {
    clearAuthToken();
    clearAuthRole();
    router.replace("/login");
  };

  if (loading || !tokenData) {
    return (
      <div className="min-h-screen bg-[#F4F4F1] flex items-center justify-center p-6 text-xs font-bold text-[#2C2421]">
        <span className="animate-spin material-symbols-outlined text-xl mr-2">progress_activity</span>
        <span>Verifying authenticated session...</span>
      </div>
    );
  }

  const userRole = tokenData.role;

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#2C2421] font-sans selection:bg-[#111827] selection:text-white flex flex-col justify-between">
      {/* Floating Pill Navbar matching Landing Page */}
      <header className="fixed top-5 left-0 w-full z-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto h-14 bg-white/95 backdrop-blur-md border border-[#2C2421]/15 rounded-full shadow-[0_4px_20px_rgba(44,36,33,0.08)] px-4 sm:px-6 flex items-center justify-between">
          {/* Logo & Role Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md shadow-[#111827]/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">build_circle</span>
              </div>
              <span className="font-headline text-base font-extrabold tracking-tight text-[#2C2421]">
                BAYFLOW
              </span>
            </Link>

            <span className="text-[#2C2421]/30 text-xs">|</span>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wider text-[#2C2421]/80">
              {/* <span className="material-symbols-outlined text-xs text-amber-500">badge</span> */}
              <span>ROLE: {userRole}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold text-[#2C2421]/80">
            <Link href="/shops" className="hover:text-[#111827] transition-colors">
              Find Shops &amp; Book
            </Link>
            <Link href="/dashboard" className="text-[#111827] font-extrabold border-b-2 border-[#111827] pb-0.5">
              Unified Dashboard
            </Link>
          </nav>

          {/* User Controls & Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell token={rawToken} />

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#2C2421]/20 hover:bg-[#F4F4F1] hover:border-[#111827] text-xs font-bold text-[#2C2421] transition-all cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Central Role-Enforced View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {userRole === "CUSTOMER" && (
          <CustomerView
            token={rawToken}
            userId={tokenData.userId}
            email={tokenData.email}
          />
        )}

        {userRole === "OWNER" && (
          <OwnerView
            token={rawToken}
            userId={tokenData.userId}
            email={tokenData.email}
          />
        )}

        {["SERVICE_ADVISOR", "TECHNICIAN", "PARTS_PERSON", "QC_INSPECTOR"].includes(userRole) && (
          <StaffPosView
            token={rawToken}
            role={userRole}
            shopId={tokenData.shopId}
          />
        )}
      </main>

      <footer className="w-full py-4 text-center text-xs text-[#2C2421]/50 border-t border-[#2C2421]/10 bg-white">
        © 2026 BayFlow Auto Repair Inc. • Strict RBAC Session ({userRole})
      </footer>
    </div>
  );
}
