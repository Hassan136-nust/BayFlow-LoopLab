"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

interface NavbarProps {
  onOpenDemo?: () => void;
}

export default function Navbar({ onOpenDemo }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = getAuthToken();
    setToken(storedToken);
    setIsAuthenticated(!!storedToken);

    const storedRole = getAuthRole();
    if (storedRole) {
      setUserRole(storedRole);
    } else if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        if (payload?.role) setUserRole(payload.role);
      } catch (e) {}
    }
  }, []);

  const handleSignOut = () => {
    clearAuthToken();
    clearAuthRole();
    setIsAuthenticated(false);
    setUserRole(null);
    router.replace("/login");
  };

  const isCustomerOrGuest = !userRole || userRole === "CUSTOMER";

  return (
    <header className="fixed top-5 left-0 w-full z-50 px-4 sm:px-6 lg:px-8">
      {/* Floating Pill Navbar */}
      <div className="max-w-5xl mx-auto h-14 bg-white/95 backdrop-blur-md border border-[#2C2421]/15 rounded-full shadow-[0_4px_20px_rgba(44,36,33,0.06)] px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold shadow-md shadow-[#111827]/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-lg">
              build_circle
            </span>
          </div>
          <span className="font-headline text-base font-extrabold tracking-tight text-[#2C2421]">
            BAYFLOW
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold text-[#2C2421]/80">
          <Link
            href="/shops"
            className="hover:text-[#111827] transition-colors"
          >
            Find Shops
          </Link>
          {isCustomerOrGuest && (
            <Link
              href="/book"
              className="hover:text-[#111827] transition-colors flex items-center gap-1 font-bold text-[#111827]"
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              <span>Guided Booking</span>
            </Link>
          )}
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="hover:text-[#111827] transition-colors"
          >
            Dashboard
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <NotificationBell token={token} />
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#111827] text-white hover:bg-[#0F172A] transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">space_dashboard</span>
                <span>Dashboard</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#2C2421] hover:bg-[#F4F4F1] transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-[#111827] text-white hover:bg-[#0F172A] transition-all shadow-xs"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#2C2421] hover:bg-[#F4F4F1] rounded-full transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="md:hidden mt-3 max-w-sm mx-auto bg-white border border-[#2C2421]/15 rounded-2xl px-6 py-5 flex flex-col gap-3 text-sm font-medium text-[#2C2421] shadow-xl"
          >
            <Link
              href="/shops"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#111827] py-1 font-semibold"
            >
              Find Shops
            </Link>
            {isCustomerOrGuest && (
              <Link
                href="/book"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#111827] py-1 font-bold flex items-center gap-1.5 text-[#111827]"
              >
                <span className="material-symbols-outlined text-base">auto_fix_high</span>
                <span>Guided Booking</span>
              </Link>
            )}
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#111827] py-1 font-semibold"
            >
              Dashboard
            </Link>

            <div className="pt-3 border-t border-[#2C2421]/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full bg-[#E85D22]/10 text-[#E85D22] text-xs font-bold py-2.5 rounded-full"
                >
                  Sign Out Account
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-[#111827] text-white text-xs font-bold py-2.5 rounded-full shadow"
                >
                  Sign In Account
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
