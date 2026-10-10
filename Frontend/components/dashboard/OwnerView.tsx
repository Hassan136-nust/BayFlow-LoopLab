"use client";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface OwnerViewProps {
  token: string | null;
  userId?: string;
  email?: string;
}

export default function OwnerView({ token, userId, email }: OwnerViewProps) {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "team" | "services" | "analytics">("overview");

  // Add Shop Modal State
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [newShopForm, setNewShopForm] = useState({ name: "", city: "Lahore", address: "", phone: "" });
  const [shopError, setShopError] = useState("");

  // Add Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: "", password: "", role: "SERVICE_ADVISOR", phoneNumber: "" });
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");

  // Add Service Modal State
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: "", durationMinutes: 60, basePrice: 4000 });
  const [serviceError, setServiceError] = useState("");

  // Loading flags for shop configuration
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [setupModalDismissed, setSetupModalDismissed] = useState(false);
  const [hasShownSetupModal, setHasShownSetupModal] = useState(false);

  // Onboarding Setup Modal State
  const [onboardingTab, setOnboardingTab] = useState<"staff" | "service">("staff");
  const [onboardingStaffForm, setOnboardingStaffForm] = useState({
    email: "",
    password: "",
    role: "SERVICE_ADVISOR",
    phoneNumber: "",
  });
  const [onboardingStaffError, setOnboardingStaffError] = useState("");
  const [onboardingStaffSuccess, setOnboardingStaffSuccess] = useState("");
  const [onboardingStaffSubmitting, setOnboardingStaffSubmitting] = useState(false);

  const [onboardingServiceForm, setOnboardingServiceForm] = useState({
    name: "General Diagnostics & Inspection",
    durationMinutes: 60,
    basePrice: 4500,
  });
  const [onboardingServiceError, setOnboardingServiceError] = useState("");
  const [onboardingServiceSuccess, setOnboardingServiceSuccess] = useState("");
  const [onboardingServiceSubmitting, setOnboardingServiceSubmitting] = useState(false);

  // Role completeness checks for the selected shop
  const hasSA = teamMembers.some((m) => m.role === "SERVICE_ADVISOR");
  const hasTech = teamMembers.some((m) => m.role === "TECHNICIAN");
  const hasParts = teamMembers.some((m) => m.role === "PARTS_PERSON");
  const hasQC = teamMembers.some((m) => m.role === "QC_INSPECTOR");
  const hasServices = services.length >= 1;

  const missingStaffRoles = [
    !hasSA && { key: "SERVICE_ADVISOR", label: "Service Advisor (SA)" },
    !hasTech && { key: "TECHNICIAN", label: "Technician" },
    !hasParts && { key: "PARTS_PERSON", label: "Parts Person" },
    !hasQC && { key: "QC_INSPECTOR", label: "QC Inspector" },
  ].filter(Boolean) as { key: string; label: string }[];

  const isSetupIncomplete =
    !loading &&
    !loadingTeam &&
    !loadingServices &&
    !!selectedShopId &&
    shops.length > 0 &&
    (missingStaffRoles.length > 0 || !hasServices);

  useEffect(() => {
    if (isSetupIncomplete) {
      setHasShownSetupModal(true);
    }
  }, [isSetupIncomplete]);

  useEffect(() => {
    if (missingStaffRoles.length === 0 && !hasServices) {
      setOnboardingTab("service");
    } else if (missingStaffRoles.length > 0) {
      if (!missingStaffRoles.some((r) => r.key === onboardingStaffForm.role)) {
        setOnboardingStaffForm((prev) => ({
          ...prev,
          role: missingStaffRoles[0].key,
        }));
      }
    }
  }, [missingStaffRoles.length, hasServices]);

  useEffect(() => {
    fetchShops();
  }, [token]);

  useEffect(() => {
    if (selectedShopId) {
      setSetupModalDismissed(false);
      setHasShownSetupModal(false);
      setLoadingTeam(true);
      setLoadingServices(true);
      fetchBookings(selectedShopId);
      fetchTeam(selectedShopId);
      fetchServices(selectedShopId);
      fetchAnalytics(selectedShopId);
    }
  }, [selectedShopId]);

  const fetchShops = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const shopList = data.data || data.shops;
      if (res.ok && data.success && Array.isArray(shopList)) {
        // Decode user token to extract shopId if available
        let userShopId = "";
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userShopId = payload.shopId || "";
        } catch (e) {}

        const ownerShops = shopList.filter((s: any) =>
          (userId && (s.ownerId === userId || s.users?.some((u: any) => u.id === userId))) ||
          (userShopId && s.id === userShopId) ||
          (email && s.users?.some((u: any) => u.email?.toLowerCase() === email.toLowerCase()))
        );
        const finalShops = ownerShops.length > 0 ? ownerShops : shopList;
        setShops(finalShops);
        if (finalShops.length > 0) {
          setSelectedShopId((prev) => (prev && finalShops.some((s: any) => s.id === prev) ? prev : finalShops[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch owner shops:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async (shopId: string) => {
    if (!token || !shopId) {
      setLoadingTeam(false);
      return;
    }
    setLoadingTeam(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/team`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": shopId,
        },
      });
      const data = await res.json();
      const teamList = data.data || data.team;
      if (res.ok && data.success && Array.isArray(teamList)) {
        setTeamMembers(teamList);
      } else {
        setTeamMembers([]);
      }
    } catch (err) {
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchServices = async (shopId: string) => {
    if (!shopId) {
      setLoadingServices(false);
      return;
    }
    setLoadingServices(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/services`);
      const data = await res.json();
      const servicesList = data.data || data.services;
      if (res.ok && data.success && Array.isArray(servicesList)) {
        setServices(servicesList);
      } else {
        setServices([]);
      }
    } catch (err) {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchAnalytics = async (shopId: string) => {
    if (!token || !shopId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": shopId,
        },
      });
      const data = await res.json();
      const analyticsData = data.data || data.analytics;
      if (res.ok && data.success) {
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    }
  };

  const fetchBookings = async (shopId: string) => {
    if (!token || !shopId) return;
    setLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings?shopId=${shopId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": shopId,
        },
      });
      const data = await res.json();
      const list = data.data || data.bookings;
      if (res.ok && data.success && Array.isArray(list)) {
        setBookings(list);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn("Bookings fetch error:", err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newShopForm.name,
          city: newShopForm.city,
          address: newShopForm.address,
          phone: newShopForm.phone,
          phoneNumber: newShopForm.phone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddShopModal(false);
        const created = data.data || data.shop;
        setNewShopForm({ name: "", city: "Lahore", address: "", phone: "" });
        await fetchShops();
        if (created?.id) {
          setSelectedShopId(created.id);
        }
      } else {
        setShopError(data.error || data.message || "Failed to create shop branch.");
      }
    } catch (err: any) {
      setShopError(err.message || "Server connection error.");
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setStaffSuccess("");

    if (!selectedShopId) {
      setStaffError("Please select an active shop branch first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${selectedShopId}/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": selectedShopId,
        },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffSuccess(`Staff member created successfully! (${staffForm.email})`);
        setShowAddStaffModal(false);
        setStaffForm({ email: "", password: "", role: "SERVICE_ADVISOR", phoneNumber: "" });
        fetchTeam(selectedShopId);
      } else {
        setStaffError(data.error || data.message || "Failed to add staff member.");
      }
    } catch (err: any) {
      setStaffError(err.message || "Server connection error.");
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError("");
    if (!selectedShopId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${selectedShopId}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": selectedShopId,
        },
        body: JSON.stringify(serviceForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddServiceModal(false);
        setServiceForm({ name: "", durationMinutes: 60, basePrice: 4000 });
        fetchServices(selectedShopId);
      } else {
        setServiceError(data.error || data.message || "Failed to add service item.");
      }
    } catch (err: any) {
      setServiceError(err.message || "Server error.");
    }
  };

  const handleOnboardingAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingStaffError("");
    setOnboardingStaffSuccess("");

    if (!selectedShopId) {
      setOnboardingStaffError("Please select an active shop branch first.");
      return;
    }

    setOnboardingStaffSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${selectedShopId}/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": selectedShopId,
        },
        body: JSON.stringify(onboardingStaffForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOnboardingStaffSuccess(`✓ ${onboardingStaffForm.role} account created successfully!`);
        setOnboardingStaffForm((prev) => ({
          ...prev,
          email: "",
          password: "",
          phoneNumber: "",
        }));
        await fetchTeam(selectedShopId);
      } else {
        setOnboardingStaffError(data.error || data.message || "Failed to add staff member.");
      }
    } catch (err: any) {
      setOnboardingStaffError(err.message || "Server connection error.");
    } finally {
      setOnboardingStaffSubmitting(false);
    }
  };

  const handleOnboardingAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingServiceError("");
    setOnboardingServiceSuccess("");

    if (!selectedShopId) return;

    setOnboardingServiceSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${selectedShopId}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": selectedShopId,
        },
        body: JSON.stringify(onboardingServiceForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOnboardingServiceSuccess(`✓ Service "${onboardingServiceForm.name}" created successfully!`);
        setOnboardingServiceForm({
          name: "",
          durationMinutes: 60,
          basePrice: 4000,
        });
        await fetchServices(selectedShopId);
      } else {
        setOnboardingServiceError(data.error || data.message || "Failed to add service item.");
      }
    } catch (err: any) {
      setOnboardingServiceError(err.message || "Server error.");
    } finally {
      setOnboardingServiceSubmitting(false);
    }
  };

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-xs font-bold text-[#2C2421]">
        <span className="animate-spin material-symbols-outlined text-2xl mb-2 text-[#111827]">progress_activity</span>
        <span>Loading owner multi-shop control center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Owner Header */}
      <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md shadow-[#111827]/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-lg">build_circle</span>
            </div>
            <span className="font-headline text-base font-extrabold tracking-tight text-[#2C2421]">
              BAYFLOW
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">

          {/* Shop Switcher */}
          {shops.length > 0 && (
            <div className="flex items-center gap-2 bg-[#F8F8F5] p-2 rounded-xl border border-[#2C2421]/15">
              <span className="material-symbols-outlined text-base text-[#2C2421]/70 pl-1">store</span>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#2C2421] focus:outline-none cursor-pointer pr-4"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city || "Branch"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowAddShopModal(true)}
            className="px-3.5 py-2 bg-[#111827] text-white text-xs font-bold rounded-xl hover:bg-[#0F172A] cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">add_business</span>
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {shops.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-12 text-center text-xs font-bold text-[#2C2421]/60 space-y-4">
          <p>No shop branches created under your owner account yet.</p>
          <button
            onClick={() => setShowAddShopModal(true)}
            className="px-5 py-2.5 bg-[#111827] text-white rounded-full text-xs font-bold"
          >
            Create Your First Garage Branch
          </button>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#2C2421]/15 shadow-xs">
              <div className="text-xs font-bold text-[#2C2421]/60 uppercase tracking-wider">Active Shop</div>
              <div className="font-headline text-lg font-extrabold text-[#2C2421] mt-1 truncate">{activeShop?.name}</div>
              <div className="text-[11px] font-semibold text-[#1F5C45] mt-1">{activeShop?.address || activeShop?.city || "Branch Location"}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#2C2421]/15 shadow-xs">
              <div className="text-xs font-bold text-[#2C2421]/60 uppercase tracking-wider">Team Roster</div>
              <div className="font-headline text-2xl font-extrabold text-[#2C2421] mt-1">{teamMembers.length} Members</div>
              <div className="text-[11px] text-[#2C2421]/60 mt-1">SA, Techs, Parts, QC</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#2C2421]/15 shadow-xs">
              <div className="text-xs font-bold text-[#2C2421]/60 uppercase tracking-wider">Configured Services</div>
              <div className="font-headline text-2xl font-extrabold text-[#111827] mt-1">{services.length} Items</div>
              <div className="text-[11px] text-[#2C2421]/60 mt-1">Catalog pricing</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#2C2421]/15 shadow-xs">
              <div className="text-xs font-bold text-[#2C2421]/60 uppercase tracking-wider">Live Repairs / Bookings</div>
              <div className="font-headline text-2xl font-extrabold text-[#E85D22] mt-1">{bookings.length} Orders</div>
              <div className="text-[11px] text-[#2C2421]/60 mt-1">Customer appointments</div>
            </div>
          </div> */}

          {/* Tabs */}
          <div className="flex bg-white p-1 rounded-2xl border border-[#2C2421]/15 overflow-x-auto">
            {(["overview", "bookings", "team", "services", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[110px] py-2.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#111827] text-white shadow-xs"
                    : "text-[#2C2421]/70 hover:text-[#2C2421]"
                }`}
              >
                {tab === "bookings" ? "Live Repairs & Bookings" : tab}
              </button>
            ))}
          </div>

          {staffSuccess && (
            <div className="p-3.5 bg-[#1F5C45]/15 border border-[#1F5C45]/30 rounded-2xl text-xs font-bold text-[#1F5C45] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{staffSuccess}</span>
            </div>
          )}

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-4">
              <h3 className="font-headline text-lg font-bold text-[#2C2421]">Branch Operation Details</h3>
              <p className="text-xs text-[#2C2421]/70 leading-relaxed">
                Managing <strong>{activeShop?.name}</strong>. Every team member, inventory item, and booking query is strictly isolated to this shop location.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 space-y-2">
                  <div className="text-xs font-bold text-[#2C2421] flex items-center justify-between">
                    <span>Working Hours Config</span>
                    <span className="text-[10px] bg-[#1F5C45]/10 text-[#1F5C45] px-2 py-0.5 rounded font-mono">ACTIVE</span>
                  </div>
                  <p className="text-xs text-[#2C2421]/60">09:00 AM - 07:00 PM • Slot Duration: 60 mins</p>
                </div>

                <div className="p-4 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 space-y-2">
                  <div className="text-xs font-bold text-[#2C2421] flex items-center justify-between">
                    <span>Tenant ID Scoping</span>
                    <span className="text-[10px] bg-[#111827] text-white px-2 py-0.5 rounded font-mono">{activeShop?.id}</span>
                  </div>
                  <p className="text-xs text-[#2C2421]/60">Database queries strictly scoped server-side.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Live Repairs & Bookings */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2C2421]/10 pb-4 gap-3">
                <div>
                  <h3 className="font-headline text-lg font-bold text-[#2C2421]">
                    Live Repairs &amp; Bookings ({bookings.length})
                  </h3>
                  <p className="text-xs text-[#2C2421]/60 mt-0.5">
                    Real-time vehicle repair lifecycle for <strong>{activeShop?.name}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => selectedShopId && fetchBookings(selectedShopId)}
                    disabled={loadingBookings}
                    className="h-9 px-4 border border-[#2C2421]/15 hover:border-[#111827] text-xs font-semibold text-[#111827] rounded-full hover:bg-[#F8F8F5] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className={`material-symbols-outlined text-base ${loadingBookings ? "animate-spin" : ""}`}>
                      refresh
                    </span>
                    <span>Refresh</span>
                  </button>
                  <div className="h-9 px-4 bg-[#111827] text-white text-xs font-semibold rounded-full flex items-center gap-2 shadow-2xs">
                    <span className="material-symbols-outlined text-base">visibility</span>
                    <span>Executive Oversight Mode</span>
                  </div>
                </div>
              </div>

              {loadingBookings ? (
                <div className="py-12 text-center text-xs font-bold text-[#2C2421]/60">
                  <span className="material-symbols-outlined animate-spin text-2xl mb-2">progress_activity</span>
                  <p>Loading shop repair orders...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#2C2421]/60 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F8F8F5] flex items-center justify-center mx-auto text-[#2C2421]/40">
                    <span className="material-symbols-outlined text-2xl">car_repair</span>
                  </div>
                  <p className="font-bold text-[#2C2421]">No Customer Appointments Yet</p>
                  <p className="max-w-md mx-auto text-[11px] leading-relaxed">
                    When customers choose <strong>{activeShop?.name}</strong> on the booking portal (<Link href="/shops" className="underline font-bold text-[#111827]">/shops</Link>), their appointment and vehicle details will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {bookings.map((booking: any) => {
                    const vehicle = booking.vehicleDetails || {};
                    const customer = booking.customer || {};
                    const tech = booking.technician;
                    const dateFormatted = new Date(booking.slotTime).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const statusStyle =
                      booking.status === "COMPLETED"
                        ? "bg-[#111827] text-white"
                        : booking.status === "ESTIMATE_APPROVED" || booking.status === "READY_FOR_PICKUP"
                        ? "bg-[#1F5C45] text-white"
                        : booking.status === "ESTIMATE_REJECTED" || booking.status === "CANCELLED"
                        ? "bg-[#E85D22] text-white"
                        : "bg-[#111827]/10 text-[#111827] border border-[#111827]/20";

                    return (
                      <div
                        key={booking.id}
                        className="bg-[#F8F8F5] hover:bg-white border border-[#2C2421]/12 hover:border-[#111827]/30 rounded-2xl p-5 transition-all shadow-2xs space-y-3.5"
                      >
                        {/* Top Row: Ref, Status, Date & Financials */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2421]/10 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#111827] bg-white border border-[#2C2421]/15 px-2.5 py-1 rounded-md shadow-2xs">
                              #{booking.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`h-6 px-3 rounded-full text-xs font-semibold uppercase tracking-wide inline-flex items-center justify-center ${statusStyle}`}
                            >
                              {booking.status}
                            </span>
                            <span className="text-xs text-[#2C2421]/60 font-medium inline-flex items-center gap-1.5 ml-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              <span>{dateFormatted}</span>
                            </span>
                          </div>

                          {/* Financials & Role Tag */}
                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C2421]/50 block leading-tight">
                                Estimated Revenue
                              </span>
                              <span className="font-headline text-base font-extrabold text-[#111827] block leading-tight mt-0.5">
                                PKR {(booking.estimateTotal || booking.service?.basePrice || 0).toLocaleString()}
                              </span>
                            </div>
                            <span className="h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide bg-white text-[#111827] border border-[#2C2421]/15 inline-flex items-center justify-center shadow-2xs">
                              SA Managed
                            </span>
                          </div>
                        </div>

                        {/* Vehicle Title & License Plate */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="material-symbols-outlined text-lg text-[#111827]">directions_car</span>
                          <span className="text-sm font-bold text-[#2C2421] capitalize">
                            {vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make || "Vehicle"} {vehicle.model || ""}
                          </span>
                          {vehicle.plate && (
                            <span className="px-2.5 py-0.5 bg-white border border-[#2C2421]/15 rounded-md font-mono text-[11px] font-bold text-[#111827] uppercase tracking-wider shadow-2xs">
                              {vehicle.plate}
                            </span>
                          )}
                        </div>

                        {/* Metadata Footer: Customer, Service, Assigned Technician */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#2C2421]/70 pt-2 border-t border-[#2C2421]/10">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/60">person</span>
                            <span>{customer.email || "Customer"} {customer.phoneNumber ? `(${customer.phoneNumber})` : ""}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/60">build</span>
                            <span>Service: {booking.service?.name || (booking.issuesReported?.[0] || "General Inspection")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/60">engineering</span>
                            <span>Tech: {tech ? (tech.email || "Assigned") : <strong className="text-amber-700">Unassigned</strong>}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Team Roster */}
          {activeTab === "team" && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-4">
                <div>
                  <h3 className="font-headline text-lg font-bold text-[#2C2421]">Shop Staff Roster</h3>
                  <p className="text-xs text-[#2C2421]/60">Manage staff accounts for {activeShop?.name}</p>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="px-4 py-2 bg-[#111827] text-white text-xs font-bold rounded-xl hover:bg-[#0F172A] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span>Add Staff Member</span>
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">
                  No staff accounts created for this shop yet. Click &quot;Add Staff Member&quot; to add team members.
                </div>
              ) : (
                <div className="divide-y divide-[#2C2421]/10 text-xs">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#2C2421] text-sm">{member.email}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#111827]/10 text-[#111827] ml-2">
                          {member.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#1F5C45] bg-[#1F5C45]/10 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Service Catalog */}
          {activeTab === "services" && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-4">
                <div>
                  <h3 className="font-headline text-lg font-bold text-[#2C2421]">Service Catalog Editor</h3>
                  <p className="text-xs text-[#2C2421]/60">Manage pricing and service duration for {activeShop?.name}</p>
                </div>
                <button
                  onClick={() => setShowAddServiceModal(true)}
                  className="px-4 py-2 bg-[#111827] text-white text-xs font-bold rounded-xl hover:bg-[#0F172A] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Add Service Item</span>
                </button>
              </div>

              {services.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">
                  No service items in catalog yet. Add catalog items for customer booking picker.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {services.map((svc) => (
                    <div key={svc.id} className="p-4 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#2C2421] block text-sm">{svc.name}</span>
                        <span className="text-xs font-semibold text-[#1F5C45]">PKR {svc.basePrice?.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-white border border-[#2C2421]/15 px-2 py-0.5 rounded font-bold">
                        {svc.durationMinutes} mins
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Analytics */}
          {activeTab === "analytics" && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-3">
              <h3 className="font-headline text-lg font-bold text-[#2C2421]">Shop Analytics</h3>
              <p className="text-xs text-[#2C2421]/70">Revenue metrics, repair completion turnaround, and quality control fail rates.</p>

              {analytics ? (
                <div className="space-y-4 pt-2">
                  {/* Row 1: Core Financial & Operational KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10">
                      <span className="text-[10px] font-mono font-bold text-[#2C2421]/50 uppercase">Total Revenue</span>
                      <span className="font-headline text-xl font-bold text-[#111827] block mt-1">
                        PKR {analytics.revenue?.toLocaleString() || "0"}
                      </span>
                      <span className="text-[10px] text-[#1F5C45] font-semibold mt-0.5 block">Delivered &amp; Settled</span>
                    </div>

                    <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10">
                      <span className="text-[10px] font-mono font-bold text-[#2C2421]/50 uppercase">Active Workshop Jobs</span>
                      <span className="font-headline text-xl font-bold text-[#0284C7] block mt-1">
                        {analytics.summary?.activeJobs || 0} In Progress
                      </span>
                      <span className="text-[10px] text-[#2C2421]/60 font-medium mt-0.5 block">Intake to Road Test</span>
                    </div>

                    <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10">
                      <span className="text-[10px] font-mono font-bold text-[#2C2421]/50 uppercase">Completed Repairs</span>
                      <span className="font-headline text-xl font-bold text-[#1F5C45] block mt-1">
                        {analytics.completedCount || 0} Vehicles
                      </span>
                      <span className="text-[10px] text-[#2C2421]/60 font-medium mt-0.5 block">100% Turnaround</span>
                    </div>

                    <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10">
                      <span className="text-[10px] font-mono font-bold text-[#2C2421]/50 uppercase">Total Lifetime Bookings</span>
                      <span className="font-headline text-xl font-bold text-[#111827] block mt-1">
                        {analytics.summary?.totalBookings || 0} Orders
                      </span>
                      <span className="text-[10px] text-[#2C2421]/60 font-medium mt-0.5 block">All booking records</span>
                    </div>
                  </div>

                  {/* Row 2: Inventory & Quality Control Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inventory Analytics */}
                    <div className="p-5 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-sm text-[#2C2421]">Inventory Valuation &amp; Stock</span>
                        <span className="text-[10px] font-mono font-bold bg-[#111827]/10 text-[#111827] px-2 py-0.5 rounded">
                          {analytics.inventorySummary?.totalCatalogItems || 0} SKUs Cataloged
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-[#2C2421]/10">
                          <span className="text-[10px] text-[#2C2421]/60 uppercase font-mono font-bold">Total Stock Value</span>
                          <span className="font-headline text-base font-bold text-[#111827] block mt-0.5">
                            PKR {(analytics.inventorySummary?.totalValuationPKR || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#2C2421]/10">
                          <span className="text-[10px] text-[#2C2421]/60 uppercase font-mono font-bold">Low Stock Reorders</span>
                          <span className={`font-headline text-base font-bold block mt-0.5 ${analytics.inventorySummary?.lowStockCount > 0 ? "text-[#E85D22]" : "text-[#1F5C45]"}`}>
                            {analytics.inventorySummary?.lowStockCount || 0} Items
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QC Quality Control Metrics */}
                    <div className="p-5 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-headline font-bold text-sm text-[#2C2421]">Quality Assurance (QC)</span>
                        <span className="text-[10px] font-mono font-bold bg-[#059669]/10 text-[#059669] px-2 py-0.5 rounded">
                          {analytics.qualityControl?.qcPassRatePercent ?? 100}% Pass Rate
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-[#2C2421]/10">
                          <span className="text-[10px] text-[#2C2421]/60 uppercase font-mono font-bold">Road Test Defect Rate</span>
                          <span className="font-headline text-base font-bold text-[#E85D22] block mt-0.5">
                            {analytics.qcFailRate || "0%"}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#2C2421]/10">
                          <span className="text-[10px] text-[#2C2421]/60 uppercase font-mono font-bold">Defect Logs Caught</span>
                          <span className="font-headline text-base font-bold text-[#111827] block mt-0.5">
                            {analytics.qualityControl?.totalQcIssuesLogged || 0} Issues
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10 text-center text-xs text-[#2C2421]/60 font-mono">
                  [Live Analytics Metrics Query Active]
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ADD SHOP MODAL */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Create New Shop Branch</h3>
            {shopError && <div className="p-3 bg-[#E85D22]/10 text-[#E85D22] text-xs font-semibold rounded-xl">{shopError}</div>}
            <form onSubmit={handleCreateShop} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Shop Name *</label>
                <input
                  required
                  type="text"
                  placeholder="Islamabad Auto Care"
                  value={newShopForm.name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">City *</label>
                <input
                  required
                  type="text"
                  placeholder="Islamabad"
                  value={newShopForm.city}
                  onChange={(e) => setNewShopForm({ ...newShopForm, city: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={newShopForm.phone}
                  onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Sector I-9 Industrial Area"
                  value={newShopForm.address}
                  onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddShopModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] text-white font-bold rounded-xl cursor-pointer">
                  Create Shop Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Add Staff Member</h3>
            {staffError && <div className="p-3 bg-[#E85D22]/10 text-[#E85D22] text-xs font-semibold rounded-xl">{staffError}</div>}
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Staff Email *</label>
                <input
                  required
                  type="email"
                  placeholder="tech@bayflow.demo"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Role *</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold text-[#2C2421]"
                >
                  <option value="SERVICE_ADVISOR">Service Advisor (Front Desk)</option>
                  <option value="TECHNICIAN">Technician (Mechanic)</option>
                  <option value="PARTS_PERSON">Parts Person (Inventory)</option>
                  <option value="QC_INSPECTOR">QC Inspector (Quality Control)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Password *</label>
                <input
                  required
                  type="password"
                  placeholder="Password (8+ chars)"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddStaffModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] text-white font-bold rounded-xl cursor-pointer">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SERVICE MODAL */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Add Service Catalog Item</h3>
            {serviceError && <div className="p-3 bg-[#E85D22]/10 text-[#E85D22] text-xs font-semibold rounded-xl">{serviceError}</div>}
            <form onSubmit={handleAddService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Service Name *</label>
                <input
                  required
                  type="text"
                  placeholder="Engine Remap & Tuning"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Base Price (PKR) *</label>
                <input
                  required
                  type="number"
                  value={serviceForm.basePrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={serviceForm.durationMinutes}
                  onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddServiceModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] text-white font-bold rounded-xl cursor-pointer">
                  Add Service Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY SHOP OPERATIONS ONBOARDING MODAL */}
      {selectedShopId && shops.length > 0 && !loading && !loadingTeam && !loadingServices && (isSetupIncomplete || (hasShownSetupModal && !setupModalDismissed)) && (
        <div className="fixed inset-0 z-50 bg-[#111827]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#2C2421]/10 pb-5">
              <div className="flex items-center gap-3">
                {/* <div className="w-12 h-12 rounded-2xl bg-[#111827] text-white flex items-center justify-center font-bold shadow-md">
                  <span className="material-symbols-outlined text-2xl text-amber-400">admin_panel_settings</span>
                </div> */}
                <div>
                  {/* <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Setup Required to Proceed</span>
                  </div> */}
                  <h2 className="font-headline text-xl sm:text-2xl font-bold text-[#2C2421]">
                    Required Operations Setup
                  </h2>
                  <p className="text-xs text-[#2C2421]/70">
                    Branch: <strong className="text-[#111827]">{activeShop?.name || "Selected Shop"}</strong> ({activeShop?.city || "Branch"})
                  </p>
                </div>
              </div>

              {/* Requirements Count Badge */}
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono font-bold text-[#2C2421]/80">
                  {[hasSA, hasTech, hasParts, hasQC, hasServices].filter(Boolean).length} / 5 Ready
                </span>
                <div className="w-24 h-2 bg-[#F4F4F1] rounded-full mt-1.5 overflow-hidden border border-[#2C2421]/10">
                  <div
                    className="h-full bg-[#111827] transition-all duration-300"
                    style={{
                      width: `${([hasSA, hasTech, hasParts, hasQC, hasServices].filter(Boolean).length / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Explanation Notice */}
            <div className="p-3.5 bg-[#F8F8F5] border border-[#2C2421]/10 rounded-2xl text-xs text-[#2C2421]/80 leading-relaxed">
              To operate this shop branch under BayFlow&apos;s workflow, you must assign at least one <strong>Service Advisor</strong>, <strong>Technician</strong>, <strong>Parts Person</strong>, and <strong>QC Inspector</strong>, plus create at least <strong>1 Service Catalog item</strong> before proceeding.
            </div>

            {/* Live Requirements Checklist */}
            {/* <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs"> */}
              {/* SA */}
              {/* <div
                className={`p-3 rounded-2xl border transition-all ${
                  hasSA ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px]">Service Advisor</span>
                  <span className="material-symbols-outlined text-sm">
                    {hasSA ? "check_circle" : "pending"}
                  </span>
                </div>
                <span className="text-[10px] font-medium block">
                  {hasSA ? "✓ Added to Team" : "⚠ Missing (Intake & Quote)"}
                </span>
              </div> */}

              {/* Technician */}
              {/* <div
                className={`p-3 rounded-2xl border transition-all ${
                  hasTech ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px]">Technician</span>
                  <span className="material-symbols-outlined text-sm">
                    {hasTech ? "check_circle" : "pending"}
                  </span>
                </div>
                <span className="text-[10px] font-medium block">
                  {hasTech ? "✓ Added to Team" : "⚠ Missing (Inspection/Repair)"}
                </span>
              </div> */}

              {/* Parts Person */}
              {/* <div
                className={`p-3 rounded-2xl border transition-all ${
                  hasParts ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px]">Parts Person</span>
                  <span className="material-symbols-outlined text-sm">
                    {hasParts ? "check_circle" : "pending"}
                  </span>
                </div>
                <span className="text-[10px] font-medium block">
                  {hasParts ? "✓ Added to Team" : "⚠ Missing (Parts/PO)"}
                </span>
              </div> */}

              {/* QC Inspector */}
              {/* <div
                className={`p-3 rounded-2xl border transition-all ${
                  hasQC ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px]">QC Inspector</span>
                  <span className="material-symbols-outlined text-sm">
                    {hasQC ? "check_circle" : "pending"}
                  </span>
                </div>
                <span className="text-[10px] font-medium block">
                  {hasQC ? "✓ Added to Team" : "⚠ Missing (Quality Pass)"}
                </span>
              </div> */}

              {/* Service Catalog Item */}
              {/* <div
                className={`p-3 rounded-2xl border col-span-2 sm:col-span-2 transition-all ${
                  hasServices ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px]">Catalog Services</span>
                  <span className="material-symbols-outlined text-sm">
                    {hasServices ? "check_circle" : "pending"}
                  </span>
                </div>
                <span className="text-[10px] font-medium block">
                  {hasServices ? `✓ ${services.length} Service item(s) active` : "⚠ Missing (At least 1 service needed)"}
                </span>
              </div> */}
            {/* </div> */}

            {/* Completed Banner if all 5 requirements satisfied */}
            {!isSetupIncomplete ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-xl text-emerald-600">verified</span>
                  <span>All Operational Prerequisites Are Complete!</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Your branch has all 4 staff roles and catalog services ready. You can now enter the owner dashboard to manage bookings, inventory, and operations.
                </p>
                <button
                  type="button"
                  onClick={() => setSetupModalDismissed(true)}
                  className="w-full py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Enter Owner Dashboard</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            ) : (
              <>
                {/* Tab Switcher */}
                <div className="flex bg-[#F4F4F1] p-1 rounded-2xl border border-[#2C2421]/15">
                  <button
                    type="button"
                    onClick={() => setOnboardingTab("staff")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      onboardingTab === "staff"
                        ? "bg-white text-[#111827] shadow-xs"
                        : "text-[#2C2421]/70 hover:text-[#2C2421]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">group_add</span>
                    <span>Add Staff Role</span>
                    {/* {missingStaffRoles.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                        {missingStaffRoles.length}
                      </span>
                    )} */}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnboardingTab("service")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      onboardingTab === "service"
                        ? "bg-white text-[#111827] shadow-xs"
                        : "text-[#2C2421]/70 hover:text-[#2C2421]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">home_repair_service</span>
                    <span>Add Initial Service</span>
                    {!hasServices && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                        1
                      </span>
                    )}
                  </button>
                </div>

                {/* Form: Add Missing Staff Role */}
                {onboardingTab === "staff" && (
                  <form onSubmit={handleOnboardingAddStaff} className="space-y-3.5 text-xs">
                    {onboardingStaffError && (
                      <div className="p-3 bg-[#E85D22]/10 border border-[#E85D22]/20 text-[#E85D22] text-xs font-semibold rounded-xl">
                        {onboardingStaffError}
                      </div>
                    )}
                    {onboardingStaffSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                        {onboardingStaffSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Role to Assign *</label>
                        <select
                          value={onboardingStaffForm.role}
                          onChange={(e) => setOnboardingStaffForm({ ...onboardingStaffForm, role: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold text-[#2C2421] cursor-pointer"
                        >
                          <option value="SERVICE_ADVISOR">
                            Service Advisor {!hasSA ? "(Needed)" : "✓ (Added)"}
                          </option>
                          <option value="TECHNICIAN">
                            Technician {!hasTech ? "(Needed)" : "✓ (Added)"}
                          </option>
                          <option value="PARTS_PERSON">
                            Parts Person {!hasParts ? "(Needed)" : "✓ (Added)"}
                          </option>
                          <option value="QC_INSPECTOR">
                            QC Inspector {!hasQC ? "(Needed)" : "✓ (Added)"}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Staff Email *</label>
                        <input
                          required
                          type="email"
                          placeholder="staff@bayflow.demo"
                          value={onboardingStaffForm.email}
                          onChange={(e) => setOnboardingStaffForm({ ...onboardingStaffForm, email: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Password *</label>
                        <input
                          required
                          type="password"
                          placeholder="Password (8+ chars)"
                          value={onboardingStaffForm.password}
                          onChange={(e) => setOnboardingStaffForm({ ...onboardingStaffForm, password: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Phone Number (Optional)</label>
                        <input
                          type="text"
                          placeholder="+92 300 1234567"
                          value={onboardingStaffForm.phoneNumber}
                          onChange={(e) => setOnboardingStaffForm({ ...onboardingStaffForm, phoneNumber: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={onboardingStaffSubmitting}
                      className="w-full py-3 bg-[#111827] hover:bg-[#0F172A] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {onboardingStaffSubmitting ? "progress_activity" : "person_add"}
                      </span>
                      <span>{onboardingStaffSubmitting ? "Adding Staff Member..." : "Add Staff Member to Team"}</span>
                    </button>
                  </form>
                )}

                {/* Form: Add Initial Service */}
                {onboardingTab === "service" && (
                  <form onSubmit={handleOnboardingAddService} className="space-y-3.5 text-xs">
                    {onboardingServiceError && (
                      <div className="p-3 bg-[#E85D22]/10 border border-[#E85D22]/20 text-[#E85D22] text-xs font-semibold rounded-xl">
                        {onboardingServiceError}
                      </div>
                    )}
                    {onboardingServiceSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                        {onboardingServiceSuccess}
                      </div>
                    )}

                    <div>
                      <label className="block font-bold mb-1 text-[#2C2421]">Service Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Comprehensive Vehicle Diagnostic & Service"
                        value={onboardingServiceForm.name}
                        onChange={(e) => setOnboardingServiceForm({ ...onboardingServiceForm, name: e.target.value })}
                        className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Base Price (PKR) *</label>
                        <input
                          required
                          type="number"
                          value={onboardingServiceForm.basePrice}
                          onChange={(e) => setOnboardingServiceForm({ ...onboardingServiceForm, basePrice: Number(e.target.value) })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-[#2C2421]">Duration (Minutes)</label>
                        <input
                          type="number"
                          value={onboardingServiceForm.durationMinutes}
                          onChange={(e) => setOnboardingServiceForm({ ...onboardingServiceForm, durationMinutes: Number(e.target.value) })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={onboardingServiceSubmitting}
                      className="w-full py-3 bg-[#111827] hover:bg-[#0F172A] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {onboardingServiceSubmitting ? "progress_activity" : "add_circle"}
                      </span>
                      <span>{onboardingServiceSubmitting ? "Creating Service..." : "Add Service to Catalog"}</span>
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
