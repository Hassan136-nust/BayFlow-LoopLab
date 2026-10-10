"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export interface GuidedBookingWizardProps {
  initialShopId?: string | null;
  onClose?: () => void;
  onBookingSuccess?: (booking: any) => void;
  isStandalonePage?: boolean;
}

interface ServicePackage {
  id: string;
  name: string;
  category: "maintenance" | "diagnostics" | "brakes" | "climate" | "suspension" | "drivetrain" | "electrical" | "inspection";
  durationMinutes: number;
  basePrice: number;
  description: string;
  recommendedKm?: string;
  badge?: string;
}

const CURATED_PACKAGES: ServicePackage[] = [
  {
    id: "pkg-oil",
    name: "Periodic Maintenance & Lube Service",
    category: "maintenance",
    durationMinutes: 45,
    basePrice: 5500,
    description: "Full synthetic 5W-30 engine oil, OEM oil filter, air & cabin filter check, 40-point safety inspection.",
    recommendedKm: "Every 5,000 - 10,000 km",
    badge: "Most Popular",
  },
  {
    id: "pkg-scan",
    name: "OBD-II Computer Diagnostic Scan",
    category: "diagnostics",
    durationMinutes: 30,
    basePrice: 2500,
    description: "Deep electronic scan of engine, transmission, ABS and airbag modules with live sensor telemetry.",
    badge: "Check Engine Alert",
  },
  {
    id: "pkg-brakes",
    name: "Brake System Health & Pad Replacement",
    category: "brakes",
    durationMinutes: 60,
    basePrice: 6500,
    description: "Ceramic brake pads inspection, rotor disc thickness measurement, caliper sliding pins lube & brake fluid test.",
    recommendedKm: "Every 25,000 km",
  },
  {
    id: "pkg-ac",
    name: "Climate Control & AC System Refresh",
    category: "climate",
    durationMinutes: 45,
    basePrice: 4200,
    description: "R134a refrigerant pressure test, compressor clutch inspection, antibacterial evaporator core flush.",
    badge: "Seasonal",
  },
  {
    id: "pkg-align",
    name: "3D Laser Wheel Alignment & Suspension Check",
    category: "suspension",
    durationMinutes: 50,
    basePrice: 3500,
    description: "Computerized four-wheel laser alignment, tie rod end check, suspension bushings and ball joint inspection.",
    recommendedKm: "Every 15,000 km",
  },
  {
    id: "pkg-trans",
    name: "Transmission & Gearbox Fluid Service",
    category: "drivetrain",
    durationMinutes: 60,
    basePrice: 9500,
    description: "Automatic/CVT transmission fluid drain and refill, transmission oil pan magnet inspection, shift adaptation check.",
    recommendedKm: "Every 40,000 km",
  },
  {
    id: "pkg-batt",
    name: "Battery, Starter & Alternator Electrical Test",
    category: "electrical",
    durationMinutes: 25,
    basePrice: 2000,
    description: "Cold cranking amps (CCA) test, alternator diode ripple test, starter motor amp draw & terminal cleaning.",
  },
  {
    id: "pkg-inspect",
    name: "Comprehensive 120-Point Vehicle Inspection",
    category: "inspection",
    durationMinutes: 75,
    basePrice: 7500,
    description: "End-to-end digital health check: engine compression, fluid conditions, undercarriage, braking, and road test.",
    badge: "Pre-Purchase & Travel",
  },
];

const SYMPTOM_CATEGORIES = [
  {
    id: "lights",
    title: "Warning Lights & Dashboard",
    icon: "warning",
    symptoms: [
      { id: "sym-cel-solid", label: "Check Engine Light (Solid on)", severity: "medium" },
      { id: "sym-cel-flash", label: "Check Engine Light (Flashing / Limp Mode)", severity: "high" },
      { id: "sym-abs", label: "ABS / Traction Control Warning", severity: "medium" },
      { id: "sym-batt", label: "Battery / Alternator Light", severity: "medium" },
      { id: "sym-oil", label: "Low Oil Pressure Warning", severity: "critical" },
      { id: "sym-temp", label: "Coolant Temperature High / Overheating", severity: "critical" },
    ],
  },
  {
    id: "sounds",
    title: "Abnormal Sounds",
    icon: "volume_up",
    symptoms: [
      { id: "sym-brake-sq", label: "Squeaking or grinding when braking", severity: "medium" },
      { id: "sym-belt-sq", label: "High-pitched belt squeal on cold engine start", severity: "low" },
      { id: "sym-eng-knock", label: "Metallic knocking / ticking from engine", severity: "high" },
      { id: "sym-whl-hum", label: "Humming / roaring at highway speed (Wheel Bearing)", severity: "medium" },
      { id: "sym-susp-clunk", label: "Clunking or thudding over road bumps", severity: "medium" },
    ],
  },
  {
    id: "drivability",
    title: "Driving & Handling Behavior",
    icon: "speed",
    symptoms: [
      { id: "sym-vib-idle", label: "Engine vibration / shuddering while stopped at idle", severity: "medium" },
      { id: "sym-pull", label: "Car pulls noticeably to one side while driving", severity: "medium" },
      { id: "sym-sluggish", label: "Sluggish acceleration / engine hesitation", severity: "medium" },
      { id: "sym-hard-start", label: "Hard starting or prolonged engine cranking", severity: "medium" },
      { id: "sym-spongy-brk", label: "Spongy brake pedal / reduced stopping power", severity: "high" },
      { id: "sym-jerk-shift", label: "Jerking or delay during automatic gear shifts", severity: "high" },
    ],
  },
  {
    id: "leaks",
    title: "Fluids, Odors & Leaks",
    icon: "water_drop",
    symptoms: [
      { id: "sym-oil-leak", label: "Dark oil puddle under parked vehicle", severity: "medium" },
      { id: "sym-cool-leak", label: "Sweet coolant smell or steam from hood", severity: "high" },
      { id: "sym-burn-smell", label: "Acrid burning oil or rubber smell in cabin", severity: "high" },
      { id: "sym-ac-warm", label: "Air conditioning blowing warm or humid air", severity: "low" },
      { id: "sym-exhaust", label: "Excessive white, blue or black exhaust smoke", severity: "high" },
    ],
  },
];

