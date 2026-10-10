"use client";
import { getAuthToken, setAuthToken, clearAuthToken, getAuthRole, setAuthRole, clearAuthRole } from "@/lib/auth";

import { API_BASE_URL } from "@/lib/api";

import React, { useState, useEffect, useRef } from "react";
import { playNotificationChime } from "@/lib/utils";

interface NotificationBellProps {
  token: string | null;
}

export default function NotificationBell({ token }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [swRegistered, setSwRegistered] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Check browser notification support & service worker
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => setSwRegistered(true))
          .catch((e) => console.warn("SW register error:", e));
      }
    }
  }, []);

  // Poll notifications from backend every 4 seconds
  useEffect(() => {
    const activeToken = token || (getAuthToken());
    if (!activeToken) return;

    fetchNotifications(activeToken);

    const interval = setInterval(() => {
      fetchNotifications(activeToken);
    }, 4000);

    return () => clearInterval(interval);
  }, [token]);

  const triggerBrowserPush = (title: string, message: string, id: string, link?: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: id,
            data: { link: link || "/dashboard" },
          });
        });
      } else {
        const n = new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          tag: id,
        });
        n.onclick = () => {
          window.focus();
          if (link) window.location.href = link;
        };
      }
    } catch (e) {
      console.warn("Trigger notification error:", e);
    }
  };

  const fetchNotifications = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const list: any[] = data.notifications || data.data?.notifications || [];
        const count: number =
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : data.data?.unreadCount ?? list.filter((n) => !n.isRead).length;

        // Check if there are newly arrived unread notifications
        if (initialLoadDoneRef.current) {
          const freshUnread = list.filter((n) => !n.isRead && !seenIdsRef.current.has(n.id));
          if (freshUnread.length > 0) {
            playNotificationChime();
            freshUnread.forEach((n) => {
              triggerBrowserPush(n.title, n.message, n.id, n.link);
              seenIdsRef.current.add(n.id);
            });
          }
        } else {
          list.forEach((n) => seenIdsRef.current.add(n.id));
          initialLoadDoneRef.current = true;
        }

        setNotifications(list);
        setUnreadCount(count);
      }
    } catch (err) {
      console.warn("Failed to fetch real-time notifications:", err);
    }
  };

  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser does not support Web Push notifications.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        playNotificationChime();
        triggerBrowserPush(
          "🔔 Web Push Activated",
          "You will now receive real-time workshop floor and booking alerts directly on your device.",
          "init-push"
        );
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  };

  const handleSendTestNotification = () => {
    playNotificationChime();
    if (permission === "granted") {
      triggerBrowserPush(
        "🚗 BayFlow Real-Time Alert",
        "Vehicle Honda Civic (LEA-1234) status moved to Step 14: READY_FOR_PICKUP.",
        `test-${Date.now()}`
      );
    } else {
      requestPushPermission();
    }
  };

  const handleMarkAllRead = async () => {
    const activeToken = token || (getAuthToken());
    if (activeToken) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch (err) {
        console.warn("Notification read API error:", err);
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleMarkSingleRead = async (id: string, link?: string) => {
    const activeToken = token || (getAuthToken());
    if (activeToken) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch (err) {
        console.warn("Notification single read error:", err);
      }
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (link && typeof window !== "undefined") {
      window.location.href = link;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#2C2421]/80 hover:text-[#111827] hover:bg-[#F4F4F1] rounded-full transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#E85D22] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#2C2421]/15 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#2C2421]/10 flex items-center justify-between bg-[#F8F8F5]">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-xs text-[#2C2421]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-[#E85D22]/10 text-[#E85D22] text-[10px] font-extrabold">
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#1F5C45]/10 text-[#1F5C45] text-[10px] font-extrabold">
                  All Caught Up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-[#111827] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Web Push Banner */}
          <div className="px-4 py-2.5 bg-[#111827] text-white flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#059669]">
                {permission === "granted" ? "notifications_active" : "notifications_off"}
              </span>
              <span>
                Web Push:{" "}
                <strong className={permission === "granted" ? "text-emerald-400" : "text-amber-400"}>
                  {permission === "granted" ? "Active" : "Disabled"}
                </strong>
              </span>
            </div>

            {permission !== "granted" ? (
              <button
                onClick={requestPushPermission}
                className="px-2.5 py-1 bg-[#E85D22] hover:bg-[#d04e17] text-white rounded-lg font-bold text-[10px] cursor-pointer"
              >
                Enable Push
              </button>
            ) : (
              <button
                onClick={handleSendTestNotification}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold cursor-pointer"
              >
                Test Push
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#2C2421]/10 text-xs">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#2C2421]/50 space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#2C2421]/30">mark_chat_unread</span>
                <p className="text-xs">No notifications in your feed yet.</p>
                <p className="text-[11px] text-[#2C2421]/40">Alerts will appear here when appointments change status.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkSingleRead(n.id, n.link)}
                  className={`p-3.5 transition-colors cursor-pointer ${
                    !n.isRead ? "bg-[#1F5C45]/5 font-medium border-l-4 border-l-[#1F5C45]" : "hover:bg-[#F8F8F5]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#2C2421] text-xs flex items-center gap-1">
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#E85D22] inline-block" />}
                      {n.title}
                    </span>
                    <span className="text-[10px] text-[#2C2421]/40 whitespace-nowrap">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#2C2421]/70 mt-1 leading-snug">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
