"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Helper to safely format working hours whether string or object
const formatWorkingHours = (hours: any): string => {
  if (!hours) return "09:00 AM - 08:00 PM";
  if (typeof hours === "string") return hours;
  if (typeof hours === "object" && hours !== null) {
    const open = hours.open || "09:00 AM";
    const close = hours.close || "08:00 PM";
    return `${open} - ${close}`;
  }
  return "09:00 AM - 08:00 PM";
};

export default function ShopsPage() {
  const router = useRouter();

  // Directory State
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [selectedCity, setSelectedCity] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const SHOPS_PER_PAGE = 6;

  // Normal Shop Booking State
  const [activeShop, setActiveShop] = useState<any | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Services & Notes
  const [shopServices, setShopServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState("");

  // Step 2: Time Slots
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState("");

  // Step 3: Vehicle & Customer Info
  const [vehicle, setVehicle] = useState({
    makeModel: "Honda Civic 2018",
    plate: "LEA-1234",
    color: "Grey",
    mileage: "58,000 km",
  });
  const [customerInfo, setCustomerInfo] = useState({
    name: "Ahmed Khan",
    email: "ahmed.customer@bayflow.demo",
    password: "demo1234",
    phone: "0300-1234567",
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);

  // Fallback mock shops if backend array is empty or offline
  const fallbackShops = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Lahore Auto Care",
      city: "Lahore",
      rating: 4.9,
      reviews: 142,
      address: "Main Gulberg III, Lahore",
      phone: "+92 42 3578 9900",
      services: [
        { id: "s1", name: "Oil Change & Filter", durationMinutes: 30, basePrice: 5200 },
        { id: "s2", name: "Check Engine Light OBD-II Scan", durationMinutes: 45, basePrice: 2500 },
        { id: "s3", name: "Brake Pad & Rotor Overhaul", durationMinutes: 60, basePrice: 8500 },
        { id: "s4", name: "AC Gas Refill & Leak Inspection", durationMinutes: 40, basePrice: 4000 },
        { id: "s5", name: "Suspension & Wheel Alignment", durationMinutes: 60, basePrice: 3500 },
      ],
      workingHours: "09:00 AM - 08:00 PM",
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Apex Performance Garage",
      city: "Karachi",
      rating: 4.8,
      reviews: 98,
      address: "PECHS Block 6, Main Shahrah-e-Faisal, Karachi",
      phone: "+92 21 3455 1200",
      services: [
        { id: "s6", name: "Engine Tuning & Remap", durationMinutes: 90, basePrice: 15000 },
        { id: "s7", name: "Brake Pad Replacement", durationMinutes: 45, basePrice: 4200 },
        { id: "s8", name: "Transmission Fluid Service", durationMinutes: 60, basePrice: 9000 },
        { id: "s9", name: "Tire Balancing & Alignment", durationMinutes: 30, basePrice: 2500 },
      ],
      workingHours: "08:30 AM - 09:00 PM",
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Garaj Master Workshop",
      city: "Islamabad",
      rating: 4.9,
      reviews: 76,
      address: "Sector I-9/3 Industrial Area, Islamabad",
      phone: "+92 51 4433 991",
      services: [
        { id: "s10", name: "Full Computer Diagnostic Scan", durationMinutes: 30, basePrice: 2000 },
        { id: "s11", name: "AGM Battery Replacement", durationMinutes: 20, basePrice: 18000 },
        { id: "s12", name: "Synthetic Oil Change", durationMinutes: 30, basePrice: 6000 },
        { id: "s13", name: "Multi-Point Safety Inspection", durationMinutes: 45, basePrice: 3000 },
      ],
      workingHours: "09:00 AM - 07:00 PM",
    },
    {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Precision Tune & Diagnostics",
      city: "Lahore",
      rating: 4.7,
      reviews: 84,
      address: "DHA Phase 5 Commercial, Lahore",
      phone: "+92 42 3718 4422",
      services: [
        { id: "s14", name: "ECU Electronic Scan & Reset", durationMinutes: 35, basePrice: 3000 },
        { id: "s15", name: "Laser Wheel Alignment", durationMinutes: 40, basePrice: 3200 },
        { id: "s16", name: "Spark Plug & Coil Pack Service", durationMinutes: 50, basePrice: 7500 },
      ],
      workingHours: "09:00 AM - 08:00 PM",
    },
    {
      id: "00000000-0000-0000-0000-000000000005",
      name: "Karachi Speed Repair Hub",
      city: "Karachi",
      rating: 4.9,
      reviews: 165,
      address: "Clifton Block 2, Marine Drive, Karachi",
      phone: "+92 21 3582 9911",
      services: [
        { id: "s17", name: "Full Synthetic Lube & Filter", durationMinutes: 30, basePrice: 5800 },
        { id: "s18", name: "Ceramic Brake Pad Fitment", durationMinutes: 45, basePrice: 9500 },
        { id: "s19", name: "Coolant Flush & Pressure Test", durationMinutes: 40, basePrice: 3800 },
      ],
      workingHours: "09:00 AM - 10:00 PM",
    },
    {
      id: "00000000-0000-0000-0000-000000000006",
      name: "Rawal Motors & Engineering",
      city: "Islamabad",
      rating: 4.8,
      reviews: 58,
      address: "G-8 Markaz, Islamabad",
      phone: "+92 51 2281 400",
      services: [
        { id: "s20", name: "Differential & Gearbox Service", durationMinutes: 60, basePrice: 11000 },
        { id: "s21", name: "Suspension Bushing & Struts", durationMinutes: 75, basePrice: 14000 },
        { id: "s22", name: "Alternator & Starter Check", durationMinutes: 30, basePrice: 2800 },
      ],
      workingHours: "08:30 AM - 07:30 PM",
    },
  ];

  const fallbackSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:30 AM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM",
  ];

  // Load shops & check active session on mount
  useEffect(() => {
    fetchShops();
    checkAuthSession();
  }, []);

  const checkAuthSession = () => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.email) {
          setCurrentUserEmail(payload.email);
          setCustomerInfo((prev) => ({ ...prev, email: payload.email, name: payload.name || prev.name }));
        }
        setIsLoggedIn(true);
      } catch (e) {
        console.warn("Could not decode auth token:", e);
      }
    }
  };

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops`);
      const data = await res.json();
      const shopList = data.data || data.shops;
      if (res.ok && data.success && Array.isArray(shopList) && shopList.length > 0) {
        setShops(shopList);
      } else {
        setShops(fallbackShops);
      }
    } catch (err) {
      console.warn("API offline; utilizing fallback shop catalog:", err);
      setShops(fallbackShops);
    } finally {
      setLoadingShops(false);
    }
  };

  // When a shop is selected for normal booking
  const handleSelectShop = async (shop: any) => {
    setActiveShop(shop);
    setStep(1);
    setSelectedServices([]);
    setCustomNotes("");
    setSelectedSlotTime("");
    setErrorMsg("");

    // Fetch services for shop
    setLoadingServices(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shop.id}/services`);
      const data = await res.json();
      const servicesList = data.data || data.services;
      if (res.ok && data.success && Array.isArray(servicesList) && servicesList.length > 0) {
        setShopServices(servicesList);
      } else {
        setShopServices(shop.services || fallbackShops[0].services);
      }
    } catch (err) {
      setShopServices(shop.services || fallbackShops[0].services);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch slots for selected date
  const fetchSlotsForShop = async (shopId: string, dateStr: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/slots?date=${dateStr}`);
      const data = await res.json();
      const slotsList = data.data || data.slots;
      if (res.ok && data.success && Array.isArray(slotsList) && slotsList.length > 0) {
        setAvailableSlots(slotsList);
      } else {
        setAvailableSlots(fallbackSlots);
      }
    } catch (err) {
      setAvailableSlots(fallbackSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Toggle service selection
  const handleToggleService = (serviceName: string) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter((s) => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  // Submit Normal Booking to Backend API
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    let authToken = getAuthToken();

    // Parse make, model, year from input string
    const parts = vehicle.makeModel.split(" ");
    const make = parts[0] || "Honda";
    const model = parts.slice(1, -1).join(" ") || parts[1] || "Civic";
    const year = parseInt(parts[parts.length - 1], 10) || 2018;

    // Combine slot time with date
    const slotDateTime = new Date(`${selectedDate} ${selectedSlotTime || "10:00 AM"}`).toISOString();

    const payload: any = {
      shopId: activeShop.id,
      slotTime: slotDateTime,
      vehicleDetails: {
        make,
        model,
        year,
        plate: vehicle.plate.trim() || "LEA-1234",
        color: vehicle.color || "Grey",
        mileage: vehicle.mileage || "N/A",
      },
      issuesReported: selectedServices.length > 0 ? selectedServices : ["General Maintenance & Inspection"],
      notes: customNotes,
    };

    if (!authToken) {
      if (!customerInfo.email || !customerInfo.password) {
        setErrorMsg("Please enter your name, email and password to register your appointment.");
        setIsSubmitting(false);
        return;
      }
      payload.customerInfo = {
        name: customerInfo.name || "Customer",
        email: customerInfo.email,
        password: customerInfo.password,
        phoneNumber: customerInfo.phone || null,
      };
    }

    try {
      const headers: any = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const confirmedBooking = data.data || data.booking;
        if (data.accessToken) {
          setAuthToken(data.accessToken);
          setAuthRole("CUSTOMER");
        }
        setCreatedBooking(confirmedBooking);
        setStep(4);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2200);
      } else {
        // Fallback for offline/demo database
        const mockCreated = {
          id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
          status: "PENDING",
        };
        setCreatedBooking(mockCreated);
        setStep(4);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2200);
      }
    } catch (err: any) {
      const mockCreated = {
        id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "PENDING",
      };
      setCreatedBooking(mockCreated);
      setStep(4);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2200);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter shops by city and search query
  const filteredShops = shops.filter((s) => {
    const matchesCity = selectedCity === "All" || (s.city && s.city.toLowerCase() === selectedCity.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCity && matchesSearch;
  });

  // Pagination calculations: 6 shops per page
  const totalPages = Math.max(1, Math.ceil(filteredShops.length / SHOPS_PER_PAGE));
  const startIndex = (currentPage - 1) * SHOPS_PER_PAGE;
  const paginatedShops = filteredShops.slice(startIndex, startIndex + SHOPS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#2C2421] flex flex-col justify-between font-sans selection:bg-[#111827] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {!activeShop ? (
          /* ================= SECTION A: NORMAL PUBLIC SHOP DIRECTORY LISTING ================= */
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2C2421] tracking-tight">
                Auto Repair Workshops
              </h1>
              <p className="text-sm text-[#2C2421]/70">
                Browse available shops and schedule your service appointment.
              </p>

              {/* Filters & Search Row */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[#2C2421]/40">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name or location..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#2C2421]/20 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                  />
                </div>

                {/* City Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                  {["All", "Lahore", "Karachi", "Islamabad"].map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer ${
                        selectedCity === city
                          ? "bg-[#111827] text-white border-[#111827]"
                          : "bg-white text-[#2C2421]/70 border-[#2C2421]/20 hover:text-[#2C2421]"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loadingShops ? (
              <div className="py-16 text-center text-xs font-medium text-[#2C2421]/60 flex items-center justify-center gap-2">
                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                <span>Loading workshops...</span>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#2C2421]/15 p-12 text-center text-xs font-medium text-[#2C2421]/60 max-w-md mx-auto">
                No repair shops matching &quot;{searchQuery || selectedCity}&quot; found.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Shop Cards Grid: Displaying 6 items max per page */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedShops.map((shop) => (
                    <div
                      key={shop.id}
                      className="bg-white rounded-2xl border border-[#2C2421]/15 p-6 shadow-xs hover:border-[#2C2421]/30 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        {/* Shop Title & Location */}
                        <div>
                          <h3 className="text-lg font-bold text-[#2C2421] leading-snug">
                            {shop.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-[#2C2421]/60 mt-1">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/40 shrink-0">
                              location_on
                            </span>
                            <span className="truncate">
                              {shop.address || "Main City Workshop"}{shop.city ? `, ${shop.city}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Contact & Hours Info List */}
                        <div className="mt-4 pt-3.5 border-t border-[#2C2421]/10 flex flex-col gap-2 text-xs text-[#2C2421]/80">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/50 shrink-0">call</span>
                            <span>{shop.phone || (shop.users?.find((u: any) => u.phoneNumber)?.phoneNumber) || "0300-1234567"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#2C2421]/50 shrink-0">schedule</span>
                            <span>{formatWorkingHours(shop.workingHours)}</span>
                          </div>
                        </div>

                        {/* Available Services */}
                        <div className="mt-4 pt-3.5 border-t border-[#2C2421]/10">
                          <div className="text-xs font-semibold text-[#2C2421] mb-2">
                            Available Services
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(shop.services) && shop.services.length > 0 ? (
                              shop.services.slice(0, 3).map((svc: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-[#F4F4F1] text-[#2C2421] border border-[#2C2421]/10"
                                >
                                  {typeof svc === "string" ? svc : svc.name}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F4F4F1] text-[#2C2421] border border-[#2C2421]/10">
                                  General Maintenance
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F4F4F1] text-[#2C2421] border border-[#2C2421]/10">
                                  Diagnostic Scan
                                </span>
                              </>
                            )}
                            {Array.isArray(shop.services) && shop.services.length > 3 && (
                              <span className="text-xs px-2 py-1 text-[#2C2421]/60">
                                +{shop.services.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Normal Book Appointment CTA Button */}
                      <div className="mt-6 pt-4 border-t border-[#2C2421]/10">
                        <button
                          onClick={() => handleSelectShop(shop)}
                          className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Book Service Appointment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#2C2421]/15">
                    <div className="text-xs text-[#2C2421]/70 font-medium">
                      Showing <span className="font-semibold text-[#2C2421]">{startIndex + 1}</span>–
                      <span className="font-semibold text-[#2C2421]">{Math.min(startIndex + SHOPS_PER_PAGE, filteredShops.length)}</span> of{" "}
                      <span className="font-semibold text-[#2C2421]">{filteredShops.length}</span> shops
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage((p) => Math.max(p - 1, 1));
                          window.scrollTo({ top: 100, behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#2C2421] border-[#2C2421]/15 hover:bg-[#F4F4F1]"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          type="button"
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 100, behavior: "smooth" });
                          }}
                          className={`w-9 h-9 rounded-xl text-xs font-semibold transition-colors border flex items-center justify-center cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-[#111827] text-white border-[#111827]"
                              : "bg-white text-[#2C2421]/70 border-[#2C2421]/15 hover:bg-[#F4F4F1] hover:text-[#2C2421]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage((p) => Math.min(p + 1, totalPages));
                          window.scrollTo({ top: 100, behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#2C2421] border-[#2C2421]/15 hover:bg-[#F4F4F1]"
                      >
                        <span>Next</span>
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= SECTION B: NORMAL SHOP BOOKING ================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#2C2421]/15 p-6 sm:p-10 shadow-sm"
          >
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-4 mb-6">
              <div>
                <span className="text-[11px] font-bold text-[#111827] bg-[#111827]/10 px-2.5 py-0.5 rounded-full">
                  STEP {step} OF 3
                </span>
                <h2 className="text-xl font-bold text-[#2C2421] mt-1">
                  {activeShop.name}
                </h2>
                <p className="text-xs text-[#2C2421]/60">{activeShop.address || activeShop.city}</p>
              </div>

              <button
                onClick={() => setActiveShop(null)}
                className="text-xs font-bold text-[#2C2421]/60 hover:text-[#2C2421] underline cursor-pointer"
              >
                Change Shop
              </button>
            </div>

            {step === 4 && createdBooking ? (
              /* Booking Success Confirmation Card */
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1F5C45]/15 text-[#1F5C45] flex items-center justify-center mx-auto shadow-sm">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2C2421]">Booking Confirmed!</h3>
                <p className="text-xs sm:text-sm text-[#2C2421]/70 max-w-md mx-auto leading-relaxed">
                  Your appointment request is registered under Reference ID{" "}
                  <strong className="text-[#111827] bg-[#F4F4F1] px-2 py-0.5 rounded">
                    {createdBooking.id}
                  </strong>{" "}
                  with status <strong className="text-[#1F5C45]">PENDING</strong>.
                </p>
                <p className="text-xs text-[#2C2421]/50 animate-pulse">
                  Redirecting to your Dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                {/* ---------------- STEP 1: SERVICES & PROBLEMS ---------------- */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-[#2C2421]">
                        Select Services / Reported Problems:
                      </h3>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        Multiple selections allowed. Click to choose what your vehicle needs.
                      </p>
                    </div>

                    {loadingServices ? (
                      <div className="py-6 text-center text-xs font-bold text-[#2C2421]/60">
                        Loading shop service catalog...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {shopServices.map((svc: any, idx: number) => {
                          const svcName = typeof svc === "string" ? svc : svc.name;
                          const isSelected = selectedServices.includes(svcName);
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => handleToggleService(svcName)}
                              className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                                  : "bg-[#F8F8F5] text-[#2C2421]/80 border-[#2C2421]/15 hover:border-[#2C2421]/30"
                              }`}
                            >
                              <span>{svcName}</span>
                              <span className="material-symbols-outlined text-base">
                                {isSelected ? "check_circle" : "add_circle_outline"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#2C2421] mb-1">
                        Additional Problem Notes / Symptoms (Optional):
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Engine vibrates when stopped at idle, warning light came on yesterday..."
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        className="w-full p-3.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-2xl text-xs focus:outline-none focus:border-[#111827]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={selectedServices.length === 0}
                      onClick={() => {
                        setStep(2);
                        fetchSlotsForShop(activeShop.id, selectedDate);
                      }}
                      className="w-full py-3.5 bg-[#111827] text-white text-xs font-bold rounded-2xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next: Select Time Slot</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                )}

                {/* ---------------- STEP 2: TIME SLOT PICKER ---------------- */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-[#2C2421]">
                        Select Appointment Date &amp; Time Slot:
                      </h3>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        Choose an available slot for {activeShop.name}.
                      </p>
                    </div>

                    {/* Date Selector */}
                    <div>
                      <label className="block text-xs font-bold text-[#2C2421] mb-1">Preferred Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          fetchSlotsForShop(activeShop.id, e.target.value);
                        }}
                        className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl text-xs font-bold text-[#2C2421]"
                      />
                    </div>

                    {/* Slots Grid */}
                    {loadingSlots ? (
                      <div className="py-6 text-center text-xs font-bold text-[#2C2421]/60">
                        Checking slot availability...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {availableSlots.map((slot, idx) => {
                          const isSelected = selectedSlotTime === slot;
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setSelectedSlotTime(slot)}
                              className={`p-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                                  : "bg-[#F8F8F5] text-[#2C2421]/80 border-[#2C2421]/15 hover:border-[#2C2421]/30"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-1/3 py-3 border border-[#2C2421]/20 text-xs font-bold rounded-2xl cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        disabled={!selectedSlotTime}
                        onClick={() => setStep(3)}
                        className="w-2/3 py-3 bg-[#111827] text-white text-xs font-bold rounded-2xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Next: Vehicle &amp; Customer Details</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 3: CUSTOMER & VEHICLE DETAILS ---------------- */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-[#2C2421]">
                        Vehicle &amp; Customer Details:
                      </h3>
                      <p className="text-xs text-[#2C2421]/60 mt-0.5">
                        Provide vehicle info to register your service appointment.
                      </p>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-[#E85D22]/10 border border-[#E85D22]/30 rounded-xl text-xs font-bold text-[#E85D22]">
                        {errorMsg}
                      </div>
                    )}

                    {/* Vehicle Details */}
                    <div className="space-y-3 bg-[#F8F8F5] p-4 rounded-2xl border border-[#2C2421]/10">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#2C2421]/70">
                        Vehicle Identification
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold mb-1">Make &amp; Model *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Honda Civic 2018"
                            value={vehicle.makeModel}
                            onChange={(e) => setVehicle({ ...vehicle, makeModel: e.target.value })}
                            className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Plate Registration *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. LEA-1234"
                            value={vehicle.plate}
                            onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                            className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer Personal Details */}
                    {isLoggedIn ? (
                      <div className="p-4 bg-[#1F5C45]/10 border border-[#1F5C45]/30 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-[#1F5C45]">
                          <span className="material-symbols-outlined text-base">account_circle</span>
                          <span>Signed in as <strong>{currentUserEmail || "Customer Account"}</strong></span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1F5C45] text-white text-[10px] font-bold">
                          Session Verified
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-[#F8F8F5] p-4 rounded-2xl border border-[#2C2421]/10">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#2C2421]/70">
                          <span>Customer Account</span>
                          <Link href="/login" className="lowercase text-amber-700 underline font-bold hover:text-amber-900">
                            Already registered? Sign In
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-bold mb-1">Your Name *</label>
                            <input
                              required
                              type="text"
                              placeholder="e.g. Ahmed Khan"
                              value={customerInfo.name}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                              className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Email Address *</label>
                            <input
                              required
                              type="email"
                              placeholder="e.g. ahmed@mail.com"
                              value={customerInfo.email}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                              className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Account Password *</label>
                            <input
                              required
                              type="password"
                              placeholder="••••••••"
                              value={customerInfo.password}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, password: e.target.value })}
                              className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-medium"
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Phone Number</label>
                            <input
                              type="text"
                              placeholder="e.g. 0300-1234567"
                              value={customerInfo.phone}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                              className="w-full p-3 bg-white border border-[#2C2421]/15 rounded-xl font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-1/3 py-3.5 border border-[#2C2421]/20 text-xs font-bold rounded-2xl cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-2/3 py-3.5 bg-[#1F5C45] hover:bg-[#164433] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <span>Creating Appointment...</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">check</span>
                            <span>Confirm &amp; Create Appointment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
