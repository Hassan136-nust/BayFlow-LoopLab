"use client";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect } from "react";
import VoiceCallModal from "@/components/VoiceCallModal";
import { formatUserName } from "@/lib/utils";

interface StaffPosViewProps {
  token: string | null;
  role: string;
  shopId?: string | null;
}

// Unified 15-Step Booking Lifecycle (§5.2 & §6)
export const STEP_METADATA: Record<string, { step: number; title: string; actor: string }> = {
  PENDING: { step: 1, title: "Intake Review", actor: "Service Advisor" },
  CONFIRMED: { step: 2, title: "Booking Confirmed", actor: "Service Advisor" },
  ASSIGNED: { step: 3, title: "Tech Assigned", actor: "Technician" },
  INSPECTING: { step: 4, title: "Physical Inspection", actor: "Technician" },
  ESTIMATE_REVIEW: { step: 5, title: "Estimate Review", actor: "Service Advisor" },
  AWAITING_CUSTOMER: { step: 6, title: "Customer Approval", actor: "Customer" },
  ESTIMATE_APPROVED: { step: 7, title: "Estimate Approved", actor: "Service Advisor" },
  PARTS_PENDING: { step: 8, title: "Parts Sourcing", actor: "Parts Person" },
  PARTS_ORDERED: { step: 9, title: "Parts Ordered", actor: "Parts Person" },
  PARTS_READY: { step: 10, title: "Parts In-Stock & Allocated", actor: "Parts Person" },
  IN_REPAIR: { step: 11, title: "Active Repair", actor: "Technician" },
  QC_PENDING: { step: 12, title: "QC Road Test Queue", actor: "QC Inspector" },
  QC_IN_PROGRESS: { step: 13, title: "QC Road Testing", actor: "QC Inspector" },
  READY_FOR_PICKUP: { step: 14, title: "Ready for Pickup", actor: "Service Advisor" },
  COMPLETED: { step: 15, title: "Delivered & Completed", actor: "Customer / SA" },
};

