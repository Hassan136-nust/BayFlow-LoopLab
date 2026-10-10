"use client";

import { getAuthToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import React, { useState, useEffect, useRef } from "react";
import { startOutgoingRingtone, stopOutgoingRingtone } from "@/lib/utils";

interface VoiceCallModalProps {
  token: string | null;
  bookingId: string;
  recipientName: string;
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: "RINGING" | "CONNECTED" | "ENDED";
  existingCallId?: string;
  roomUrl?: string;
}

export default function VoiceCallModal({
  token,
  bookingId,
  recipientName,
  isOpen,
  onClose,
  initialStatus = "RINGING",
  existingCallId,
  roomUrl,
}: VoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<"RINGING" | "CONNECTED" | "ENDED">(initialStatus);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(existingCallId || null);
  const [activeRoomUrl, setActiveRoomUrl] = useState<string | null>(roomUrl || null);
  const [micActive, setMicActive] = useState(false);
  const [micNotice, setMicNotice] = useState<string>("");

  const pollTimerRef = useRef<any>(null);
  const ringTimeoutRef = useRef<any>(null);
  const dailyRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync roomUrl from props
  useEffect(() => {
    if (roomUrl) {
      setActiveRoomUrl(roomUrl);
    }
  }, [roomUrl]);

  // Audio Unlock Helper for Browser Autoplay Policy
  const unlockAudio = () => {
    try {
      if (remoteAudioRef.current && remoteAudioRef.current.paused) {
        remoteAudioRef.current.play().catch(() => {});
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch (e) {}
  };

  // Handle Call Initiation & Outgoing Ringing Polling
  useEffect(() => {
    if (!isOpen) {
      stopOutgoingRingtone();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      return;
    }

    setCallStatus(initialStatus);
    setDuration(0);
    setStatusMessage("");

    const activeToken = token || getAuthToken();

    if (initialStatus === "RINGING") {
      // 1. Play real outgoing ringback tone for caller
      startOutgoingRingtone();

      // 2. Initiate call on backend
      const startCall = async () => {
        let currentCallId = existingCallId || null;

        if (!currentCallId && activeToken && bookingId) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/calls/initiate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${activeToken}`,
              },
              body: JSON.stringify({ bookingId }),
            });
            const data = await res.json();
            const cid = data.data?.id || data.data?.callId;
            if (res.ok && data.success && cid) {
              currentCallId = cid;
              setActiveCallId(cid);
              if (data.data?.roomUrl) {
                setActiveRoomUrl(data.data.roomUrl);
              }
            }
          } catch (err) {
            console.warn("Failed to initiate call on backend:", err);
          }
        }

        // 3. Fast poll backend (every 300ms) to check if receiver answered
        const checkStatus = async () => {
          const targetId = currentCallId || activeCallId || bookingId;
          if (!targetId || !activeToken) return;

          try {
            const res = await fetch(`${API_BASE_URL}/api/calls/${targetId}`, {
              headers: { Authorization: `Bearer ${activeToken}` },
            });
            const data = await res.json();
            const call = data.data;

            if (res.ok && call) {
              if (call.id && !currentCallId) {
                currentCallId = call.id;
                setActiveCallId(call.id);
              }
              if (call.roomUrl && !activeRoomUrl) {
                setActiveRoomUrl(call.roomUrl);
              }

              if (call.status === "CONNECTED") {
                stopOutgoingRingtone();
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
                if (call.id) setActiveCallId(call.id);
                setCallStatus("CONNECTED");
              } else if (call.status === "REJECTED") {
                stopOutgoingRingtone();
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
                setCallStatus("ENDED");
                setStatusMessage("Call Declined by recipient");
                setTimeout(onClose, 1500);
              } else if (call.status === "ENDED") {
                stopOutgoingRingtone();
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
                setCallStatus("ENDED");
                setStatusMessage("Call Ended");
                setTimeout(onClose, 1200);
              }
            }
          } catch (err) {}
        };

        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(checkStatus, 300);

        // 4. Timeout after 45 seconds if receiver doesn't answer (Missed Call)
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = setTimeout(async () => {
          stopOutgoingRingtone();
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setCallStatus("ENDED");
          setStatusMessage("No answer (Call Missed)");

          const targetId = currentCallId || activeCallId;
          if (targetId && activeToken) {
            try {
              await fetch(`${API_BASE_URL}/api/calls/${targetId}/status`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${activeToken}`,
                },
                body: JSON.stringify({ status: "MISSED" }),
              });
            } catch (e) {}
          }

          setTimeout(onClose, 2000);
        }, 45000);
      };

      startCall();
    }

    return () => {
      stopOutgoingRingtone();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [isOpen, initialStatus, existingCallId, bookingId, token]);

  // High-Performance Daily.co Audio Engine when CONNECTED
  useEffect(() => {
    let durationInterval: any;
    let remoteCheckInterval: any;
    let audioSyncInterval: any;
    let isMounted = true;

    if (callStatus === "CONNECTED") {
      unlockAudio();

      // 1. Duration Counter
      durationInterval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      const targetId = activeCallId || existingCallId || bookingId;
      const activeToken = token || getAuthToken();

      // 2. Connect to Daily.co Audio Room
      const connectDaily = async () => {
        try {
          let resolvedRoomUrl = activeRoomUrl;

          // Fast retry loop to ensure roomUrl is resolved immediately
          let attempts = 0;
          while (!resolvedRoomUrl && attempts < 10 && isMounted) {
            attempts++;
            if (targetId && activeToken) {
              try {
                const res = await fetch(`${API_BASE_URL}/api/calls/${targetId}`, {
                  headers: { Authorization: `Bearer ${activeToken}` },
                });
                const data = await res.json();
                if (data.data?.roomUrl) {
                  resolvedRoomUrl = data.data.roomUrl;
                  setActiveRoomUrl(resolvedRoomUrl);
                  break;
                }
              } catch (fetchErr) {}
            }
            if (!resolvedRoomUrl) {
              await new Promise((r) => setTimeout(r, 250));
            }
          }

          // Guaranteed fallback room URL
          if (!resolvedRoomUrl) {
            resolvedRoomUrl = `https://reachly.daily.co/bayflow-${bookingId.slice(0, 8)}`;
            setActiveRoomUrl(resolvedRoomUrl);
          }

          // Dynamically import daily-js (SSR safe)
          const DailyIframe = (await import("@daily-co/daily-js")).default;

          // Clean up any existing call instance
          if (dailyRef.current) {
            try {
              await dailyRef.current.leave();
              dailyRef.current.destroy();
            } catch (e) {}
            dailyRef.current = null;
          }

          if (!isMounted) return;

          // Create headless call object for pure audio
          const callObject = DailyIframe.createCallObject({
            audioSource: true,
            videoSource: false,
            subscribeToTracksAutomatically: true,
          });
          dailyRef.current = callObject;

          // Audio track sync function: works regardless of who joined first or on different Wi-Fi
          const syncRemoteAudioTracks = () => {
            if (!isMounted || !callObject) return;
            try {
              const participants = callObject.participants();
              for (const p of Object.values(participants) as any[]) {
                if (p && !p.local) {
                  const audioTrack =
                    p.audioTrack ||
                    p.tracks?.audio?.persistentTrack ||
                    p.tracks?.audio?.track;

                  if (audioTrack && audioTrack.readyState === "live") {
                    const stream = new MediaStream([audioTrack]);

                    // Sink 1: Active DOM Audio element
                    if (remoteAudioRef.current) {
                      if (remoteAudioRef.current.srcObject !== stream) {
                        remoteAudioRef.current.srcObject = stream;
                      }
                      remoteAudioRef.current.play().catch(() => {});
                    }

                    // Sink 2: Direct WebAudio API route to speakers
                    try {
                      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioCtx) {
                        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
                          audioCtxRef.current = new AudioCtx();
                        }
                        if (audioCtxRef.current.state === "suspended") {
                          audioCtxRef.current.resume().catch(() => {});
                        }
                        const src = audioCtxRef.current.createMediaStreamSource(stream);
                        src.connect(audioCtxRef.current.destination);
                      }
                    } catch (audioErr) {}
                  }
                }
              }
            } catch (syncErr) {}
          };

          // Hook all relevant Daily events to sync audio instantly
          callObject.on("joined-meeting", () => {
            if (!isMounted) return;
            setMicActive(true);
            setMicNotice("Live Voice Audio Active");
            syncRemoteAudioTracks();
          });

          callObject.on("participant-joined", syncRemoteAudioTracks);
          callObject.on("participant-updated", syncRemoteAudioTracks);
          callObject.on("track-started", syncRemoteAudioTracks);

          // Other participant hangs up
          callObject.on("participant-left", (event: any) => {
            if (event.participant && !event.participant.local) {
              setCallStatus("ENDED");
              setStatusMessage("Call Ended by other party");
              setTimeout(onClose, 1000);
            }
          });

          callObject.on("error", (err: any) => {
            console.warn("Daily voice engine error:", err);
          });

          // Join the room with automatic track subscription
          await callObject.join({ url: resolvedRoomUrl, subscribeToTracksAutomatically: true });

          // Periodic background sync (every 1s) to ensure audio track stays locked
          audioSyncInterval = setInterval(syncRemoteAudioTracks, 1000);
        } catch (err: any) {
          console.warn("Could not connect to voice room:", err);
          setMicNotice("Microphone active / Connecting audio...");
        }
      };

      connectDaily();

      // 3. Remote participant termination poll (every 800ms as backend backup)
      if (targetId && activeToken) {
        remoteCheckInterval = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/calls/${targetId}`, {
              headers: { Authorization: `Bearer ${activeToken}` },
            });
            const data = await res.json();
            const call = data.data;
            if (res.ok && call) {
              if (call.status === "ENDED" || call.status === "REJECTED") {
                setCallStatus("ENDED");
                setStatusMessage("Call Ended by other party");
                setTimeout(onClose, 1000);
              }
            }
          } catch (e) {}
        }, 800);
      }
    }

    return () => {
      isMounted = false;
      if (durationInterval) clearInterval(durationInterval);
      if (remoteCheckInterval) clearInterval(remoteCheckInterval);
      if (audioSyncInterval) clearInterval(audioSyncInterval);

      if (dailyRef.current) {
        try {
          dailyRef.current.leave();
          dailyRef.current.destroy();
        } catch (e) {}
        dailyRef.current = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch (e) {}
        audioCtxRef.current = null;
      }
    };
  }, [callStatus, activeCallId, existingCallId, activeRoomUrl, token, onClose, bookingId]);

  // Handle Mute/Unmute
  const toggleMute = () => {
    unlockAudio();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (dailyRef.current) {
      try {
        dailyRef.current.setLocalAudio(!nextMuted);
      } catch (e) {}
    }
  };

  const handleEndCall = async () => {
    stopOutgoingRingtone();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);

    // Stop Daily call object
    if (dailyRef.current) {
      try {
        dailyRef.current.leave();
        dailyRef.current.destroy();
      } catch (e) {}
      dailyRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close().catch(() => {});
      } catch (e) {}
      audioCtxRef.current = null;
    }

    setCallStatus("ENDED");
    const activeToken = token || getAuthToken();
    const targetCallId = activeCallId || existingCallId || bookingId;

    if (activeToken && targetCallId) {
      try {
        await fetch(`${API_BASE_URL}/api/calls/${targetCallId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ status: "ENDED", duration }),
        });
      } catch (err) {
        console.warn("Call status log error:", err);
      }
    }
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div
      onClick={unlockAudio}
      className="fixed inset-0 z-50 bg-[#111827]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* Real DOM Audio Element for incoming stream output */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "1px",
          height: "1px",
          opacity: 0.01,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      <div className="bg-[#111827] border border-white/20 text-white rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="w-20 h-20 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20 shadow-lg relative">
            {callStatus === "RINGING" && (
              <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-75" />
            )}
            <span className="material-symbols-outlined text-4xl">phone_in_talk</span>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/50">
              BAYFLOW VOICE CONNECT
            </span>
            <h3 className="font-headline text-2xl font-extrabold text-white mt-1">
              {recipientName}
            </h3>
            <p className="text-xs text-white/70 font-mono mt-0.5">Ref: {bookingId}</p>
          </div>

          <div className="pt-2">
            {callStatus === "RINGING" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                Ringing... Waiting for answer
              </span>
            )}

            {callStatus === "CONNECTED" && (
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F5C45] text-white text-xs font-mono font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected • {formatTime(duration)}
                </span>
                <p className="text-[11px] font-mono text-emerald-400/90 font-medium">
                  {micActive ? "🎙️ Live Microphone Voice Active" : micNotice}
                </p>
              </div>
            )}

            {callStatus === "ENDED" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">
                {statusMessage || "Call Ended"}
              </span>
            )}
          </div>
        </div>

        {/* Call Action Buttons */}
        <div className="relative z-10 flex items-center justify-center gap-6 pt-4">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted ? "bg-rose-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            <span className="material-symbols-outlined text-xl">
              {isMuted ? "mic_off" : "mic"}
            </span>
          </button>

          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 cursor-pointer ring-4 ring-rose-600/30"
            title="End Call"
          >
            <span className="material-symbols-outlined text-2xl">call_end</span>
          </button>
        </div>
      </div>
    </div>
  );
}
