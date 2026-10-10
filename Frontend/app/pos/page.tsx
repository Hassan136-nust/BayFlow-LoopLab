"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StaffPosView from "@/components/dashboard/StaffPosView";

function POSContent() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams?.get("role") || "sa";

  const [activeRole, setActiveRole] = useState<"sa" | "tech" | "parts" | "qc">(
    ["sa", "tech", "parts", "qc"].includes(initialRoleParam)
      ? (initialRoleParam as any)
      : "sa"
  );

  const [token, setToken] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [loadingShops, setLoadingShops] = useState(true);

  // Sync role if url query changes
  useEffect(() => {
    const roleParam = searchParams?.get("role");
    if (roleParam && ["sa", "tech", "parts", "qc"].includes(roleParam)) {
      setActiveRole(roleParam as any);
    }
  }, [searchParams]);

  // Load auth token and available shop branches
  useEffect(() => {
    const storedToken = getAuthToken();
    setToken(storedToken);

    // Decode token to find default shopId if present
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        if (payload.shopId) {
          setSelectedShopId(payload.shopId);
        }
      } catch (e) {
        // ignore decode failure
      }
    }

    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops`);
      const data = await res.json();
      const shopList = data.data || data.shops || [];
      setShops(shopList);
      if (shopList.length > 0) {
        setSelectedShopId((prev) => prev || shopList[0].id);
      }
    } catch (err) {
      console.warn("Error fetching shops list:", err);
    } finally {
      setLoadingShops(false);
    }
  };

  const roleMap: Record<string, string> = {
    sa: "SERVICE_ADVISOR",
    tech: "TECHNICIAN",
    parts: "PARTS_PERSON",
    qc: "QC_INSPECTOR",
    owner: "OWNER",
  };
  const mappedRole = roleMap[activeRole] || "SERVICE_ADVISOR";

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#2C2421] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* Workstation Controls: Shop Selector & Role Switcher */}
        <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] text-white text-xs font-bold">
              <span className="material-symbols-outlined text-sm text-emerald-400">database</span>
              <span>LIVE DATABASE POS WORKSPACE</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#2C2421]">
              Workshop Operations
            </h1>
            <p className="text-xs text-[#2C2421]/70">
              Active Role: <strong className="text-[#111827]">{mappedRole}</strong> • Live PostgreSQL &amp; Redis synchronization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Shop Branch Picker */}
            {shops.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F8F8F5] px-3 py-1.5 rounded-2xl border border-[#2C2421]/15 text-xs font-bold">
                <span className="material-symbols-outlined text-sm text-[#111827]">storefront</span>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="bg-transparent text-[#2C2421] font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city || "Branch"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Role Switcher */}
            <div className="flex bg-[#F4F4F1] p-1 rounded-2xl border border-[#2C2421]/15">
              {[
                { id: "sa", label: "Service Advisor" },
                { id: "tech", label: "Tech" },
                { id: "parts", label: "Parts" },
                { id: "qc", label: "QC" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeRole === r.id
                      ? "bg-[#111827] text-white shadow-xs"
                      : "text-[#2C2421]/70 hover:text-[#2C2421]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Auth status notification */}
        {!token && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-between mb-6 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-600">lock</span>
              <span>
                You are currently viewing POS in unauthenticated preview mode. To interact with live bookings and update job states in the database, please sign in.
              </span>
            </div>
            <Link
              href="/login?redirect=/pos"
              className="px-4 py-1.5 bg-[#111827] text-white rounded-xl text-xs font-bold hover:bg-[#0F172A] transition-all shrink-0"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Live Database StaffPosView Component */}
        <StaffPosView
          key={`${mappedRole}-${selectedShopId}-${token || "anon"}`}
          token={token}
          role={mappedRole}
          shopId={selectedShopId}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-[#2C2421]">Loading POS Workspace...</div>}>
      <POSContent />
    </Suspense>
  );
}
