"use client";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import VoiceCallModal from "@/components/VoiceCallModal";

interface CustomerViewProps {
  token: string | null;
  userId?: string;
  email?: string;
}

export default function CustomerView({ token, userId, email }: CustomerViewProps) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Audit History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vehicle History Modal State
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);
  const [searchPlate, setSearchPlate] = useState("LEA-1234");
  const [loadingVehicleHistory, setLoadingVehicleHistory] = useState(false);

  // Voice Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState<any | null>(null);

  // Selected phase for drill-down step checkout per booking
  const [selectedPhaseByBooking, setSelectedPhaseByBooking] = useState<Record<string, string>>({});

  // Toggle expanded details for completed bookings
  const [expandedCompletedBookings, setExpandedCompletedBookings] = useState<Record<string, boolean>>({});

  const toggleCompletedBooking = (bookingId: string) => {
    setExpandedCompletedBookings((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  useEffect(() => {
    fetchCustomerBookings();
  }, [token]);

  const fetchCustomerBookings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.data || data.bookings;
      if (res.ok && data.success && Array.isArray(list) && list.length > 0) {
        setBookings(list);
      } else {
        // Check for locally synced bookings from Guided Booking Wizard
        const localList = JSON.parse(localStorage.getItem("bayflow_mock_bookings") || "[]");
        if (localList.length > 0) {
          setBookings(localList);
        } else {
          setErrorMsg(data.error || data.message || "No active bookings found for your account.");
        }
      }
    } catch (err: any) {
      console.error("Backend error fetching customer bookings:", err);
      const localList = JSON.parse(localStorage.getItem("bayflow_mock_bookings") || "[]");
      if (localList.length > 0) {
        setBookings(localList);
      } else {
        setErrorMsg("Failed to connect to BayFlow backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingHistory = async (bookingId: string) => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.data || data.history;
      if (res.ok && data.success && Array.isArray(list)) {
        setHistoryLogs(list);
      } else {
        setHistoryLogs([]);
      }
    } catch (err) {
      setHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchVehicleHistory = async (plateNumber: string) => {
    setSearchPlate(plateNumber);
    setShowVehicleModal(true);
    setLoadingVehicleHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/vehicle/${plateNumber}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.data || data.bookings;
      if (res.ok && data.success && Array.isArray(list)) {
        setVehicleHistory(list);
      } else {
        setVehicleHistory([]);
      }
    } catch (err) {
      setVehicleHistory([]);
    } finally {
      setLoadingVehicleHistory(false);
    }
  };

  const handleRespondEstimate = async (bookingId: string, action: "APPROVE" | "REJECT") => {
    setActionSuccess("");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/estimate/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action === "APPROVE" ? "APPROVED" : "REJECTED", action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(
          action === "APPROVE"
            ? "Estimate approved successfully! Workshop notified to begin repair."
            : "Estimate rejected. Service Advisor notified to revise quote."
        );
        fetchCustomerBookings();
      } else {
        setErrorMsg(data.error || data.message || "Failed to submit estimate response.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Server connection error.");
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    setActionSuccess("");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: "Vehicle collected by customer",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess("Vehicle pickup confirmed! Thank you for using BayFlow.");
        fetchCustomerBookings();
      } else {
        setErrorMsg(data.error || data.message || "Failed to complete booking.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Server connection error.");
    }
  };

  const LIFECYCLE_STEPS = [
    { step: 1, status: "PENDING", title: "Intake Review", role: "Service Advisor" },
    { step: 2, status: "CONFIRMED", title: "Confirmed", role: "Service Advisor" },
    { step: 3, status: "ASSIGNED", title: "Tech Assigned", role: "Technician" },
    { step: 4, status: "INSPECTING", title: "Inspection", role: "Technician" },
    { step: 5, status: "ESTIMATE_REVIEW", title: "Estimate Review", role: "Service Advisor" },
    { step: 6, status: "AWAITING_CUSTOMER", title: "Customer Approval", role: "Customer" },
    { step: 7, status: "ESTIMATE_APPROVED", title: "Estimate Approved", role: "Service Advisor" },
    { step: 8, status: "PARTS_PENDING", title: "Parts Sourcing", role: "Parts Person" },
    { step: 9, status: "PARTS_ORDERED", title: "Parts Ordered", role: "Parts Person" },
    { step: 10, status: "PARTS_READY", title: "Parts Allocated", role: "Parts Person" },
    { step: 11, status: "IN_REPAIR", title: "Active Repair", role: "Technician" },
    { step: 12, status: "QC_PENDING", title: "QC Queue", role: "QC Inspector" },
    { step: 13, status: "QC_IN_PROGRESS", title: "QC Road Test", role: "QC Inspector" },
    { step: 14, status: "READY_FOR_PICKUP", title: "Ready for Pickup", role: "Service Advisor" },
    { step: 15, status: "COMPLETED", title: "Completed & Closed", role: "Customer" },
  ];

  const LIFECYCLE_PHASES = [
    {
      id: "intake",
      phaseNumber: 1,
      title: "Intake",
      description: "Booking review & technician assignment",
      icon: "assignment",
      steps: [1, 2, 3],
    },
    {
      id: "estimate",
      phaseNumber: 2,
      title: "Inspection & Estimate",
      description: "Vehicle diagnostics & customer approval",
      icon: "manage_search",
      steps: [4, 5, 6, 7],
    },
    {
      id: "parts",
      phaseNumber: 3,
      title: "Parts Logistics",
      description: "Inventory sourcing & parts allocation",
      icon: "inventory_2",
      steps: [8, 9, 10],
    },
    {
      id: "repair",
      phaseNumber: 4,
      title: "Repair & QC",
      description: "Active mechanical repair & road testing",
      icon: "build",
      steps: [11, 12, 13],
    },
    {
      id: "handover",
      phaseNumber: 5,
      title: "Handover",
      description: "Vehicle collection & booking closure",
      icon: "key",
      steps: [14, 15],
    },
  ];

  const calculateSteps = (currentStatus: string) => {
    const statusOrder = LIFECYCLE_STEPS.map((s) => s.status);
    const currentIndex = statusOrder.indexOf(currentStatus);
    const isCompletedBooking = currentStatus === "COMPLETED";

    return LIFECYCLE_STEPS.map((s, idx) => {
      const isDone = isCompletedBooking ? true : currentIndex > idx;
      const isActive = !isCompletedBooking && s.status === currentStatus;
      const isPending = !isDone && !isActive;

      return {
        ...s,
        done: isDone,
        active: isActive,
        isPending,
      };
    });
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-xs font-bold text-[#2C2421]">
        <span className="animate-spin material-symbols-outlined text-2xl mb-2 text-[#111827]">progress_activity</span>
        <span>Loading live customer portal data from backend...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Profile Header */}
      <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1F5C45]/10 text-[#1F5C45] text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-sm">directions_car</span>
            <span>CUSTOMER PORTAL</span>
          </div> */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md shadow-[#111827]/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-lg">build_circle</span>
            </div>
            <span className="font-headline text-base font-extrabold tracking-tight text-[#2C2421]">
              BAYFLOW
            </span>
          </Link>
          {/* <p className="text-xs sm:text-sm text-[#2C2421]/70 mt-1">
            Account: <strong className="text-[#2C2421]">{email}</strong>
          </p> */}
        </div>

        <Link
          href="/shops"
          className="px-5 py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 shadow-xs"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Book a Service</span>
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-[#1F5C45]/15 border border-[#1F5C45]/30 rounded-2xl text-xs font-bold text-[#1F5C45] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#E85D22]/15 border border-[#E85D22]/30 rounded-2xl text-xs font-bold text-[#E85D22] flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-12 text-center text-xs font-bold text-[#2C2421]/60 space-y-4">
          <p>No active vehicle service bookings found for your account.</p>
          <Link
            href="/shops"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#111827] text-white rounded-full text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Book a Service</span>
          </Link>
        </div>
      ) : (
        bookings.map((booking) => {
          const steps = calculateSteps(booking.status);
          const completedStepsCount = steps.filter((s) => s.done).length;
          const progressPercent = Math.round((completedStepsCount / LIFECYCLE_STEPS.length) * 100);
          const vehiclePlate = booking.vehicleDetails?.plate || "LEA-1234";

          const activeStep = steps.find((s) => s.active);
          const defaultPhase = activeStep
            ? LIFECYCLE_PHASES.find((p) => p.steps.includes(activeStep.step)) || LIFECYCLE_PHASES[0]
            : booking.status === "COMPLETED"
            ? LIFECYCLE_PHASES[4]
            : LIFECYCLE_PHASES[0];

          const selectedPhaseId = selectedPhaseByBooking[booking.id] || defaultPhase.id;
          const selectedPhase = LIFECYCLE_PHASES.find((p) => p.id === selectedPhaseId) || defaultPhase;
          const selectedPhaseSteps = steps.filter((s) => selectedPhase.steps.includes(s.step));

          const isCompleted = booking.status === "COMPLETED" || progressPercent === 100;
          const isExpanded = !isCompleted || !!expandedCompletedBookings[booking.id];

          return (
            <div key={booking.id} className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#2C2421]/10 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    {/* <span className="font-mono text-xs font-bold text-[#111827] bg-[#F4F4F1] px-2 py-0.5 rounded">
                      Ref: {booking.id}
                    </span> */}
                    <button
                      onClick={() => fetchBookingHistory(booking.id)}
                      className="text-[11px] font-bold text-[#111827] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">history</span>
                      <span>Audit Trail</span>
                    </button>
                  </div>
                  <h2 className="font-headline text-xl font-bold text-[#2C2421] mt-1.5">
                    {booking.shop?.name || "Workshop Branch"}
                  </h2>
                  <p className="text-xs text-[#2C2421]/60">
                    {booking.shop?.address || "Main Branch"} • {booking.shop?.phone || "Phone N/A"}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setSelectedBookingForCall(booking);
                      setShowCallModal(true);
                    }}
                    className="h-8 px-3.5 bg-[#1F5C45] hover:bg-[#164433] text-white text-xs font-semibold rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">phone</span>
                    <span>Call Shop</span>
                  </button>

                  <span
                    className={`h-8 px-3.5 rounded-full text-xs font-semibold uppercase tracking-wide inline-flex items-center justify-center ${
                      booking.status === "ESTIMATE_APPROVED"
                        ? "bg-[#1F5C45] text-white"
                        : booking.status === "ESTIMATE_REJECTED"
                        ? "bg-[#E85D22] text-white"
                        : booking.status === "COMPLETED"
                        ? "bg-[#111827] text-white"
                        : "bg-[#111827] text-white"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>

              {/* Completed Service Summary Bar with Dropdown Toggle */}
              {isCompleted && (
                <div className="bg-[#F8F8F5] border border-[#2C2421]/15 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-xl">task_alt</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#111827]">
                          {booking.vehicleDetails?.make} {booking.vehicleDetails?.model} ({booking.vehicleDetails?.year})
                        </span>
                        <span className="font-mono text-[11px] font-bold bg-[#E5E7EB] text-[#111827] px-2 py-0.5 rounded">
                          {vehiclePlate}
                        </span>
                      </div>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        Service Completed • 15 of 15 Steps Finished
                        {booking.estimate?.totalCost ? ` • Total: PKR ${booking.estimate.totalCost.toLocaleString()}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCompletedBooking(booking.id)}
                    className="w-full sm:w-auto h-9 px-4 bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold rounded-full transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>{isExpanded ? "Hide Service Details" : "View Service Details"}</span>
                    <span className="material-symbols-outlined text-base transition-transform duration-200">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>
              )}

              {/* Collapsible Service Details (Vehicle info, 5-phase checkout, and estimate) */}
              {isExpanded && (
                <div className="space-y-6">
                  {/* Vehicle & Reported Issues */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F8F8F5] p-4 rounded-2xl border border-[#2C2421]/10">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[#2C2421]/60 font-medium">Vehicle Details:</span>
                    <button
                      onClick={() => fetchVehicleHistory(vehiclePlate)}
                      className="text-[10px] font-bold text-[#111827] hover:underline cursor-pointer"
                    >
                      Service History
                    </button>
                  </div>
                  <span className="font-bold text-[#2C2421] block">
                    {booking.vehicleDetails?.make} {booking.vehicleDetails?.model} ({booking.vehicleDetails?.year}) • Plate: {vehiclePlate}
                  </span>
                </div>
                <div>
                  <span className="text-[#2C2421]/60 block font-medium mb-0.5">Reported Symptoms:</span>
                  <span className="font-bold text-[#2C2421] block">
                    {Array.isArray(booking.issuesReported) ? booking.issuesReported.join(", ") : booking.issuesReported || "General Maintenance"}
                  </span>
                </div>
              </div>

              {/* Multistep Checkout Lifecycle Component */}
              <div className="space-y-6">
                {/* 5-Phase Horizontal Multistep Checkout Header */}
                <div className="bg-[#F8F8F5] rounded-3xl border border-[#2C2421]/15 p-5 sm:p-7 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2C2421]/10">
                    <div>
                      <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                        Vehicle Lifecycle Checkout
                      </h3>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        5 Macro Journey Phases • Click any phase to inspect its detailed sub-step checkout
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111827]">
                        {completedStepsCount} of 15 Steps Done
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#111827] text-white">
                        {progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* 5-Phase Multistep Track (Matching Reference Image) */}
                  <div className="overflow-x-auto pb-4 pt-2">
                    <div className="flex items-start justify-between min-w-[620px] relative px-4">
                      {LIFECYCLE_PHASES.map((phase, pIdx) => {
                        const phaseSteps = steps.filter((s) => phase.steps.includes(s.step));
                        const isPhaseDone = phaseSteps.every((s) => s.done);
                        const isPhaseActive = phaseSteps.some((s) => s.active) && !isPhaseDone;
                        const isSelected = selectedPhase.id === phase.id;
                        const isLastPhase = pIdx === LIFECYCLE_PHASES.length - 1;

                        // Connecting line between phases
                        const isLineActive = isPhaseDone;

                        return (
                          <div
                            key={phase.id}
                            onClick={() =>
                              setSelectedPhaseByBooking((prev) => ({
                                ...prev,
                                [booking.id]: phase.id,
                              }))
                            }
                            className="flex-1 flex flex-col items-center relative group cursor-pointer"
                          >
                            {/* Horizontal Line connecting to next phase */}
                            {!isLastPhase && (
                              <div
                                className="absolute top-[21px] left-1/2 w-full h-[2.5px] -z-0 transition-colors"
                                style={{
                                  backgroundColor: isLineActive ? "#111827" : "#E5E7EB",
                                }}
                              />
                            )}

                            {/* Circular Node */}
                            {isPhaseDone ? (
                              <div
                                className={`w-11 h-11 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-sm relative z-10 transition-transform group-hover:scale-105 ${
                                  isSelected ? "ring-4 ring-[#111827]/25" : ""
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg">check</span>
                              </div>
                            ) : isPhaseActive ? (
                              <div
                                className={`w-11 h-11 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md ring-4 ring-[#111827]/15 relative z-10 transition-transform group-hover:scale-105 ${
                                  isSelected ? "ring-6 ring-[#111827]/30" : ""
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg">{phase.icon}</span>
                              </div>
                            ) : (
                              <div
                                className={`w-11 h-11 rounded-full bg-white border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center text-xs font-bold relative z-10 transition-transform group-hover:scale-105 ${
                                  isSelected ? "border-[#111827] text-[#111827] ring-4 ring-[#111827]/15" : ""
                                }`}
                              >
                                <span>{phase.phaseNumber}</span>
                              </div>
                            )}

                            {/* Step Label */}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-3 block">
                              PHASE {phase.phaseNumber}
                            </span>

                            {/* Step Title */}
                            <span
                              className={`text-xs sm:text-sm font-bold text-center mt-0.5 leading-snug line-clamp-1 block max-w-[130px] ${
                                isSelected ? "text-[#111827]" : "text-[#2C2421]"
                              }`}
                            >
                              {phase.title}
                            </span>

                            {/* Status Capsule Pill */}
                            {isPhaseDone ? (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#111827]/10 text-[#111827]">
                                Completed
                              </span>
                            ) : isPhaseActive ? (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#111827] text-white shadow-xs">
                                In Progress
                              </span>
                            ) : (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400 border border-gray-200">
                                Pending
                              </span>
                            )}

                            {/* Click / Selection Indicator */}
                            <span
                              className={`mt-1.5 text-[10px] font-bold transition-all ${
                                isSelected
                                  ? "text-[#111827] underline"
                                  : "text-gray-400 opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              {isSelected ? "Viewing Steps" : "Click to view"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Phase Drill-Down Sub-Step Checkout */}
                <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-5 sm:p-7 shadow-xs space-y-6">
                  {/* Sub-step Checkout Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2C2421]/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#111827] text-white">
                          Phase 0{selectedPhase.phaseNumber} Checkout
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-[#111827]">
                          {selectedPhase.title} — Steps
                        </h4>
                      </div>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        {selectedPhase.description} • Click any of the 5 phases above to switch
                      </p>
                    </div>

                    <span
                      className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold ${
                        selectedPhaseSteps.every((s) => s.done)
                          ? "bg-[#111827]/10 text-[#111827]"
                          : selectedPhaseSteps.some((s) => s.active)
                          ? "bg-[#111827] text-white shadow-xs"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {selectedPhaseSteps.every((s) => s.done)
                        ? "Phase Completed"
                        : selectedPhaseSteps.some((s) => s.active)
                        ? "Phase In Progress"
                        : "Phase Pending"}
                    </span>
                  </div>

                  {/* Horizontal Multistep Track for Selected Phase */}
                  <div className="overflow-x-auto pb-4 pt-2">
                    <div className="flex items-start justify-between min-w-[500px] relative px-4">
                      {selectedPhaseSteps.map((s, sIdx) => {
                        const isLastSubStep = sIdx === selectedPhaseSteps.length - 1;
                        const isLineFilled = s.done;

                        return (
                          <div key={s.step} className="flex-1 flex flex-col items-center relative group">
                            {/* Horizontal Line connecting to next sub-step */}
                            {!isLastSubStep && (
                              <div
                                className="absolute top-[18px] left-1/2 w-full h-[2.5px] -z-0 transition-colors"
                                style={{
                                  backgroundColor: isLineFilled ? "#111827" : "#E5E7EB",
                                }}
                              />
                            )}

                            {/* Circular Node */}
                            {s.done ? (
                              <div className="w-9 h-9 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-xs relative z-10 transition-transform group-hover:scale-105">
                                <span className="material-symbols-outlined text-base">check</span>
                              </div>
                            ) : s.active ? (
                              <div className="w-9 h-9 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md ring-4 ring-[#111827]/15 relative z-10 transition-transform group-hover:scale-105">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-white border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center text-xs font-semibold relative z-10 transition-transform group-hover:scale-105">
                                <span>{s.step}</span>
                              </div>
                            )}

                            {/* Step Label */}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2.5 block">
                              STEP {s.step}
                            </span>

                            {/* Step Title */}
                            <span className="text-xs font-bold text-[#111827] text-center mt-0.5 leading-snug line-clamp-1 block max-w-[140px]">
                              {s.title}
                            </span>

                            {/* Role Badge */}
                            <span className="text-[10px] text-[#2C2421]/60 font-medium mt-0.5">
                              {s.role}
                            </span>

                            {/* Status Capsule Pill */}
                            {s.done ? (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#111827]/10 text-[#111827]">
                                Completed
                              </span>
                            ) : s.active ? (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#111827] text-white shadow-xs">
                                In Progress
                              </span>
                            ) : (
                              <span className="mt-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400 border border-gray-200">
                                Pending
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* READY FOR PICKUP ALERT */}
              {booking.status === "READY_FOR_PICKUP" && (
                <div className="p-5 bg-[#1F5C45] text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-3xl">directions_car</span>
                    <div>
                      <h4 className="font-bold text-sm">Your Vehicle is Ready for Pickup!</h4>
                      <p className="text-xs text-white/80">Quality control road test passed. Please visit the shop to collect your vehicle.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteBooking(booking.id)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-[#1F5C45] font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">task_alt</span>
                    <span>Confirm Vehicle Picked Up</span>
                  </button>
                </div>
              )}

              {/* ESTIMATE REVIEW & ITEMIZATION */}
              {booking.estimate && (
                <div className="bg-[#F4F4F1]/70 rounded-2xl border border-[#2C2421]/15 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#2C2421] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#111827]">receipt_long</span>
                      <span>Itemized Technician Estimate</span>
                    </h3>
                    <span className="text-xs text-[#2C2421]/60 font-medium">Submitted by Service Advisor</span>
                  </div>

                  <div className="divide-y divide-[#2C2421]/10 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span>Labour &amp; OBD Scan Diagnostics</span>
                      <span className="font-bold text-[#111827]">PKR {booking.estimate.labourCost?.toLocaleString()}</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span>Required Parts &amp; Replacements</span>
                      <span className="font-bold text-[#111827]">PKR {booking.estimate.partsCost?.toLocaleString()}</span>
                    </div>
                    <div className="pt-3 flex items-center justify-between font-extrabold text-sm text-[#2C2421]">
                      <span>Total Estimated Cost:</span>
                      <span className="text-base text-[#111827]">PKR {booking.estimate.totalCost?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Customer Approval Controls */}
                  {booking.status === "AWAITING_CUSTOMER" && (
                    <div className="pt-3 border-t border-[#2C2421]/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-[#2C2421]/70 font-medium">
                        Please review the breakdown above and accept to authorize repair start.
                      </p>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => handleRespondEstimate(booking.id, "REJECT")}
                          className="w-full sm:w-auto px-4 py-2.5 border border-[#E85D22] text-[#E85D22] hover:bg-[#E85D22]/10 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Reject Estimate
                        </button>
                        <button
                          onClick={() => handleRespondEstimate(booking.id, "APPROVE")}
                          className="w-full sm:w-auto px-6 py-2.5 bg-[#1F5C45] hover:bg-[#164433] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Approve Estimate (PKR {booking.estimate.totalCost?.toLocaleString()})
                        </button>
                      </div>
                    </div>
                  )}

                  {booking.status === "ESTIMATE_APPROVED" && (
                    <div className="p-3 bg-[#1F5C45]/15 border border-[#1F5C45]/30 rounded-xl text-xs font-bold text-[#1F5C45] flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>Estimate authorized by customer. Parts allocation and repair work in progress.</span>
                    </div>
                  )}

                  {booking.status === "ESTIMATE_REJECTED" && (
                    <div className="p-3 bg-[#E85D22]/15 border border-[#E85D22]/30 rounded-xl text-xs font-bold text-[#E85D22] flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">info</span>
                      <span>Estimate rejected. Service Advisor notified to revise quote or cancel booking.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Quick Collapse for completed bookings */}
              {isCompleted && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => toggleCompletedBooking(booking.id)}
                    className="text-xs font-semibold text-[#111827] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Hide Service Details</span>
                    <span className="material-symbols-outlined text-sm">expand_less</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
        })
      )}

      {/* AUDIT HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-3">
              <h3 className="font-headline text-lg font-bold text-[#2C2421]">Booking Audit Log History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="font-bold text-sm text-[#2C2421]/50 cursor-pointer">
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">Fetching audit logs from backend...</div>
            ) : historyLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#2C2421]/60">No history entries logged yet.</div>
            ) : (
              <div className="divide-y divide-[#2C2421]/10 text-xs max-h-72 overflow-y-auto">
                {historyLogs.map((log: any, idx: number) => (
                  <div key={idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#111827]">
                        {log.fromStatus} → {log.toStatus}
                      </span>
                      <span className="text-[10px] text-[#2C2421]/50 font-mono">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}
                      </span>
                    </div>
                    <p className="text-[#2C2421]/70">{log.notes || "Status updated"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VEHICLE HISTORY MODAL */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-3">
              <h3 className="font-headline text-lg font-bold text-[#2C2421]">Vehicle Repair History</h3>
              <button onClick={() => setShowVehicleModal(false)} className="font-bold text-sm text-[#2C2421]/50 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 text-xs font-bold text-[#2C2421]">
              Vehicle Plate: {searchPlate}
            </div>

            {loadingVehicleHistory ? (
              <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">Fetching vehicle history...</div>
            ) : vehicleHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#2C2421]/60">No prior repair history found for this vehicle.</div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
                {vehicleHistory.map((vh: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 space-y-1">
                    <div className="flex justify-between font-bold text-[#111827]">
                      <span>{vh.shop?.name || "Shop Branch"}</span>
                      <span>Status: {vh.status}</span>
                    </div>
                    <p className="text-[#2C2421]/70">
                      Issues: {Array.isArray(vh.issuesReported) ? vh.issuesReported.join(", ") : vh.issuesReported}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VOICE CALL MODAL */}
      <VoiceCallModal
        token={token}
        bookingId={selectedBookingForCall?.id || "BK-9021"}
        recipientName={selectedBookingForCall?.shop?.name || "Service Advisor"}
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
      />
    </div>
  );
}