const POPULAR_VEHICLES = [
  { make: "Honda", model: "Civic", years: [2016, 2018, 2021, 2023], fuel: "Petrol" },
  { make: "Toyota", model: "Corolla / Altis", years: [2015, 2017, 2020, 2022], fuel: "Petrol" },
  { make: "Hyundai", model: "Tucson", years: [2020, 2021, 2022, 2023], fuel: "Petrol" },
  { make: "Kia", model: "Sportage", years: [2019, 2021, 2022, 2023], fuel: "Petrol" },
  { make: "Suzuki", model: "Swift", years: [2018, 2020, 2022, 2023], fuel: "Petrol" },
  { make: "Toyota", model: "Yaris", years: [2020, 2021, 2022, 2023], fuel: "Petrol" },
  { make: "Toyota", model: "Prius", years: [2016, 2018, 2020], fuel: "Hybrid" },
  { make: "Honda", model: "Vezel", years: [2015, 2017, 2019], fuel: "Hybrid" },
];

const DEFAULT_SHOPS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Lahore Auto Care",
    city: "Lahore",
    rating: 4.9,
    reviews: 142,
    address: "Main Gulberg III, Lahore",
    phone: "+92 42 3578 9900",
    workingHours: "09:00 AM - 08:00 PM",
    bays: "4 Available",
    badge: "Flagship Centre",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Apex Performance Garage",
    city: "Karachi",
    rating: 4.8,
    reviews: 98,
    address: "PECHS Block 6, Main Shahrah-e-Faisal, Karachi",
    phone: "+92 21 3455 1200",
    workingHours: "08:30 AM - 09:00 PM",
    bays: "3 Available",
    badge: "European Specialist",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Garaj Master Workshop",
    city: "Islamabad",
    rating: 4.9,
    reviews: 76,
    address: "Sector I-9/3 Industrial Area, Islamabad",
    phone: "+92 51 4433 991",
    workingHours: "09:00 AM - 07:00 PM",
    bays: "2 Available",
    badge: "Certified Diagnostics",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Precision Tune & Diagnostics",
    city: "Lahore",
    rating: 4.7,
    reviews: 84,
    address: "DHA Phase 5 Commercial, Lahore",
    phone: "+92 42 3718 4422",
    workingHours: "09:00 AM - 08:00 PM",
    bays: "5 Available",
    badge: "Express Bay",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    name: "Karachi Speed Repair Hub",
    city: "Karachi",
    rating: 4.9,
    reviews: 165,
    address: "Clifton Block 2, Marine Drive, Karachi",
    phone: "+92 21 3582 9911",
    workingHours: "09:00 AM - 10:00 PM",
    bays: "3 Available",
    badge: "High Capacity",
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    name: "Capital Hybrid & EV Clinic",
    city: "Islamabad",
    rating: 4.9,
    reviews: 93,
    address: "F-10 Markaz, Islamabad",
    phone: "+92 51 2110 334",
    workingHours: "09:00 AM - 08:00 PM",
    bays: "2 Available",
    badge: "Hybrid / EV Lab",
  },
];

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

const formatPhone = (phone: any): string => {
  if (!phone) return "+92 42 3578 9900";
  if (typeof phone === "string") return phone;
  return "+92 42 3578 9900";
};