export default function StaffPosView({ token, role, shopId }: StaffPosViewProps) {
  // Lock activeRole strictly to authenticated JWT role prop
  const activeRole = role || "SERVICE_ADVISOR";

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAllocating, setIsAllocating] = useState(false);

  // Assign Tech Modal (Step 2 -> Step 3)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<any>(null);
  const [selectedTechId, setSelectedTechId] = useState("");

  // Tech estimate modal state (Step 4 -> Step 5)
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [selectedBookingForEst, setSelectedBookingForEst] = useState<any>(null);
  const [estimateForm, setEstimateForm] = useState({
    labourCost: 4000,
    partsCost: 12600,
    notes: "Diagnostic inspection completed. Standard service and parts inspection required.",
  });

  // SA Review / Adjust Estimate Modal (Step 5 -> Step 6)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [adjustedLabour, setAdjustedLabour] = useState(3500);

  // QC Fail issue modal state (Step 13 Fail -> Step 11)
  const [showQcModal, setShowQcModal] = useState(false);
  const [selectedBookingForQc, setSelectedBookingForQc] = useState<any>(null);
  const [qcIssueDescription, setQcIssueDescription] = useState("Minor oil leak detected at oil filter seal during road test.");

  // Purchase Order modal state (Step 8 -> Step 9)
  const [showPoModal, setShowPoModal] = useState(false);
  const [poForm, setPoForm] = useState({ inventoryId: "", quantity: 1, partName: "Ignition Coil OEM" });

  // Voice Call Modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTargetCustomer, setCallTargetCustomer] = useState("");
  const [callTargetBookingId, setCallTargetBookingId] = useState("");

  useEffect(() => {
    fetchPosData();
  }, [token, activeRole, shopId]);

  const fetchPosData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const headers: any = { Authorization: `Bearer ${token}` };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const url = shopId ? `${API_BASE_URL}/api/bookings?shopId=${shopId}` : `${API_BASE_URL}/api/bookings`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      const bookingList = data.data || data.bookings;
      if (res.ok && data.success && Array.isArray(bookingList)) {
        setBookings(bookingList);
      } else {
        setBookings([]);
      }

      if (shopId) {
        fetchInventory(shopId);
        fetchPurchaseOrders(shopId);
        fetchTechnicians(shopId);
      }
    } catch (err: any) {
      console.error("POS backend fetch error:", err);
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async (currentShopId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${currentShopId}/team`, {
        headers: { Authorization: `Bearer ${token}`, "X-Shop-Id": currentShopId },
      });
      const data = await res.json();
      const list = data.data || data.team;
      if (res.ok && Array.isArray(list)) {
        const techs = list.filter((u: any) => u.role === "TECHNICIAN");
        setTechnicians(techs);
        if (techs.length > 0) {
          setSelectedTechId((prev) => prev || techs[0].id);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchInventory = async (currentShopId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${currentShopId}/inventory`, {
        headers: { Authorization: `Bearer ${token}`, "X-Shop-Id": currentShopId },
      });
      const data = await res.json();
      const list = data.data || data.inventory;
      if (res.ok && data.success && Array.isArray(list)) {
        setInventory(list);
        // Find 0-stock ignition coil or fallback to first item
        const coil = list.find((i: any) => i.name.toLowerCase().includes("coil") || i.sku.toLowerCase().includes("coil"));
        if (coil) {
          setPoForm((prev) => ({ ...prev, inventoryId: coil.id, partName: coil.name }));
        } else if (list.length > 0) {
          setPoForm((prev) => ({ ...prev, inventoryId: list[0].id, partName: list[0].name }));
        }
      } else {
        setInventory([]);
      }
    } catch (err) {
      setInventory([]);
    }
  };

  const fetchPurchaseOrders = async (currentShopId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${currentShopId}/inventory/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}`, "X-Shop-Id": currentShopId },
      });
      const data = await res.json();
      const list = data.data || data.purchaseOrders;
      if (res.ok && data.success && Array.isArray(list)) {
        setPurchaseOrders(list);
      } else {
        setPurchaseOrders([]);
      }
    } catch (err) {
      setPurchaseOrders([]);
    }
  };

  const handleUpdateStatus = async (bookingId: string, nextStatus: string, note?: string) => {
    setActionMsg("");
    setErrorMsg("");
    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: nextStatus, notes: note || `Transitioned to ${nextStatus}` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const stepNum = STEP_METADATA[nextStatus]?.step || "";
        setActionMsg(`Booking moved to Step ${stepNum}: ${nextStatus}`);
        fetchPosData();
      } else {
        setErrorMsg(data.error || data.message || `Failed to transition status to ${nextStatus}`);
      }
    } catch (err: any) {
      setErrorMsg(`Error updating status: ${err.message}`);
    }
  };

  // Step 2 -> Step 3: SA assigns technician Imran
  const handleAssignTechConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForAssign || !selectedTechId) return;

    setActionMsg("");
    setErrorMsg("");
    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const res = await fetch(`${API_BASE_URL}/api/bookings/${selectedBookingForAssign.id}/assign`, {
        method: "POST",
        headers,
        body: JSON.stringify({ technicianId: selectedTechId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAssignModal(false);
        setActionMsg(`Technician assigned successfully (Moved to Step 3: ASSIGNED)`);
        fetchPosData();
      } else {
        setErrorMsg(data.error || data.message || "Failed to assign technician");
      }
    } catch (err: any) {
      setErrorMsg(`Error assigning technician: ${err.message}`);
    }
  };

  // Step 4 -> Step 5: Technician submits physical inspection estimate (PKR 16,600)
  const handleTechSubmitEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForEst) return;

    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const totalCost = Number(estimateForm.labourCost) + Number(estimateForm.partsCost);
      const res = await fetch(`${API_BASE_URL}/api/bookings/${selectedBookingForEst.id}/estimate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          labourCost: Number(estimateForm.labourCost),
          partsCost: Number(estimateForm.partsCost),
          totalCost: totalCost,
          notes: estimateForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowEstimateModal(false);
        setActionMsg(`Estimate submitted to Service Advisor (Total: PKR ${totalCost.toLocaleString()} -> Step 5: ESTIMATE_REVIEW)`);
        fetchPosData();
      } else {
        setErrorMsg(data.error || data.message || "Failed to submit estimate");
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    }
  };

  // Step 5 -> Step 6: SA adjusts labour to 3,500 and sends to customer (Total: PKR 16,100)
  const handleReviewAndSendEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;

    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const partsCost = selectedBookingForReview.estimate?.partsCost || 12600;
      const totalCost = Number(adjustedLabour) + Number(partsCost);

      // 1. Update revised estimate in DB
      await fetch(`${API_BASE_URL}/api/bookings/${selectedBookingForReview.id}/estimate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          labourCost: Number(adjustedLabour),
          partsCost: Number(partsCost),
          totalCost: totalCost,
          notes: "SA adjusted labour cost to PKR 3,500. Total PKR 16,100.",
        }),
      });

      // 2. Transition to Step 6: AWAITING_CUSTOMER
      const res = await fetch(`${API_BASE_URL}/api/bookings/${selectedBookingForReview.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "AWAITING_CUSTOMER", notes: `Estimate revised to PKR ${totalCost} and sent to customer.` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowReviewModal(false);
        setActionMsg(`Estimate sent to Customer Portal (PKR ${totalCost.toLocaleString()} -> Step 6: AWAITING_CUSTOMER)`);
        fetchPosData();
      } else {
        setErrorMsg(data.error || data.message || "Failed to dispatch estimate to customer");
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    }
  };

  // Step 8 -> Step 9: Usman creates Purchase Order for 1 Ignition Coil OEM
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    try {
      // Pick target inventory ID
      const targetInvId = poForm.inventoryId || inventory.find((i) => i.name.toLowerCase().includes("coil"))?.id || inventory[0]?.id;
      if (!targetInvId) {
        setErrorMsg("Please wait for parts inventory to load or select a part.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/inventory/purchase-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": shopId,
        },
        body: JSON.stringify({ items: [{ inventoryId: targetInvId, quantity: Number(poForm.quantity) }] }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowPoModal(false);
        setActionMsg(`Purchase Order for ${poForm.partName} dispatched successfully.`);
        fetchPurchaseOrders(shopId);

        // Advance any PARTS_PENDING booking to Step 9: PARTS_ORDERED
        const pendingBooking = bookings.find((b) => b.status === "PARTS_PENDING");
        if (pendingBooking) {
          handleUpdateStatus(pendingBooking.id, "PARTS_ORDERED", "Purchase order created for missing parts");
        }
      } else {
        setErrorMsg(data.error || data.message || "Failed to create PO");
      }
    } catch (err: any) {
      setErrorMsg(`Error creating PO: ${err.message}`);
    }
  };

  // Step 9 -> Step 10: Usman confirms delivery (+1 Stock quantity) -> moves to PARTS_READY
  const handleReceivePo = async (poId: string) => {
    if (!shopId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/inventory/purchase-orders/${poId}/receive`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Shop-Id": shopId,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Shipment confirmed! Stock updated (+1 Coil).`);
        fetchInventory(shopId);
        fetchPurchaseOrders(shopId);

        // Advance any PARTS_ORDERED booking to Step 10: PARTS_READY
        const orderedBooking = bookings.find((b) => b.status === "PARTS_ORDERED");
        if (orderedBooking) {
          handleUpdateStatus(orderedBooking.id, "PARTS_READY", "All parts received in workshop. Ready for allocation.");
        }
      } else {
        setErrorMsg(data.error || data.message || "Failed to receive PO");
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    }
  };

  // Step 10 -> Step 11: Usman allocates all 3 parts to booking (stock deducted) -> moves to IN_REPAIR
  const handleAllocateParts = async (bookingId: string) => {
    if (isAllocating) return;
    setIsAllocating(true);
    setActionMsg("");
    setErrorMsg("");
    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      // Select available items in stock (Ignition Coil x1, Oil Filter x1, Engine Oil 4L)
      const itemsToAllocate = inventory
        .filter((inv) => inv.quantity > 0)
        .map((inv) => {
          const lower = inv.name.toLowerCase();
          // Engine Oil (fluid) needs 4L; Ignition Coil and Oil Filter need 1 unit each
          const isEngineOil = (lower.includes("engine oil") || lower.includes("synthetic")) && !lower.includes("coil") && !lower.includes("filter");
          const targetQty = isEngineOil ? 4 : 1;
          return {
            inventoryId: inv.id,
            quantity: Math.min(inv.quantity, targetQty),
          };
        });

      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/parts/allocate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ items: itemsToAllocate.length > 0 ? itemsToAllocate : [{ inventoryId: inventory[0]?.id, quantity: 1 }] }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Parts allocated to booking. Live stock deducted from database (Moved to Step 11: IN_REPAIR).`);
        fetchPosData();
        if (shopId) fetchInventory(shopId);
      } else {
        setErrorMsg(data.error || data.message || "Failed to allocate parts");
      }
    } catch (err: any) {
      setErrorMsg(`Error allocating parts: ${err.message}`);
    } finally {
      setIsAllocating(false);
    }
  };

  // Step 13 (Fail) -> Step 11: Sara finds defect, fails QC -> returns to IN_REPAIR
  const handleQcFailIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForQc) return;

    try {
      const headers: any = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (shopId) headers["X-Shop-Id"] = shopId;

      const res = await fetch(`${API_BASE_URL}/api/bookings/${selectedBookingForQc.id}/qc-issue`, {
        method: "POST",
        headers,
        body: JSON.stringify({ description: qcIssueDescription }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowQcModal(false);
        setActionMsg(`QC Defect logged: "${qcIssueDescription}". Job returned to technician (Step 11: IN_REPAIR).`);
        fetchPosData();
      } else {
        setErrorMsg(data.error || data.message || "Failed to log QC issue");
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    }
  };

  const triggerCallCustomer = (customerName: string, bookingId: string) => {
    setCallTargetCustomer(customerName);
    setCallTargetBookingId(bookingId);
    setShowCallModal(true);
  };

  // Active Parts jobs filter
  const activePartsBookings = bookings.filter((b) =>
    ["PARTS_PENDING", "PARTS_ORDERED", "PARTS_READY"].includes(b.status)
  );
  const upcomingPartsBookings = bookings.filter(
    (b) => !["PARTS_PENDING", "PARTS_ORDERED", "PARTS_READY", "COMPLETED", "CANCELLED"].includes(b.status)
  );

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-xs font-bold text-[#2C2421]">
        <span className="animate-spin material-symbols-outlined text-2xl mb-2 text-[#111827]">progress_activity</span>
        <span>Loading workshop operations for {activeRole}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-[#111827] text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-sm">point_of_sale</span>
            <span>GARAGE SHOP POS WORKSTATION</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white">
            Console: {activeRole.replace("_", " ")}
          </h1>
          {/* <p className="text-xs text-white/70 mt-1">
            Access locked to authenticated role <strong className="text-white">({activeRole})</strong>.
          </p> */}
        </div>

        {/* <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/15 text-xs font-mono font-bold">
          Shop Scope: {shopId ? `${shopId.slice(0, 18)}...` : "Isolated Scope"}
        </div> */}
      </div>

      {actionMsg && (
        <div className="p-4 bg-[#1F5C45]/15 border border-[#1F5C45]/30 rounded-2xl text-xs font-bold text-[#1F5C45] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg("")} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#E85D22]/15 border border-[#E85D22]/30 rounded-2xl text-xs font-bold text-[#E85D22] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ================= ROLE 1: SERVICE ADVISOR CONSOLE (BILAL) ================= */}
      {activeRole === "SERVICE_ADVISOR" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-4">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#2C2421]">Service Advisor Intake &amp; Coordination</h3>
                <p className="text-xs text-[#2C2421]/60 mt-0.5">Step 1 (Intake Review), Step 2 (Assign Tech), Step 5 (Send Estimate), Step 7 (Assign Parts), Step 14 (Ready For Pickup)</p>
              </div>
              <span className="h-8 px-3.5 bg-[#111827] text-white text-xs font-semibold rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                {bookings.length} Bookings
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">
                No active bookings in the shop intake queue currently.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {bookings.map((b) => {
                  const stepMeta = STEP_METADATA[b.status] || { step: "-", title: b.status };

                  const statusStyle =
                    b.status === "COMPLETED"
                      ? "bg-[#111827] text-white"
                      : b.status === "ESTIMATE_APPROVED" || b.status === "READY_FOR_PICKUP"
                      ? "bg-[#1F5C45] text-white"
                      : b.status === "ESTIMATE_REJECTED" || b.status === "CANCELLED"
                      ? "bg-[#E85D22] text-white"
                      : "bg-[#111827]/10 text-[#111827] border border-[#111827]/20";

                  return (
                    <div
                      key={b.id}
                      className="bg-[#F8F8F5] hover:bg-white border border-[#2C2421]/12 hover:border-[#111827]/30 rounded-2xl p-5 transition-all shadow-2xs space-y-4"
                    >
                      {/* Card Top: Ref, Status, Step, and Call Customer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2421]/10 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#111827] bg-white border border-[#2C2421]/15 px-2.5 py-1 rounded-md shadow-2xs">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`h-6 px-3 rounded-full text-xs font-semibold uppercase tracking-wide inline-flex items-center justify-center ${statusStyle}`}
                          >
                            {b.status}
                          </span>
                          <span className="h-6 px-2.5 rounded-full text-[11px] font-bold bg-[#111827]/5 text-[#111827] border border-[#111827]/10 inline-flex items-center">
                            Step {stepMeta.step}: {stepMeta.title}
                          </span>
                        </div>

                        {/* Top Right: Call Customer Action */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => triggerCallCustomer(b.customer?.email || "Customer", b.id)}
                            className="h-8 px-3.5 bg-[#1F5C45] hover:bg-[#164433] text-white text-xs font-semibold rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">phone</span>
                            <span>Call Customer</span>
                          </button>
                        </div>
                      </div>

                      {/* Vehicle & Customer Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Vehicle Title & License Plate */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="material-symbols-outlined text-lg text-[#111827]">directions_car</span>
                          <span className="text-sm font-bold text-[#2C2421] capitalize">
                            {b.vehicleDetails?.year || "2016"} {b.vehicleDetails?.make || "Honda"} {b.vehicleDetails?.model || "Civic"}
                          </span>
                          {b.vehicleDetails?.plate && (
                            <span className="px-2.5 py-0.5 bg-white border border-[#2C2421]/15 rounded-md font-mono text-[11px] font-bold text-[#111827] uppercase tracking-wider shadow-2xs">
                              {b.vehicleDetails.plate}
                            </span>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-1.5 text-xs text-[#2C2421]/80">
                          <span className="material-symbols-outlined text-sm text-[#2C2421]/60">person</span>
                          <span className="font-semibold text-[#2C2421]">{formatUserName(b.customer, "Customer")}</span>
                          {b.customer?.email && (
                            <span className="text-[#2C2421]/50 text-[11px]">({b.customer.email})</span>
                          )}
                        </div>
                      </div>

                      {/* Reported Symptoms */}
                      <div className="p-3 bg-white rounded-xl border border-[#2C2421]/10 text-xs text-[#2C2421]/80">
                        <span className="font-bold text-[#2C2421] block mb-0.5">Reported Symptoms:</span>
                        <p className="leading-relaxed">
                          {Array.isArray(b.issuesReported) ? b.issuesReported.join(", ") : b.issuesReported || "Check engine light, car vibrates at idle"}
                        </p>
                      </div>

                      {/* SA Step Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2C2421]/10">
                        {/* Step 1 -> Step 2: Confirm Booking */}
                        {b.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              <span>Confirm Booking (Move to Step 2: CONFIRMED)</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(b.id, "CANCELLED")}
                              className="px-4 py-2 border border-[#E85D22] text-[#E85D22] hover:bg-[#E85D22]/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {/* Step 2 -> Step 3: Assign Technician Imran */}
                        {b.status === "CONFIRMED" && (
                          <button
                            onClick={() => {
                              setSelectedBookingForAssign(b);
                              setShowAssignModal(true);
                            }}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">person_add</span>
                            <span>Assign Technician (Move to Step 3: ASSIGNED)</span>
                          </button>
                        )}

                        {/* Step 5 -> Step 6: SA Reviews, adjusts labour and sends to customer */}
                        {b.status === "ESTIMATE_REVIEW" && (
                          <button
                            onClick={() => {
                              setSelectedBookingForReview(b);
                              setAdjustedLabour(b.estimate?.labourCost || 3500);
                              setShowReviewModal(true);
                            }}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">edit_note</span>
                            <span>Review &amp; Send Estimate to Customer (Move to Step 6)</span>
                          </button>
                        )}

                        {/* Step 7 -> Step 8: SA Assigns Parts Department */}
                        {b.status === "ESTIMATE_APPROVED" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "PARTS_PENDING", "SA assigned Parts Department.")}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">handyman</span>
                            <span>Assign Parts Person (Move to Step 8: PARTS_PENDING)</span>
                          </button>
                        )}

                        {/* Step 14 -> Step 15: Complete Pick-up */}
                        {b.status === "READY_FOR_PICKUP" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "COMPLETED", "Customer collected vehicle. Booking completed.")}
                            className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">task_alt</span>
                            <span>Vehicle Picked Up - Close Booking (Move to Step 15: COMPLETED)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ROLE 2: TECHNICIAN CONSOLE (IMRAN) ================= */}
      {activeRole === "TECHNICIAN" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-4">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#2C2421]">Technician Repair Floor</h3>
                <p className="text-xs text-[#2C2421]/60 mt-0.5">Step 3 &amp; 4 (Inspection &amp; Estimate), Step 11 (Repair &amp; Dispatch to QC)</p>
              </div>
              <span className="h-8 px-3.5 bg-[#111827] text-white text-xs font-semibold rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                Mechanic Console
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">
                No active repair jobs in queue currently.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {bookings.map((b) => {
                  const stepMeta = STEP_METADATA[b.status] || { step: "-", title: b.status };

                  const statusStyle =
                    b.status === "COMPLETED"
                      ? "bg-[#111827] text-white"
                      : b.status === "ESTIMATE_APPROVED" || b.status === "READY_FOR_PICKUP"
                      ? "bg-[#1F5C45] text-white"
                      : b.status === "ESTIMATE_REJECTED" || b.status === "CANCELLED"
                      ? "bg-[#E85D22] text-white"
                      : "bg-[#111827]/10 text-[#111827] border border-[#111827]/20";

                  return (
                    <div
                      key={b.id}
                      className="bg-[#F8F8F5] hover:bg-white border border-[#2C2421]/12 hover:border-[#111827]/30 rounded-2xl p-5 transition-all shadow-2xs space-y-4"
                    >
                      {/* Card Top: Ref, Status, Step, and Estimate */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2421]/10 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#111827] bg-white border border-[#2C2421]/15 px-2.5 py-1 rounded-md shadow-2xs">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`h-6 px-3 rounded-full text-xs font-semibold uppercase tracking-wide inline-flex items-center justify-center ${statusStyle}`}
                          >
                            {b.status}
                          </span>
                          <span className="h-6 px-2.5 rounded-full text-[11px] font-bold bg-[#111827]/5 text-[#111827] border border-[#111827]/10 inline-flex items-center">
                            Step {stepMeta.step}: {stepMeta.title}
                          </span>
                        </div>

                        {b.estimateTotal ? (
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C2421]/50 block leading-tight">
                              Estimate Value
                            </span>
                            <span className="font-headline text-base font-extrabold text-[#111827] block leading-tight mt-0.5">
                              PKR {b.estimateTotal.toLocaleString()}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Vehicle Info & License Plate */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="material-symbols-outlined text-lg text-[#111827]">directions_car</span>
                        <span className="text-sm font-bold text-[#2C2421] capitalize">
                          {b.vehicleDetails?.year || "2016"} {b.vehicleDetails?.make || "Honda"} {b.vehicleDetails?.model || "Civic"}
                        </span>
                        {b.vehicleDetails?.plate && (
                          <span className="px-2.5 py-0.5 bg-white border border-[#2C2421]/15 rounded-md font-mono text-[11px] font-bold text-[#111827] uppercase tracking-wider shadow-2xs">
                            {b.vehicleDetails.plate}
                          </span>
                        )}
                      </div>

                      {/* Reported Symptoms */}
                      <div className="p-3 bg-white rounded-xl border border-[#2C2421]/10 text-xs text-[#2C2421]/80">
                        <span className="font-bold text-[#2C2421] block mb-0.5">Reported Symptoms:</span>
                        <p className="leading-relaxed">
                          {Array.isArray(b.issuesReported) ? b.issuesReported.join(", ") : b.issuesReported || "Light came on yesterday, car vibrates at idle."}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2C2421]/10">
                        {/* Step 3 -> Step 4: Start Physical Inspection */}
                        {b.status === "ASSIGNED" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "INSPECTING", "Technician started physical vehicle inspection.")}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">search</span>
                            <span>Start Physical Inspection (Move to Step 4: INSPECTING)</span>
                          </button>
                        )}

                        {/* Step 4 -> Step 5: Submit estimate */}
                        {b.status === "INSPECTING" && (
                          <button
                            onClick={() => {
                              setSelectedBookingForEst(b);
                              setShowEstimateModal(true);
                            }}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                            <span>Submit Diagnosis &amp; Estimate Line Items (Move to Step 5: ESTIMATE_REVIEW)</span>
                          </button>
                        )}

                        {/* Step 11 -> Step 12: Repair car, dispatch to QC */}
                        {b.status === "IN_REPAIR" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "QC_PENDING", "Technician completed repair work. Dispatched to QC queue.")}
                            className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">speed</span>
                            <span>Complete Repair &amp; Dispatch to QC (Move to Step 12: QC_PENDING)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ROLE 3: PARTS PERSON CONSOLE (USMAN) ================= */}
      {activeRole === "PARTS_PERSON" && (
        <div className="space-y-6">
          {/* Workshop Inventory Stock Catalog */}
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#2C2421]">Workshop Inventory Stock</h3>
                <p className="text-xs text-[#2C2421]/60">Step 8 (Check Stock &amp; Source Parts), Step 9 (Parts Ordered), Step 10 (Receive &amp; Allocate)</p>
              </div>
              <button
                onClick={() => {
                  const coil = inventory.find((i) => i.name.toLowerCase().includes("coil") || i.sku.toLowerCase().includes("coil")) || inventory[0];
                  if (coil) {
                    setPoForm({ inventoryId: coil.id, quantity: 1, partName: coil.name });
                  }
                  setShowPoModal(true);
                }}
                className="px-4 py-2 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">shopping_cart</span>
                <span>Create Purchase Order (Step 9)</span>
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-[#2C2421]/60">
                Loading shop catalog parts...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2C2421]/10 text-[#2C2421]/60 uppercase font-mono">
                      <th className="pb-2">SKU</th>
                      <th className="pb-2">Part Name</th>
                      <th className="pb-2">Qty on Hand</th>
                      <th className="pb-2">Unit Price</th>
                      <th className="pb-2 text-right">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2421]/10">
                    {inventory.map((item) => (
                      <tr key={item.id} className="py-2">
                        <td className="py-2.5 font-mono font-bold text-[#111827]">{item.sku}</td>
                        <td className="py-2.5 font-bold text-[#2C2421]">{item.name}</td>
                        <td className="py-2.5 font-bold">{item.quantity} units</td>
                        <td className="py-2.5">PKR {item.unitPrice?.toLocaleString()}</td>
                        <td className="py-2.5 text-right">
                          {item.quantity > 0 ? (
                            <span className="bg-[#1F5C45]/10 text-[#1F5C45] px-2.5 py-0.5 rounded-full font-bold">
                              ✓ In Stock
                            </span>
                          ) : (
                            <span className="bg-[#E85D22]/15 text-[#E85D22] border border-[#E85D22]/30 px-2.5 py-0.5 rounded-full font-bold">
                              ⚠ Shortage (0 Stock - Order Required)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section A: Active Jobs Requiring Parts Processing */}
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-3">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#2C2421]">Active Jobs Sourcing Parts</h3>
                <p className="text-xs text-[#2C2421]/60">Bookings currently in Parts Floor steps (Step 8: Sourcing, Step 9: Ordered, Step 10: Ready)</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#111827] text-white">
                {activePartsBookings.length} Active
              </span>
            </div>

            {activePartsBookings.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#2C2421]/60 space-y-1">
                <p className="font-bold text-[#2C2421]">No vehicles currently in active parts sourcing stage.</p>
                <p className="text-[11px]">
                  When a customer accepts an estimate (Step 6) and SA authorizes parts (Step 7), jobs appear here for stock allocation.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2C2421]/10 text-xs">
                {activePartsBookings.map((b) => {
                  const stepMeta = STEP_METADATA[b.status] || { step: "-", title: b.status };

                  return (
                    <div key={b.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#111827] bg-[#F4F4F1] px-2 py-0.5 rounded">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="font-bold text-xs text-[#2C2421]">
                            {b.vehicleDetails?.make} {b.vehicleDetails?.model} ({b.vehicleDetails?.plate || "LEA-1234"})
                          </span>
                          <span className="bg-[#111827]/10 text-[#111827] text-[10px] font-extrabold px-2 py-0.5 rounded">
                            Step {stepMeta.step}: {stepMeta.title}
                          </span>
                        </div>
                        {(() => {
                          const coil = inventory.find((i) => i.name.toLowerCase().includes("coil") || i.sku.toLowerCase().includes("coil"));
                          const coilQty = coil?.quantity ?? 0;
                          return (
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#2C2421]/70 mt-1">
                              <span className="font-semibold text-[#2C2421]">Parts List:</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${coilQty > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                Ignition Coil x1 ({coilQty > 0 ? `In Stock: ${coilQty}` : "Missing"})
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Oil Filter x1 (In Stock)
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Engine Oil 4L (In Stock)
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Step 8 -> Step 9: Missing coil, create PO (or direct advance if in stock) */}
                        {b.status === "PARTS_PENDING" && (
                          <>
                            {inventory.some((i) => (i.name.toLowerCase().includes("coil") || i.sku.toLowerCase().includes("coil")) && i.quantity > 0) && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, "PARTS_READY", "Parts already available in workshop inventory.")}
                                className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                <span>Parts In-Stock &rarr; Move to Step 10: PARTS_READY</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const coil = inventory.find((i) => i.name.toLowerCase().includes("coil") || i.sku.toLowerCase().includes("coil")) || inventory[0];
                                if (coil) {
                                  setPoForm({ inventoryId: coil.id, quantity: 1, partName: coil.name });
                                }
                                setShowPoModal(true);
                              }}
                              className="px-4 py-2 bg-[#111827] hover:bg-[#0F172A] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                              <span>Order Missing Ignition Coil (Move to Step 9: PARTS_ORDERED)</span>
                            </button>
                          </>
                        )}

                        {/* Step 9: Awaiting PO delivery or Advance to PARTS_READY / IN_REPAIR */}
                        {b.status === "PARTS_ORDERED" && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleUpdateStatus(b.id, "PARTS_READY", "Parts delivered to workshop. Ready for allocation.")}
                              className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">inventory_2</span>
                              <span>Confirm Parts In Workshop &rarr; Move to Step 10: PARTS_READY</span>
                            </button>
                            <button
                              onClick={() => handleAllocateParts(b.id)}
                              disabled={isAllocating}
                              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                            >
                              <span className={`material-symbols-outlined text-sm ${isAllocating ? "animate-spin" : ""}`}>
                                {isAllocating ? "progress_activity" : "fact_check"}
                              </span>
                              <span>{isAllocating ? "Allocating Parts..." : "Allocate Stock \u2192 Step 11: IN_REPAIR"}</span>
                            </button>
                          </div>
                        )}

                        {/* Step 10 -> Step 11: Parts Ready, allocate stock to job */}
                        {b.status === "PARTS_READY" && (
                          <button
                            onClick={() => handleAllocateParts(b.id)}
                            disabled={isAllocating}
                            className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                          >
                            <span className={`material-symbols-outlined text-sm ${isAllocating ? "animate-spin" : ""}`}>
                              {isAllocating ? "progress_activity" : "inventory"}
                            </span>
                            <span>{isAllocating ? "Allocating Parts..." : "Allocate 3 Parts to Booking (Stock Deducted \u2192 Step 11: IN_REPAIR)"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Incoming Workshop Jobs Pipeline (Earlier Steps) */}
          {upcomingPartsBookings.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-2">
                <div>
                  <h4 className="font-headline text-sm font-bold text-[#2C2421]">Upcoming Shop Floor Pipeline (Before Parts Stage)</h4>
                  <p className="text-[11px] text-[#2C2421]/60">Vehicles in Intake, Inspection, or Quote stages that will reach Parts once approved.</p>
                </div>
                <span className="text-xs text-[#2C2421]/60 font-mono font-bold">{upcomingPartsBookings.length} Jobs</span>
              </div>

              <div className="divide-y divide-[#2C2421]/10 text-xs">
                {upcomingPartsBookings.map((b) => {
                  const stepMeta = STEP_METADATA[b.status] || { step: "-", title: b.status, actor: "Staff" };

                  return (
                    <div key={b.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#111827]">#{b.id.slice(0, 8).toUpperCase()}</span> - {b.vehicleDetails?.make} {b.vehicleDetails?.model} ({b.vehicleDetails?.plate || "Plate N/A"})
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F4F1] text-[#2C2421]/70">
                          Step {stepMeta.step}: {stepMeta.title} ({stepMeta.actor})
                        </span>
                      </div>

                      {/* If SA already has estimate approved, quick pull into parts */}
                      {b.status === "ESTIMATE_APPROVED" ? (
                        <button
                          onClick={() => handleUpdateStatus(b.id, "PARTS_PENDING", "Parts department pulled job into Parts Sourcing queue.")}
                          className="px-3 py-1 bg-[#111827] text-white rounded-lg text-[11px] font-bold hover:bg-[#0F172A] cursor-pointer"
                        >
                          Pull into Step 8: PARTS_PENDING
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#2C2421]/50 italic">
                          Awaiting {stepMeta.actor}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section C: Purchase Orders List (Step 9 & Step 10: Confirm Receipt) */}
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 shadow-xs space-y-3">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Active Supplier Purchase Orders</h3>
            {purchaseOrders.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#2C2421]/60">No purchase orders created yet.</div>
            ) : (
              <div className="divide-y divide-[#2C2421]/10 text-xs">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[#111827]">PO #{po.id.slice(0, 8).toUpperCase()}</span>
                      <p className="text-[11px] text-[#2C2421]/70">
                        Items: {po.items?.map((it: any) => `${it.inventory?.name || "Part"} (Qty: ${it.quantity})`).join(", ") || "1x Ignition Coil"}
                      </p>
                    </div>

                    <div>
                      {po.status === "ORDERED" ? (
                        <button
                          onClick={() => handleReceivePo(po.id)}
                          className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">inventory_2</span>
                          <span>Confirm PO Delivery (+1 Stock &rarr; Move to Step 10: PARTS_READY)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="bg-[#1F5C45]/10 text-[#1F5C45] px-2.5 py-1 rounded-full font-bold">
                            ✓ Received &amp; Added to Stock
                          </span>
                          {bookings.some((b) => b.status === "PARTS_ORDERED") && (
                            <button
                              onClick={() => {
                                const target = bookings.find((bk) => bk.status === "PARTS_ORDERED");
                                if (target) handleUpdateStatus(target.id, "PARTS_READY", "Parts verified in stock from received PO.");
                              }}
                              className="px-3 py-1 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs transition-all"
                            >
                              <span className="material-symbols-outlined text-xs">done_all</span>
                              <span>Advance Waiting Job &rarr; Step 10: PARTS_READY</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ROLE 4: QC INSPECTOR CONSOLE (SARA) ================= */}
      {activeRole === "QC_INSPECTOR" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#2C2421]">Quality Control Road Test Queue</h3>
                <p className="text-xs text-[#2C2421]/60">Step 12 (QC Queue Claim), Step 13 (Road Testing / Defect Logging), Step 14 (Ready For Pickup)</p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#059669] text-white px-3 py-1 rounded-full">
                Inspector Console
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60">
                No vehicles awaiting QC road test currently.
              </div>
            ) : (
              <div className="divide-y divide-[#2C2421]/10 text-xs">
                {bookings.map((b) => {
                  const stepMeta = STEP_METADATA[b.status] || { step: "-", title: b.status };

                  return (
                    <div key={b.id} className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#111827] bg-[#F4F4F1] px-2 py-0.5 rounded">
                              #{b.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="font-bold text-xs text-[#2C2421]">
                              {b.vehicleDetails?.year || "2016"} {b.vehicleDetails?.make} {b.vehicleDetails?.model} ({b.vehicleDetails?.plate || "LEA-1234"})
                            </span>
                            <span className="bg-[#059669]/10 text-[#059669] text-[10px] font-extrabold px-2 py-0.5 rounded">
                              Step {stepMeta.step}: {stepMeta.title}
                            </span>
                          </div>
                          <p className="text-[#2C2421]/60 mt-0.5">Status: {b.status}</p>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#059669] text-white">
                          {b.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        {/* Step 12 -> Step 13: Pick up job from queue */}
                        {b.status === "QC_PENDING" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "QC_IN_PROGRESS", "QC Inspector claimed vehicle for road testing.")}
                            className="px-4 py-2 bg-[#111827] hover:bg-[#0F172A] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span className="material-symbols-outlined text-base">directions_car</span>
                            <span>Claim &amp; Start Road Test (Move to Step 13: QC_IN_PROGRESS)</span>
                          </button>
                        )}

                        {/* Step 13 -> Step 14 (Pass) or Step 11 (Fail) */}
                        {b.status === "QC_IN_PROGRESS" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(b.id, "READY_FOR_PICKUP", "QC Passed - All tests clear. Vehicle roadworthy.")}
                              className="px-4 py-2 bg-[#1F5C45] hover:bg-[#164433] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-base">verified</span>
                              <span>Pass QC Road Test (Move to Step 14: READY_FOR_PICKUP)</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedBookingForQc(b);
                                setShowQcModal(true);
                              }}
                              className="px-4 py-2 border border-[#E85D22] text-[#E85D22] hover:bg-[#E85D22]/10 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">warning</span>
                              <span>Find Minor Oil Leak (Fail QC &rarr; Step 11: IN_REPAIR)</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL (STEP 2 -> STEP 3) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Assign Shop Technician</h3>
            <p className="text-xs text-[#2C2421]/70">
              Select the certified mechanic to physically inspect and repair this vehicle (Move to Step 3: ASSIGNED).
            </p>
            <form onSubmit={handleAssignTechConfirm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Technician *</label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold cursor-pointer"
                >
                  {technicians.length > 0 ? (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatUserName(t, "Technician")} ({t.email})
                      </option>
                    ))
                  ) : (
                    <option value="default-tech">Shop Assigned Technician</option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] text-white font-bold rounded-xl shadow-xs cursor-pointer">
                  Assign Technician (Step 3: ASSIGNED)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESTIMATE MODAL (STEP 4 -> STEP 5) */}
      {showEstimateModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Submit Vehicle Repair Estimate</h3>
            <p className="text-xs text-[#2C2421]/70">Enter diagnostic labour and required parts estimate for customer approval.</p>
            <form onSubmit={handleTechSubmitEstimate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Labour Cost (PKR) *</label>
                <input
                  required
                  type="number"
                  value={estimateForm.labourCost}
                  onChange={(e) => setEstimateForm({ ...estimateForm, labourCost: Number(e.target.value) })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Parts Cost (PKR) *</label>
                <input
                  required
                  type="number"
                  value={estimateForm.partsCost}
                  onChange={(e) => setEstimateForm({ ...estimateForm, partsCost: Number(e.target.value) })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                />
              </div>

              <div className="p-3 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 flex justify-between font-bold">
                <span>Total Estimated Cost:</span>
                <span className="text-sm font-extrabold text-[#111827]">
                  PKR {(Number(estimateForm.labourCost) + Number(estimateForm.partsCost)).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold mb-1">Diagnostic Notes</label>
                <textarea
                  rows={2}
                  value={estimateForm.notes}
                  onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEstimateModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white font-bold rounded-xl shadow-xs cursor-pointer">
                  Submit to SA (Move to Step 5: ESTIMATE_REVIEW)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SA REVIEW ESTIMATE MODAL (STEP 5 -> STEP 6) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#2C2421]">Review &amp; Adjust Labour</h3>
            <p className="text-xs text-[#2C2421]/70">
              Review technician labour charges and adjust if required before dispatching quote to customer.
            </p>
            <form onSubmit={handleReviewAndSendEstimate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Adjusted Labour Cost (PKR) *</label>
                <input
                  required
                  type="number"
                  value={adjustedLabour}
                  onChange={(e) => setAdjustedLabour(Number(e.target.value))}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                />
              </div>

              <div className="p-3 bg-[#0284C7]/10 rounded-xl border border-[#0284C7]/30 flex justify-between font-bold text-[#0284C7]">
                <span>Total Quote Sent to Customer:</span>
                <span className="text-sm font-extrabold">
                  PKR {(Number(adjustedLabour) + Number(selectedBookingForReview?.estimate?.partsCost ?? 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#0284C7] text-white font-bold rounded-xl shadow-xs cursor-pointer">
                  Send to Customer (Move to Step 6: AWAITING_CUSTOMER)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC FAIL ISSUE MODAL (STEP 13 Fail -> STEP 11) */}
      {showQcModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#E85D22]">Report Quality Check Defect</h3>
            <form onSubmit={handleQcFailIssue} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Defect / Issue Description *</label>
                <textarea
                  required
                  rows={3}
                  value={qcIssueDescription}
                  onChange={(e) => setQcIssueDescription(e.target.value)}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowQcModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#E85D22] text-white font-bold rounded-xl shadow-xs cursor-pointer">
                  Fail QC &amp; Return to Tech (Move to Step 11: IN_REPAIR)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO MODAL (STEP 8 -> STEP 9) */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#2C2421]/20 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-headline text-lg font-bold text-[#111827]">Create Supplier Purchase Order</h3>
            <p className="text-xs text-[#2C2421]/70">Select the required part and order quantity to dispatch a purchase order to suppliers.</p>
            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Target Part Item *</label>
                <select
                  value={poForm.inventoryId}
                  onChange={(e) => {
                    const sel = inventory.find((i) => i.id === e.target.value);
                    setPoForm({ ...poForm, inventoryId: e.target.value, partName: sel?.name || "Ignition Coil OEM" });
                  }}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium cursor-pointer"
                >
                  {inventory.length > 0 ? (
                    inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (SKU: {inv.sku}) — Stock: {inv.quantity} units (PKR {inv.unitPrice?.toLocaleString()})
                      </option>
                    ))
                  ) : (
                    <option value="coil-default">Ignition Coil OEM (SKU: PART-001) — Stock: 0</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Order Quantity *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={poForm.quantity}
                  onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })}
                  className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowPoModal(false)} className="px-4 py-2.5 border rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#111827] hover:bg-[#0F172A] text-white font-bold rounded-xl cursor-pointer">
                  Dispatch Purchase Order (Move to Step 9: PARTS_ORDERED)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOICE CALL MODAL */}
      <VoiceCallModal
        token={token}
        bookingId={callTargetBookingId || "BK-9021"}
        recipientName={callTargetCustomer || "Customer"}
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
      />
    </div>
  );
}
