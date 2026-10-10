"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect, useRef } from "react";
import VoiceCallModal from "@/components/VoiceCallModal";
import { formatUserName, startPhoneRingtone, stopPhoneRingtone } from "@/lib/utils";

interface IncomingCallOverlayProps {
  token?: string | null;
}

export default function IncomingCallOverlay({ token }: IncomingCallOverlayProps) {
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const activeCallRef = useRef<any | null>(null);

  // Keep ref synchronized with activeCall to block polling while talking
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Continuous polling for incoming ringing calls
  useEffect(() => {
    const checkIncomingCall = async () => {
      // Don't poll if user is actively in a connected call
      if (activeCallRef.current) return;

      const activeToken =
        token || (getAuthToken());

      if (!activeToken) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/calls/incoming`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        const call = data.data || data.call;

        if (data.success && call && call.status === "RINGING") {
          // Check if not already dismissed by user
          if (!dismissedIdsRef.current.has(call.id)) {
            setIncomingCall((prev: any) => {
              if (!prev || prev.id !== call.id) {
                startPhoneRingtone();
                return call;
              }
              return prev;
            });
          }
        } else {
          // If call ended or was cancelled by caller
          setIncomingCall((prev: any) => {
            if (prev) {
              stopPhoneRingtone();
              return null;
            }
            return null;
          });
        }
      } catch (err) {
        // Quiet network fallback
      }
    };

    // Run immediately and every 500ms for sub-second responsiveness
    checkIncomingCall();
    const interval = setInterval(checkIncomingCall, 500);

    return () => {
      clearInterval(interval);
      stopPhoneRingtone();
    };
  }, [token]);

  const handleAcceptCall = async () => {
    stopPhoneRingtone();
    if (!incomingCall) return;

    const acceptedCall = incomingCall;
    // Set active call IMMEDIATELY so connected call modal opens and stays open
    setActiveCall(acceptedCall);
    setIncomingCall(null);

    const activeToken =
      token || (getAuthToken());

    if (activeToken) {
      try {
        await fetch(`${API_BASE_URL}/api/calls/${acceptedCall.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ status: "CONNECTED" }),
        });
      } catch (err) {
        console.warn("Accept call status error:", err);
      }
    }
  };

  const handleDeclineCall = async () => {
    stopPhoneRingtone();
    if (!incomingCall) return;

    const currentCallId = incomingCall.id;
    dismissedIdsRef.current.add(currentCallId);
    setIncomingCall(null);

    const activeToken =
      token || (getAuthToken());

    if (activeToken) {
      try {
        await fetch(`${API_BASE_URL}/api/calls/${currentCallId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ status: "REJECTED" }),
        });
      } catch (err) {
        console.warn("Reject call error:", err);
      }
    }
  };

  // Caller identification formatting
  const callerRole = (incomingCall || activeCall)?.caller?.role;
  const callerTitle =
    callerRole === "CUSTOMER"
      ? `Customer (${formatUserName((incomingCall || activeCall)?.caller, "Customer")})`
      : callerRole === "OWNER"
      ? `Shop Owner (${formatUserName((incomingCall || activeCall)?.caller, "Owner")})`
      : `Service Advisor (${formatUserName((incomingCall || activeCall)?.caller, "Advisor")})`;

  const vehicleInfo = (incomingCall || activeCall)?.booking?.vehicleDetails
    ? `${(incomingCall || activeCall).booking.vehicleDetails.make} ${(incomingCall || activeCall).booking.vehicleDetails.model} (${(incomingCall || activeCall).booking.vehicleDetails.plate || "Vehicle"})`
    : `Booking #${(incomingCall || activeCall)?.bookingId?.slice(0, 8).toUpperCase()}`;

  return (
    <>
      {/* REAL-TIME INCOMING CALL POPUP OVERLAY */}
      {incomingCall && !activeCall && (
        <div
          onClick={() => {
            // Clicking modal background activates any browser-suspended audio
            startPhoneRingtone();
          }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] border-2 border-[#10B981] text-white rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.35)] relative overflow-hidden"
          >
            {/* Animated Pulsing Ring Waves */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#10B981]/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Phone Bell Icon with Ripple Animation */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#10B981]/25 animate-ping" />
                <span className="absolute inset-2 rounded-full bg-[#10B981]/40 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-lg relative z-10">
                  <span className="material-symbols-outlined text-3xl animate-bounce">ring_volume</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#10B981] bg-[#10B981]/15 px-3 py-1 rounded-full inline-block border border-[#10B981]/30">
                  INCOMING LIVE CALL
                </span>
                <h3 className="font-headline text-2xl font-extrabold text-white mt-2">
                  {callerTitle}
                </h3>
                <p className="text-xs text-white/90 font-medium mt-1">
                  {vehicleInfo}
                </p>
                <p className="text-[11px] text-white/50 font-mono mt-0.5">
                  Ref: #{incomingCall.bookingId?.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Ringing on your device...
                </span>
              </div>

              {/* Action Buttons: Accept / Decline */}
              <div className="pt-4 flex items-center justify-center gap-8">
                {/* Red Decline Button */}
                <button
                  onClick={handleDeclineCall}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  title="Decline Call"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ring-4 ring-rose-500/30">
                    <span className="material-symbols-outlined text-2xl">call_end</span>
                  </div>
                  <span className="text-xs font-bold text-white/80 group-hover:text-white">Decline</span>
                </button>

                {/* Green Accept Button */}
                <button
                  onClick={handleAcceptCall}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  title="Accept Call"
                >
                  <div className="w-16 h-16 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-xl transition-transform group-hover:scale-110 ring-4 ring-[#10B981]/50 animate-pulse">
                    <span className="material-symbols-outlined text-3xl">phone_in_talk</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#10B981] group-hover:text-emerald-300">
                    Accept Call
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CONNECTED CALL MODAL FOR RECEIVER */}
      {activeCall && (
        <VoiceCallModal
          token={token || (getAuthToken())}
          bookingId={activeCall.bookingId}
          recipientName={callerTitle}
          isOpen={true}
          onClose={() => {
            setActiveCall(null);
          }}
          initialStatus="CONNECTED"
          existingCallId={activeCall.id}
          roomUrl={activeCall.roomUrl}
        />
      )}
    </>
  );
}