export default function GuidedBookingWizard({
  initialShopId,
  onClose,
  onBookingSuccess,
  isStandalonePage = false,
}: GuidedBookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step state: 1: Workshop, 2: Vehicle, 3: Services & Symptoms, 4: Schedule, 5: Customer & Confirm, 6: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Shop selection state
  const [shops, setShops] = useState<any[]>(DEFAULT_SHOPS);
  const [loadingShops, setLoadingShops] = useState(false);
  const [selectedCity, setSelectedCity] = useState("All");
  const [shopSearchQuery, setShopSearchQuery] = useState("");
  const [selectedShop, setSelectedShop] = useState<any | null>(null);

  // Vehicle state
  const [vehicle, setVehicle] = useState({
    make: "Honda",
    model: "Civic",
    year: 2018,
    plate: "LEA-1234",
    color: "Modern Steel Metallic",
    mileage: "58,000 km",
    fuelType: "Petrol",
  });
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);

  // Diagnostics & Service scope state
  const [serviceMode, setServiceMode] = useState<"packages" | "symptoms">("packages");
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(["pkg-oil"]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState("");

  // Scheduling state
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>("10:00 AM");
  const [serviceHandling, setServiceHandling] = useState<"dropoff" | "lounge">("dropoff");
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    "09:00 AM",
    "10:00 AM",
    "11:30 AM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM",
    "06:30 PM",
  ]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer credentials & notification preferences state
  const [customer, setCustomer] = useState({
    name: "Ahmed Khan",
    email: "ahmed.customer@bayflow.demo",
    phone: "0300-1234567",
    password: "demo1234",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [authorizedInspection, setAuthorizedInspection] = useState(true);

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Initialize from search params or initialShopId
  useEffect(() => {
    const paramShopId = searchParams?.get("shopId") || initialShopId;
    fetchShops(paramShopId);
    checkAuthStatus();
  }, [searchParams, initialShopId]);

  const [userRole, setUserRole] = useState<string | null>(null);

  const checkAuthStatus = () => {
    const token = getAuthToken();
    const storedRole = getAuthRole();
    if (storedRole) setUserRole(storedRole);

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.role) setUserRole(payload.role);
        if (payload?.email) {
          setIsAuthenticated(true);
          setCurrentUserEmail(payload.email);
          setCustomer((prev) => ({
            ...prev,
            email: payload.email,
            name: payload.name || prev.name,
          }));
        }
      } catch (e) {
        console.warn("Could not decode auth token in wizard:", e);
      }
    }
  };

  const fetchShops = async (targetShopId?: string | null) => {
    setLoadingShops(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops`);
      const data = await res.json();
      const shopList = data.data || data.shops;
      if (res.ok && data.success && Array.isArray(shopList) && shopList.length > 0) {
        setShops(shopList);
        if (targetShopId) {
          const match = shopList.find((s: any) => s.id === targetShopId);
          if (match) setSelectedShop(match);
        } else if (!selectedShop) {
          setSelectedShop(shopList[0]);
        }
      } else {
        setShops(DEFAULT_SHOPS);
        if (targetShopId) {
          const match = DEFAULT_SHOPS.find((s) => s.id === targetShopId);
          if (match) setSelectedShop(match);
        } else if (!selectedShop) {
          setSelectedShop(DEFAULT_SHOPS[0]);
        }
      }
    } catch (err) {
      setShops(DEFAULT_SHOPS);
      if (targetShopId) {
        const match = DEFAULT_SHOPS.find((s) => s.id === targetShopId);
        if (match) setSelectedShop(match);
      } else if (!selectedShop) {
        setSelectedShop(DEFAULT_SHOPS[0]);
      }
    } finally {
      setLoadingShops(false);
    }
  };

  // Fetch slots for selected date & shop
  const fetchAvailableSlots = async (shopId: string, dateStr: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/slots?date=${dateStr}`);
      const data = await res.json();
      const slots = data.data || data.slots;
      if (res.ok && data.success && Array.isArray(slots) && slots.length > 0) {
        setAvailableSlots(slots);
        if (!slots.includes(selectedSlotTime)) {
          setSelectedSlotTime(slots[0]);
        }
      } else {
        setAvailableSlots(["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"]);
      }
    } catch (err) {
      setAvailableSlots(["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Filter shops by search and city
  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const matchCity = selectedCity === "All" || (s.city && s.city.toLowerCase() === selectedCity.toLowerCase());
      const matchQuery =
        !shopSearchQuery ||
        s.name.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
        (s.address && s.address.toLowerCase().includes(shopSearchQuery.toLowerCase()));
      return matchCity && matchQuery;
    });
  }, [shops, selectedCity, shopSearchQuery]);

  // Aggregate selected issues
  const aggregatedIssues = useMemo(() => {
    const issues: string[] = [];
    selectedPackageIds.forEach((pkgId) => {
      const pkg = CURATED_PACKAGES.find((p) => p.id === pkgId);
      if (pkg) issues.push(pkg.name);
    });
    SYMPTOM_CATEGORIES.forEach((cat) => {
      cat.symptoms.forEach((sym) => {
        if (selectedSymptomIds.includes(sym.id)) {
          issues.push(`Symptom: ${sym.label}`);
        }
      });
    });
    if (symptomNotes.trim()) {
      issues.push(`Customer Note: ${symptomNotes.trim()}`);
    }
    return issues.length > 0 ? issues : ["General Vehicle Diagnostic & Health Check"];
  }, [selectedPackageIds, selectedSymptomIds, symptomNotes]);

  // Estimated turnaround duration and base price calculation
  const quoteEstimate = useMemo(() => {
    let minMinutes = 30;
    let minPrice = 0;

    selectedPackageIds.forEach((pkgId) => {
      const pkg = CURATED_PACKAGES.find((p) => p.id === pkgId);
      if (pkg) {
        minMinutes += pkg.durationMinutes;
        minPrice += pkg.basePrice;
      }
    });

    if (selectedSymptomIds.length > 0) {
      minMinutes += 30; // OBD-II diagnostic time
      if (minPrice === 0) minPrice = 2500; // Baseline diagnostic scan fee
    }

    if (minPrice === 0) {
      minPrice = 2500;
      minMinutes = 45;
    }

    const hours = Math.floor(minMinutes / 60);
    const remMins = minMinutes % 60;
    const durationLabel = hours > 0 ? `${hours} hr ${remMins > 0 ? `${remMins} min` : ""}` : `${remMins} min`;

    return {
      durationLabel,
      basePrice: minPrice,
      maxPrice: Math.round(minPrice * 1.35),
    };
  }, [selectedPackageIds, selectedSymptomIds]);

  const togglePackage = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  const toggleSymptom = (symId: string) => {
    setSelectedSymptomIds((prev) =>
      prev.includes(symId) ? prev.filter((id) => id !== symId) : [...prev, symId]
    );
  };

  // Submit appointment booking to backend with fallback
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) {
      setSubmitError("Please select a workshop to proceed.");
      setCurrentStep(1);
      return;
    }
    if (!authorizedInspection) {
      setSubmitError("Please authorize the preliminary vehicle intake inspection.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const authToken = getAuthToken();
    const slotDateTime = new Date(`${selectedDate} ${selectedSlotTime || "10:00 AM"}`).toISOString();

    const payload: any = {
      shopId: selectedShop.id,
      slotTime: slotDateTime,
      vehicleDetails: {
        make: vehicle.make || "Honda",
        model: vehicle.model || "Civic",
        year: Number(vehicle.year) || 2018,
        plate: vehicle.plate.trim() || "LEA-1234",
        color: vehicle.color || "Grey",
        mileage: vehicle.mileage || "N/A",
      },
      issuesReported: aggregatedIssues,
      notes: `[Mode: ${serviceHandling === "lounge" ? "Customer Waiting in Lounge" : "Vehicle Drop-off"}] ${symptomNotes ? `Notes: ${symptomNotes}` : ""}${whatsappUpdates ? " | Preferred Channel: WhatsApp" : ""}`,
    };

    if (!authToken) {
      payload.customerInfo = {
        name: customer.name || "Customer",
        email: customer.email,
        password: customer.password || "demo1234",
        phoneNumber: customer.phone || "03001234567",
      };
    }

    try {
      const headers: any = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const resultBooking = data.data || data.booking;
        if (data.accessToken) {
          setAuthToken(data.accessToken);
          setAuthRole("CUSTOMER");
        }
        setConfirmedBooking(resultBooking);
        setCurrentStep(6);
        if (onBookingSuccess) onBookingSuccess(resultBooking);
      } else {
        // Fallback for offline or local mock demonstration
        console.warn("Backend responded with error; initializing local confirmed booking:", data.error || data.message);
        generateFallbackConfirmation();
      }
    } catch (err: any) {
      console.warn("Backend unavailable; initializing local confirmed booking:", err);
      generateFallbackConfirmation();
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateFallbackConfirmation = () => {
    const randomRef = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const mockCreated = {
      id: randomRef,
      shopId: selectedShop.id,
      shopName: selectedShop.name,
      shopAddress: selectedShop.address || selectedShop.city,
      shopPhone: selectedShop.phone || "+92 42 3578 9900",
      vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
      slotTime: `${selectedDate} @ ${selectedSlotTime}`,
      status: "PENDING",
      issuesReported: aggregatedIssues,
      estimatedBaseTotal: quoteEstimate.basePrice,
      createdAt: new Date().toISOString(),
      customerName: customer.name,
      customerEmail: customer.email,
    };

    // Save to local storage for customer view fallback sync
    try {
      const existing = JSON.parse(localStorage.getItem("bayflow_mock_bookings") || "[]");
      localStorage.setItem("bayflow_mock_bookings", JSON.stringify([mockCreated, ...existing]));
    } catch (e) {
      console.warn("Local storage sync error:", e);
    }

    setConfirmedBooking(mockCreated);
    setCurrentStep(6);
    if (onBookingSuccess) onBookingSuccess(mockCreated);
  };

  const stepsList = [
    { num: 1, title: "Workshop", icon: "store" },
    { num: 2, title: "Vehicle Info", icon: "directions_car" },
    { num: 3, title: "Services & Symptoms", icon: "build_circle" },
    { num: 4, title: "Date & Time", icon: "calendar_month" },
    { num: 5, title: "Review & Book", icon: "assignment_turned_in" },
  ];

  if (userRole && userRole !== "CUSTOMER") {
    return (
      <div className={`w-full max-w-xl mx-auto ${isStandalonePage ? "py-12" : "my-8"}`}>
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#2C2421]/15 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#111827] text-white flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-3xl">badge</span>
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold font-mono">
              STAFF / {userRole} SESSION ACTIVE
            </span>
            <h2 className="font-headline text-2xl font-extrabold text-[#2C2421]">
              Customer Portal Feature
            </h2>
            <p className="text-xs sm:text-sm text-[#2C2421]/70 leading-relaxed max-w-md mx-auto">
              The Guided Booking Wizard is designed for customers to diagnose vehicle symptoms and book appointments. You are currently signed in under the staff/management role of <strong>{userRole}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3 bg-[#111827] hover:bg-[#0F172A] text-white rounded-xl text-xs font-bold shadow transition-all text-center"
            >
              Go to {userRole} Dashboard
            </Link>
            <Link
              href="/shops"
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-[#F8F8F5] border border-[#2C2421]/20 text-[#2C2421] rounded-xl text-xs font-bold transition-all text-center"
            >
              View Shop Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-5xl mx-auto ${isStandalonePage ? "py-4 sm:py-8" : "my-4"}`}>
      {/* WIZARD CONTAINER */}
      <div className="bg-white rounded-3xl border border-[#2C2421]/15 shadow-[0_12px_45px_rgba(44,36,33,0.06)] overflow-hidden">
        {/* HEADER BAR & STEPPER NAVIGATION */}
        <div className="bg-[#F8F8F5] border-b border-[#2C2421]/12 px-6 py-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] text-white text-[11px] font-bold tracking-wider uppercase mb-1">
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                <span>Guided Service Booking Wizard</span>
              </div>
              <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#2C2421]">
                {currentStep === 6 ? "Appointment Confirmed" : "Schedule Your Vehicle Service"}
              </h1>
              <p className="text-xs sm:text-sm text-[#2C2421]/70">
                {currentStep === 6
                  ? "Your request is registered with real-time tracking in the customer portal."
                  : "Step-by-step diagnostic assessment, transparent price ranges & verified bay reservation."}
              </p>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="self-end sm:self-center p-2 rounded-full hover:bg-black/5 text-[#2C2421]/60 hover:text-[#2C2421] transition-colors"
                title="Close Wizard"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>

          {/* Stepper Dots & Labels (Hidden on Success step) */}
          {currentStep <= 5 && (
            <div className="mt-6 pt-5 border-t border-[#2C2421]/10">
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {stepsList.map((st) => {
                  const isCompleted = currentStep > st.num;
                  const isActive = currentStep === st.num;
                  return (
                    <button
                      key={st.num}
                      type="button"
                      onClick={() => {
                        if (isCompleted) setCurrentStep(st.num);
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`flex flex-col sm:flex-row items-center sm:items-start gap-2 p-2 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-white border border-[#111827] shadow-xs"
                          : isCompleted
                          ? "bg-[#1F5C45]/8 text-[#1F5C45] hover:bg-[#1F5C45]/15 cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isActive
                            ? "bg-[#111827] text-white"
                            : isCompleted
                            ? "bg-[#1F5C45] text-white"
                            : "bg-[#2C2421]/15 text-[#2C2421]"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          st.num
                        )}
                      </div>
                      <div className="hidden sm:block min-w-0">
                        <div className="text-[10px] uppercase font-mono font-bold text-[#2C2421]/60">
                          Step {st.num}
                        </div>
                        <div
                          className={`text-xs font-bold truncate ${
                            isActive ? "text-[#111827]" : "text-[#2C2421]/80"
                          }`}
                        >
                          {st.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* WIZARD BODY */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* ================= STEP 1: SELECT WORKSHOP ================= */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#2C2421]">Select Service Workshop</h2>
                    <p className="text-xs text-[#2C2421]/70">
                      Choose your preferred authorized partner garage for diagnostic and mechanical repairs.
                    </p>
                  </div>

                  {/* City selector pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {["All", "Lahore", "Karachi", "Islamabad"].map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setSelectedCity(city)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          selectedCity === city
                            ? "bg-[#111827] text-white border-[#111827]"
                            : "bg-[#F8F8F5] text-[#2C2421]/70 border-[#2C2421]/15 hover:bg-[#F4F4F1]"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-[#2C2421]/40">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search workshops by name, street, or area..."
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                  />
                </div>

                {/* Workshops List */}
                {loadingShops ? (
                  <div className="py-12 text-center text-xs font-bold text-[#2C2421]/60 flex items-center justify-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                    <span>Loading authorized repair workshops...</span>
                  </div>
                ) : filteredShops.length === 0 ? (
                  <div className="p-8 text-center bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/10 text-xs text-[#2C2421]/70">
                    No workshops found matching your criteria. Try switching the city filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredShops.map((shop) => {
                      const isSelected = selectedShop?.id === shop.id;
                      return (
                        <div
                          key={shop.id}
                          onClick={() => {
                            setSelectedShop(shop);
                            fetchAvailableSlots(shop.id, selectedDate);
                          }}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-white border-[#111827] ring-2 ring-[#111827]/10 shadow-md"
                              : "bg-[#F8F8F5] border-[#2C2421]/12 hover:border-[#2C2421]/30 hover:bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm text-[#2C2421]">{shop.name}</h3>
                                  {shop.badge && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#111827]/10 text-[#111827] text-[10px] font-bold">
                                      {shop.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[#2C2421]/60 mt-1">
                                  <span className="material-symbols-outlined text-sm text-[#2C2421]/40">
                                    location_on
                                  </span>
                                  <span>{shop.address || shop.city}</span>
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-[#111827] border-[#111827] text-white"
                                    : "border-[#2C2421]/30 bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <span className="material-symbols-outlined text-xs">check</span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3.5 pt-3 border-t border-[#2C2421]/10 flex flex-wrap items-center gap-3 text-xs text-[#2C2421]/70">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-amber-500">star</span>
                                <strong className="text-[#2C2421]">{shop.rating || 4.9}</strong> ({shop.reviews || 120})
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-[#2C2421]/50">schedule</span>
                                <span>{formatWorkingHours(shop.workingHours)}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-semibold text-[#1F5C45]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1F5C45]"></span>
                                <span>{shop.bays || "Bays Available"}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#2C2421]/10 flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedShop}
                    onClick={() => {
                      if (selectedShop) {
                        setCurrentStep(2);
                        fetchAvailableSlots(selectedShop.id, selectedDate);
                      }
                    }}
                    className="px-6 py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Proceed to Vehicle Info</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 2: VEHICLE DETAILS ================= */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#2C2421]">Vehicle Identification &amp; Specs</h2>
                  <p className="text-xs text-[#2C2421]/70">
                    Identify your automobile so our technician and service advisor can pull appropriate OEM part catalogs.
                  </p>
                </div>

                {/* Popular Vehicles Quick-Select */}
                <div>
                  <label className="block text-xs font-bold text-[#2C2421] uppercase tracking-wider mb-2">
                    Quick Pick Popular Models:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POPULAR_VEHICLES.map((pv, idx) => {
                      const isPicked =
                        !isCustomVehicle && vehicle.make === pv.make && vehicle.model === pv.model;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setIsCustomVehicle(false);
                            setVehicle({
                              ...vehicle,
                              make: pv.make,
                              model: pv.model,
                              year: pv.years[pv.years.length - 2],
                              fuelType: pv.fuel,
                            });
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isPicked
                              ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                              : "bg-[#F8F8F5] text-[#2C2421]/80 border-[#2C2421]/15 hover:border-[#2C2421]/30"
                          }`}
                        >
                          <div className="text-xs font-bold truncate">
                            {pv.make} {pv.model}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isPicked ? "text-white/70" : "text-[#2C2421]/50"
                            }`}
                          >
                            {pv.fuel} • {pv.years[0]}-{pv.years[pv.years.length - 1]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Vehicle Inputs */}
                <div className="bg-[#F8F8F5] p-5 rounded-2xl border border-[#2C2421]/12 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C2421] uppercase tracking-wider">
                      Vehicle Specifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomVehicle(!isCustomVehicle)}
                      className="text-xs font-bold text-[#111827] underline cursor-pointer"
                    >
                      {isCustomVehicle ? "Switch to Preset Models" : "Enter Custom Car Details"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">Make *</label>
                      <input
                        type="text"
                        value={vehicle.make}
                        onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                        className="w-full p-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                        placeholder="e.g. Honda, Toyota"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">Model *</label>
                      <input
                        type="text"
                        value={vehicle.model}
                        onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                        className="w-full p-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                        placeholder="e.g. Civic Oriel, Corolla Altis"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">Model Year *</label>
                      <select
                        value={vehicle.year}
                        onChange={(e) => setVehicle({ ...vehicle, year: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                      >
                        {Array.from({ length: 25 }, (_, i) => 2025 - i).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* License Plate Input with realistic design */}
                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">
                        Plate Registration Number *
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-2 px-1.5 py-0.5 rounded bg-[#1F5C45] text-white text-[9px] font-bold">
                          PAK
                        </div>
                        <input
                          type="text"
                          value={vehicle.plate}
                          onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })}
                          className="w-full pl-12 pr-3 py-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-[#111827]"
                          placeholder="LEA-1234"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">Powertrain / Fuel</label>
                      <select
                        value={vehicle.fuelType}
                        onChange={(e) => setVehicle({ ...vehicle, fuelType: e.target.value })}
                        className="w-full p-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                      >
                        <option value="Petrol">Petrol (Gasoline)</option>
                        <option value="Hybrid">Hybrid Electric (HEV)</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Electric">Battery Electric (EV)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2C2421] mb-1">
                        Current Odometer Reading
                      </label>
                      <input
                        type="text"
                        value={vehicle.mileage}
                        onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })}
                        className="w-full p-2.5 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                        placeholder="e.g. 58,000 km"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Vehicle Badge Summary */}
                <div className="p-4 bg-white rounded-2xl border border-[#2C2421]/12 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#111827] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">directions_car</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2C2421]">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-[11px] font-mono text-[#2C2421]/60">
                        Plate: <strong className="text-[#111827]">{vehicle.plate}</strong> • {vehicle.fuelType} • {vehicle.mileage}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1F5C45]/10 text-[#1F5C45] text-xs font-bold">
                    Vehicle Ready
                  </span>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#2C2421]/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 border border-[#2C2421]/20 hover:bg-[#F4F4F1] text-xs font-bold rounded-xl transition-all"
                  >
                    ← Back to Workshop
                  </button>
                  <button
                    type="button"
                    disabled={!vehicle.make || !vehicle.model || !vehicle.plate}
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Proceed to Diagnostics &amp; Services</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 3: GUIDED SERVICES & SYMPTOMS ================= */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#2C2421]">Guided Diagnostic &amp; Service Assessment</h2>
                  <p className="text-xs text-[#2C2421]/70">
                    Select regular maintenance packages or diagnose symptoms your vehicle is experiencing.
                  </p>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="flex p-1 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/12 max-w-md">
                  <button
                    type="button"
                    onClick={() => setServiceMode("packages")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      serviceMode === "packages"
                        ? "bg-white text-[#111827] shadow-xs"
                        : "text-[#2C2421]/70 hover:text-[#2C2421]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                    <span>Curated Service Packages</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode("symptoms")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      serviceMode === "symptoms"
                        ? "bg-white text-[#111827] shadow-xs"
                        : "text-[#2C2421]/70 hover:text-[#2C2421]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">troubleshoot</span>
                    <span>Symptom Checker</span>
                  </button>
                </div>

                {/* TAB 1: CURATED PACKAGES */}
                {serviceMode === "packages" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {CURATED_PACKAGES.map((pkg) => {
                      const isSelected = selectedPackageIds.includes(pkg.id);
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => togglePackage(pkg.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-white border-[#111827] ring-1 ring-[#111827] shadow-sm"
                              : "bg-[#F8F8F5] border-[#2C2421]/12 hover:border-[#2C2421]/30 hover:bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-bold text-xs sm:text-sm text-[#2C2421]">{pkg.name}</h3>
                                  {pkg.badge && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#1F5C45]/10 text-[#1F5C45] text-[9px] font-bold">
                                      {pkg.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#2C2421]/70 mt-1 leading-snug">
                                  {pkg.description}
                                </p>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? "bg-[#111827] border-[#111827] text-white"
                                    : "border-[#2C2421]/30 bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <span className="material-symbols-outlined text-xs">check</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#2C2421]/10 flex items-center justify-between text-xs">
                            <span className="text-[#2C2421]/60 font-mono text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">timer</span>
                              <span>~{pkg.durationMinutes} mins</span>
                            </span>
                            <span className="font-bold text-[#111827]">
                              PKR {pkg.basePrice.toLocaleString()}+
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: GUIDED SYMPTOM CHECKER */}
                {serviceMode === "symptoms" && (
                  <div className="space-y-5">
                    <p className="text-xs text-[#2C2421]/70">
                      Not sure what part needs replacement? Select whatever symptoms or sounds your car is making.
                      Our diagnostic technician will perform a physical OBD-II inspection.
                    </p>

                    <div className="space-y-4">
                      {SYMPTOM_CATEGORIES.map((cat) => (
                        <div
                          key={cat.id}
                          className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/12 space-y-2.5"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-[#2C2421] uppercase tracking-wider">
                            <span className="material-symbols-outlined text-base text-[#111827]">
                              {cat.icon}
                            </span>
                            <span>{cat.title}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {cat.symptoms.map((sym) => {
                              const isChecked = selectedSymptomIds.includes(sym.id);
                              return (
                                <button
                                  type="button"
                                  key={sym.id}
                                  onClick={() => toggleSymptom(sym.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    isChecked
                                      ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                                      : "bg-white text-[#2C2421]/80 border-[#2C2421]/15 hover:border-[#2C2421]/40"
                                  }`}
                                >
                                  <span>{sym.label}</span>
                                  {isChecked ? (
                                    <span className="material-symbols-outlined text-xs">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-xs text-[#2C2421]/30">add</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Specific Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#2C2421] mb-1">
                    Specific Symptoms / When Does It Occur? (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={symptomNotes}
                    onChange={(e) => setSymptomNotes(e.target.value)}
                    placeholder="e.g. Engine shakes when stopped at traffic signals in D gear, AC stops cooling after 20 minutes..."
                    className="w-full p-3 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl text-xs font-medium focus:outline-none focus:border-[#111827]"
                  />
                </div>

                {/* Live Quote & Bay Time Summary Box */}
                <div className="p-4 bg-[#1F5C45]/8 border border-[#1F5C45]/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#1F5C45] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      <span>Preliminary Intake Scope:</span>
                    </div>
                    <div className="text-xs text-[#2C2421]/80">
                      Estimated bay inspection &amp; labor time: <strong>~{quoteEstimate.durationLabel}</strong>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <div className="text-[10px] font-mono text-[#2C2421]/60 uppercase">
                      Starting Estimate Range
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-[#111827]">
                      PKR {quoteEstimate.basePrice.toLocaleString()} - {quoteEstimate.maxPrice.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#2C2421]/60">
                      *Exact quote submitted for customer approval before work
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#2C2421]/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 border border-[#2C2421]/20 hover:bg-[#F4F4F1] text-xs font-bold rounded-xl transition-all"
                  >
                    ← Back to Vehicle
                  </button>
                  <button
                    type="button"
                    disabled={selectedPackageIds.length === 0 && selectedSymptomIds.length === 0}
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Proceed to Slot &amp; Schedule</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 4: DATE & TIME SLOT ================= */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#2C2421]">Select Appointment Date &amp; Bay Slot</h2>
                  <p className="text-xs text-[#2C2421]/70">
                    Reserve an intake bay slot at {selectedShop?.name || "your workshop"}.
                  </p>
                </div>

                {/* Quick Date Selectors */}
                <div>
                  <label className="block text-xs font-bold text-[#2C2421] uppercase tracking-wider mb-2">
                    Select Appointment Date:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "Tomorrow", offset: 1 },
                      { label: "In 2 Days", offset: 2 },
                      { label: "In 3 Days", offset: 3 },
                      { label: "In 5 Days", offset: 5 },
                    ].map((opt, idx) => {
                      const d = new Date();
                      d.setDate(d.getDate() + opt.offset);
                      const dStr = d.toISOString().split("T")[0];
                      const isChosen = selectedDate === dStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dStr);
                            if (selectedShop) fetchAvailableSlots(selectedShop.id, dStr);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                            isChosen
                              ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                              : "bg-[#F8F8F5] text-[#2C2421]/70 border-[#2C2421]/15 hover:bg-white"
                          }`}
                        >
                          {opt.label} ({d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })})
                        </button>
                      );
                    })}

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        if (selectedShop) fetchAvailableSlots(selectedShop.id, e.target.value);
                      }}
                      className="px-3 py-2 bg-white border border-[#2C2421]/15 rounded-xl text-xs font-bold text-[#2C2421] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Service Handling Choice */}
                <div>
                  <label className="block text-xs font-bold text-[#2C2421] uppercase tracking-wider mb-2">
                    Vehicle Delivery Preference:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setServiceHandling("dropoff")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        serviceHandling === "dropoff"
                          ? "bg-white border-[#111827] ring-1 ring-[#111827] shadow-xs"
                          : "bg-[#F8F8F5] border-[#2C2421]/12 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-[#111827]">car_crash</span>
                        <strong className="text-xs text-[#2C2421]">Workshop Drop-Off</strong>
                      </div>
                      <p className="text-[11px] text-[#2C2421]/70 mt-1">
                        Hand over keys at intake desk. Track digital inspection, technician photos and estimate via WhatsApp &amp; Customer Portal.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceHandling("lounge")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        serviceHandling === "lounge"
                          ? "bg-white border-[#111827] ring-1 ring-[#111827] shadow-xs"
                          : "bg-[#F8F8F5] border-[#2C2421]/12 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-[#111827]">coffee</span>
                        <strong className="text-xs text-[#2C2421]">Customer Lounge Wait (Express)</strong>
                      </div>
                      <p className="text-[11px] text-[#2C2421]/70 mt-1">
                        Stay on-site in air-conditioned lounge with high-speed Wi-Fi while our express bay handles your service.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Slot Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#2C2421] uppercase tracking-wider">
                      Available Time Slots on {selectedDate}:
                    </label>
                    <span className="text-[11px] text-[#1F5C45] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1F5C45]"></span>
                      <span>Real-time Bay Concurrency Lock</span>
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="py-8 text-center text-xs font-bold text-[#2C2421]/60 flex items-center justify-center gap-2">
                      <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                      <span>Verifying slot availability...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {availableSlots.map((slot, idx) => {
                        const isPicked = selectedSlotTime === slot;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSlotTime(slot)}
                            className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isPicked
                                ? "bg-[#111827] text-white border-[#111827] shadow-xs"
                                : "bg-[#F8F8F5] text-[#2C2421]/80 border-[#2C2421]/15 hover:border-[#2C2421]/30 hover:bg-white"
                            }`}
                          >
                            <span>{slot}</span>
                            {isPicked && <span className="material-symbols-outlined text-xs">check</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#2C2421]/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2.5 border border-[#2C2421]/20 hover:bg-[#F4F4F1] text-xs font-bold rounded-xl transition-all"
                  >
                    ← Back to Diagnostics
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlotTime}
                    onClick={() => setCurrentStep(5)}
                    className="px-6 py-3 bg-[#111827] hover:bg-[#0F172A] text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Proceed to Customer Review</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 5: CUSTOMER DETAILS & REVIEW & SUBMIT ================= */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#2C2421]">Review &amp; Authorize Booking</h2>
                  <p className="text-xs text-[#2C2421]/70">
                    Confirm your vehicle details and appointment contact before scheduling the job card.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3.5 bg-[#E85D22]/10 border border-[#E85D22]/30 rounded-xl text-xs font-bold text-[#E85D22] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Comprehensive Review Card */}
                <div className="bg-[#F8F8F5] p-5 rounded-2xl border border-[#2C2421]/12 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2C2421]/10 pb-3">
                    <span className="text-xs font-bold text-[#2C2421] uppercase tracking-wider">
                      Appointment Summary
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#111827] text-white text-[10px] font-bold">
                      Pending Authorization
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Workshop &amp; Location:</span>
                      <div className="font-bold text-[#2C2421] text-sm mt-0.5">{selectedShop?.name}</div>
                      <div className="text-[11px] text-[#2C2421]/70">{selectedShop?.address}</div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Vehicle Identification:</span>
                      <div className="font-bold text-[#2C2421] text-sm mt-0.5">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-[11px] font-mono text-[#2C2421]/70">
                        Plate: <strong className="text-[#111827]">{vehicle.plate}</strong> • {vehicle.mileage}
                      </div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Scheduled Date &amp; Time:</span>
                      <div className="font-bold text-[#2C2421] text-sm mt-0.5">
                        {selectedDate} @ {selectedSlotTime}
                      </div>
                      <div className="text-[11px] text-[#1F5C45] font-semibold">
                        Mode: {serviceHandling === "lounge" ? "Lounge Wait" : "Vehicle Drop-off"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Starting Estimate Range:</span>
                      <div className="font-bold text-[#111827] text-sm mt-0.5">
                        PKR {quoteEstimate.basePrice.toLocaleString()} - {quoteEstimate.maxPrice.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[#2C2421]/60">
                        Includes OBD-II intake scan &amp; baseline labor
                      </div>
                    </div>
                  </div>

                  {/* Issues & Services List */}
                  <div className="pt-3 border-t border-[#2C2421]/10">
                    <span className="text-[#2C2421]/60 font-medium text-xs block mb-1.5">
                      Intake Scope / Reported Issues:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aggregatedIssues.map((issue, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-white border border-[#2C2421]/15 rounded-lg text-xs font-medium text-[#2C2421]"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Customer Account / Contact Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C2421] uppercase tracking-wider">
                      Customer Contact &amp; Notification Portal
                    </span>
                    {isAuthenticated ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1F5C45]/15 text-[#1F5C45] text-[11px] font-bold">
                        Logged in as {currentUserEmail}
                      </span>
                    ) : (
                      <Link
                        href="/login"
                        className="text-xs font-bold text-[#111827] underline hover:text-[#0F172A]"
                      >
                        Already have an account? Sign In
                      </Link>
                    )}
                  </div>

                  {!isAuthenticated ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold mb-1">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={customer.name}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium focus:outline-none focus:border-[#111827]"
                          placeholder="e.g. Ahmed Khan"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Mobile / WhatsApp Number *</label>
                        <input
                          type="text"
                          required
                          value={customer.phone}
                          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium focus:outline-none focus:border-[#111827]"
                          placeholder="e.g. 0300-1234567"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={customer.email}
                          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium focus:outline-none focus:border-[#111827]"
                          placeholder="e.g. ahmed@mail.com"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Create Account Password *</label>
                        <input
                          type="password"
                          required
                          value={customer.password}
                          onChange={(e) => setCustomer({ ...customer, password: e.target.value })}
                          className="w-full p-2.5 bg-[#F8F8F5] border border-[#2C2421]/15 rounded-xl font-medium focus:outline-none focus:border-[#111827]"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F8F8F5] rounded-xl border border-[#2C2421]/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#1F5C45]">verified</span>
                        <span>Your customer portal account is verified and will track this job card.</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#2C2421]/60">Role: CUSTOMER</span>
                    </div>
                  )}

                  {/* Channel Notification Preferences */}
                  <div className="p-4 bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/12 space-y-2">
                    <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappUpdates}
                        onChange={(e) => setWhatsappUpdates(e.target.checked)}
                        className="rounded accent-[#111827] w-4 h-4"
                      />
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#1F5C45]">chat</span>
                        <span>
                          Receive real-time <strong>WhatsApp repair photos</strong> &amp; estimate alerts on{" "}
                          <span className="font-mono">{customer.phone}</span>
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailUpdates}
                        onChange={(e) => setEmailUpdates(e.target.checked)}
                        className="rounded accent-[#111827] w-4 h-4"
                      />
                      <span>Send digital estimate itemization &amp; VAT tax invoices to email</span>
                    </label>
                  </div>

                  {/* Authorization Checkbox */}
                  <div className="p-4 bg-white rounded-2xl border border-[#111827]/20 space-y-2">
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authorizedInspection}
                        onChange={(e) => setAuthorizedInspection(e.target.checked)}
                        className="rounded accent-[#111827] w-4 h-4 mt-0.5 shrink-0"
                      />
                      <span className="text-[#2C2421]/90">
                        <strong>Authorization &amp; Digital Approval Guarantee:</strong> I authorize the workshop to perform preliminary intake inspection. I understand that an itemized repair estimate must be digitally approved by me in my Customer Portal before any mechanical repairs or parts replacements begin.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#2C2421]/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2.5 border border-[#2C2421]/20 hover:bg-[#F4F4F1] text-xs font-bold rounded-xl transition-all"
                  >
                    ← Back to Slot
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !authorizedInspection}
                    onClick={handleFinalSubmit}
                    className="px-8 py-3.5 bg-[#1F5C45] hover:bg-[#164433] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                        <span>Locking Bay Slot &amp; Creating Job Card...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span>Confirm &amp; Reserve Service Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 6: CONFIRMATION & ROADMAP ================= */}
            {currentStep === 6 && confirmedBooking && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="py-6 space-y-8"
              >
                {/* Hero Confirmation Badge */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#1F5C45]/15 text-[#1F5C45] flex items-center justify-center mx-auto shadow-sm">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-[#2C2421]">
                    Appointment Successfully Booked!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#2C2421]/70 max-w-md mx-auto">
                    Your vehicle intake reservation has been registered with status{" "}
                    <strong className="text-[#1F5C45]">PENDING</strong> under Job Reference ID:
                  </p>
                  <div className="inline-block px-4 py-1.5 bg-[#F8F8F5] border border-[#2C2421]/20 rounded-xl font-mono text-sm font-bold text-[#111827]">
                    Ref: {confirmedBooking.id}
                  </div>
                </div>

                {/* Booking Key Facts Card */}
                <div className="bg-[#F8F8F5] rounded-2xl border border-[#2C2421]/12 p-6 max-w-2xl mx-auto space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Workshop:</span>
                      <div className="font-bold text-[#2C2421] text-sm">{selectedShop?.name}</div>
                      <div className="text-[11px] text-[#2C2421]/70">{selectedShop?.address}</div>
                      <div className="text-[11px] text-[#2C2421]/70">{formatPhone(selectedShop?.phone)}</div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Vehicle:</span>
                      <div className="font-bold text-[#2C2421] text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-[11px] font-mono text-[#111827]">Plate: {vehicle.plate}</div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Appointment Slot:</span>
                      <div className="font-bold text-[#2C2421] text-sm">
                        {selectedDate} @ {selectedSlotTime}
                      </div>
                      <div className="text-[11px] text-[#1F5C45] font-semibold">
                        Service Mode: {serviceHandling === "lounge" ? "Lounge Wait" : "Drop-off"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[#2C2421]/60 font-medium">Estimated Intake Base:</span>
                      <div className="font-bold text-[#111827] text-sm">
                        PKR {quoteEstimate.basePrice.toLocaleString()} - {quoteEstimate.maxPrice.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[#2C2421]/60">
                        Itemized quote requires your digital approval
                      </div>
                    </div>
                  </div>

                  {whatsappUpdates && (
                    <div className="p-3 bg-[#1F5C45]/10 border border-[#1F5C45]/25 rounded-xl flex items-center gap-2 text-xs text-[#1F5C45] font-semibold">
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>WhatsApp notifications enabled for {customer.phone}. Status updates will be sent live.</span>
                    </div>
                  )}
                </div>

                {/* What Happens Next Roadmap */}
                <div className="max-w-2xl mx-auto space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C2421]/70 text-center">
                    What to Expect Next in Your Repair Lifecycle:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-white rounded-xl border border-[#2C2421]/15 text-center space-y-1">
                      <div className="w-6 h-6 rounded-full bg-[#111827] text-white text-[11px] font-bold flex items-center justify-center mx-auto">
                        1
                      </div>
                      <div className="font-bold text-xs text-[#2C2421]">Intake &amp; Inspection</div>
                      <p className="text-[10px] text-[#2C2421]/70">
                        Bring car at scheduled slot. Service Advisor checks intake &amp; assigns a certified technician.
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-[#2C2421]/15 text-center space-y-1">
                      <div className="w-6 h-6 rounded-full bg-[#111827] text-white text-[11px] font-bold flex items-center justify-center mx-auto">
                        2
                      </div>
                      <div className="font-bold text-xs text-[#2C2421]">Itemized Estimate</div>
                      <p className="text-[10px] text-[#2C2421]/70">
                        Technician uploads OBD-II scan &amp; itemized parts quote for review in your Customer Portal.
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-[#2C2421]/15 text-center space-y-1">
                      <div className="w-6 h-6 rounded-full bg-[#1F5C45] text-white text-[11px] font-bold flex items-center justify-center mx-auto">
                        3
                      </div>
                      <div className="font-bold text-xs text-[#1F5C45]">You Approve or Reject</div>
                      <p className="text-[10px] text-[#2C2421]/70">
                        Zero surprise bills. You click to approve the quote before any mechanical wrench touches your car.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#111827] hover:bg-[#0F172A] text-white font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 text-center"
                  >
                    <span className="material-symbols-outlined text-base">dashboard</span>
                    <span>Track in Customer Portal</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setConfirmedBooking(null);
                    }}
                    className="w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-[#F8F8F5] border border-[#2C2421]/20 font-bold text-xs text-[#2C2421] rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>Book Another Service</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
