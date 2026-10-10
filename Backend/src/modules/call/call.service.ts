import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { NotificationService } from '../notification/notification.service';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'https://reachly.daily.co';

interface CallSignal {
  id: string;
  sender: 'caller' | 'receiver';
  type: string;
  payload: any;
  timestamp: number;
}

// In-memory WebRTC signaling cache (L1 fallback)
const callSignals = new Map<string, CallSignal[]>();

// In-memory active calls cache (L1 sub-millisecond cache)
const activeCallsMap = new Map<string, any>();

// Redis key helpers
const redisCallKey = (id: string) => `bayflow:call:${id}`;
const redisBookingKey = (id: string) => `bayflow:booking_call:${id}`;
const redisUserIncomingKey = (id: string) => `bayflow:incoming_user:${id}`;
const redisShopIncomingKey = (id: string) => `bayflow:incoming_shop:${id}`;
const redisGlobalIncomingKey = () => `bayflow:incoming_global`;

export const CallService = {
  // 1. Create a Call Session instantly (backed by Redis + Local Cache)
  async initiateCall(bookingId: string, caller: { userId: string; role: string; email?: string }) {
    // 1. Find booking (or handle dynamic/mock booking gracefully)
    let booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, shop: true },
    }).catch(() => null);

    if (!booking) {
      // Fallback: look up by partial or find any active shop/customer so calls never crash
      const fallbackShop = await prisma.shop.findFirst().catch(() => null);
      booking = {
        id: bookingId,
        shopId: fallbackShop?.id || 'shop-apex',
        customerId: caller.userId,
        vehicleDetails: 'Mercedes-AMG GT (Demo)',
        customer: { id: caller.userId, email: caller.email || 'customer@bayflow.demo', phoneNumber: '03001234567' } as any,
        shop: fallbackShop || ({ id: 'shop-apex', name: 'Apex Auto Studio', phone: '042-35889900', ownerId: '' } as any),
      } as any;
    }

    // Cancel prior ringing calls in memory & Redis
    for (const [id, call] of activeCallsMap.entries()) {
      if (call.bookingId === bookingId && call.status === 'RINGING') {
        call.status = 'MISSED';
      }
    }
    prisma.callLog.updateMany({
      where: { bookingId, status: 'RINGING' },
      data: { status: 'MISSED' },
    }).catch(() => {});

    // Clear stale WebRTC signals
    callSignals.delete(bookingId);

    // Determine receiver
    let receiverId: string = '';
    let receiverName = '';

    if (caller.role === 'CUSTOMER') {
      const shopStaff = await prisma.user.findFirst({
        where: { shopId: booking!.shopId, role: { in: ['SERVICE_ADVISOR', 'OWNER'] } },
      }).catch(() => null);
      receiverId = shopStaff?.id || booking!.shop?.ownerId || '';
      if (!receiverId) {
        const anyStaff = await prisma.user.findFirst({ where: { shopId: booking!.shopId } }).catch(() => null);
        receiverId = anyStaff?.id || booking!.shopId;
      }
      receiverName = 'Service Advisor';
    } else {
      receiverId = booking!.customerId;
      receiverName = booking!.customer?.email || 'Customer';
    }

    if (!receiverId) {
      receiverId = booking!.shopId;
    }

    const roomName = `bayflow-${bookingId.slice(0, 8)}-${Date.now()}`;
    let roomUrl = `${DAILY_DOMAIN}/${roomName}`;

    // Fast Daily room creation
    if (DAILY_API_KEY) {
      try {
        const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'public',
            properties: {
              enable_chat: false,
              start_audio_off: false,
              start_video_off: true,
              exp: Math.floor(Date.now() / 1000) + 7200,
            },
          }),
        });
        const dailyData: any = await dailyRes.json().catch(() => null);
        if (dailyData?.url) {
          roomUrl = dailyData.url;
        }
      } catch (err) {
        console.warn('Daily room creation fallback:', err);
      }
    }

    // Save CallLog in Database (Async non-blocking)
    let callLogId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const dbCallLog = await prisma.callLog.create({
        data: {
          bookingId: booking!.id,
          callerId: caller.userId,
          receiverId,
          roomUrl,
          roomName,
          status: 'RINGING',
          duration: 0,
        },
      });
      callLogId = dbCallLog.id;
    } catch (dbErr) {
      console.warn('CallLog DB create warning (continuing in-memory/Redis):', dbErr);
    }

    const callPayload = {
      id: callLogId,
      callId: callLogId,
      bookingId: booking!.id,
      callerId: caller.userId,
      receiverId,
      shopId: booking!.shopId,
      roomUrl,
      roomName,
      status: 'RINGING',
      duration: 0,
      createdAtMs: Date.now(),
      createdAt: new Date().toISOString(),
      booking: {
        id: booking!.id,
        vehicleDetails: booking!.vehicleDetails,
        customer: { id: booking!.customer?.id, email: booking!.customer?.email, phoneNumber: booking!.customer?.phoneNumber },
        shop: { id: booking!.shop?.id, name: booking!.shop?.name, phone: booking!.shop?.phone },
      },
      caller: {
        id: caller.userId,
        email: caller.email || '',
        role: caller.role,
      },
    };

    // 1. Save to L1 in-memory map
    activeCallsMap.set(callLogId, callPayload);
    activeCallsMap.set(booking!.id, callPayload);

    // 2. Save to L2 Redis with auto-expiry
    try {
      const serialized = JSON.stringify(callPayload);
      await Promise.all([
        redis.set(redisCallKey(callLogId), serialized, { ex: 120 }),
        redis.set(redisBookingKey(booking!.id), serialized, { ex: 120 }),
        redis.set(redisUserIncomingKey(receiverId), callLogId, { ex: 45 }),
        booking!.shopId ? redis.set(redisShopIncomingKey(booking!.shopId), callLogId, { ex: 45 }) : Promise.resolve(),
        redis.set(redisGlobalIncomingKey(), callLogId, { ex: 45 }),
      ]);
    } catch (redisErr) {
      console.warn('Redis call cache warning:', redisErr);
    }

    // Send In-App Notification (non-blocking)
    const callerTitle = caller.role === 'CUSTOMER' ? 'Customer' : 'Service Advisor';
    NotificationService.createNotification({
      userId: receiverId,
      title: `📞 Incoming Call from ${callerTitle}`,
      message: `${callerTitle} is calling regarding booking #${bookingId.slice(0, 8)}. Click to answer.`,
      type: 'INCOMING_CALL',
      link: `/call/${callLogId}?roomUrl=${encodeURIComponent(roomUrl)}`,
    }).catch(() => {});

    return {
      callId: callLogId,
      roomUrl,
      roomName,
      bookingId: booking!.id,
      callerId: caller.userId,
      receiverId,
      receiverName,
      status: 'RINGING',
    };
  },

  // 2. Update Call Status (CONNECTED, MISSED, REJECTED, ENDED) + Duration
  async updateCallStatus(callId: string, status: 'RINGING' | 'CONNECTED' | 'MISSED' | 'REJECTED' | 'ENDED', duration = 0) {
    // 1. Update in-memory cache
    let inMem = activeCallsMap.get(callId);
    if (!inMem) {
      for (const call of activeCallsMap.values()) {
        if (call.id === callId || call.bookingId === callId) {
          inMem = call;
          break;
        }
      }
    }

    if (inMem) {
      inMem.status = status;
      if (duration > 0) inMem.duration = duration;
      if (activeCallsMap.has(inMem.id)) activeCallsMap.get(inMem.id).status = status;
      if (activeCallsMap.has(inMem.bookingId)) activeCallsMap.get(inMem.bookingId).status = status;
    }

    // 2. Update Redis
    try {
      if (inMem) {
        await redis.set(redisCallKey(inMem.id), JSON.stringify(inMem), { ex: 120 });
        if (inMem.bookingId) {
          await redis.set(redisBookingKey(inMem.bookingId), JSON.stringify(inMem), { ex: 120 });
        }
      }

      if (status === 'CONNECTED' || status === 'ENDED' || status === 'REJECTED' || status === 'MISSED') {
        // Clear ringing signals from Redis
        if (inMem) {
          await Promise.all([
            redis.del(redisUserIncomingKey(inMem.receiverId)),
            inMem.shopId ? redis.del(redisShopIncomingKey(inMem.shopId)) : Promise.resolve(),
            redis.del(redisGlobalIncomingKey()),
          ]);
        }
      }

      if (status === 'ENDED' || status === 'REJECTED' || status === 'MISSED') {
        callSignals.delete(callId);
        if (inMem) {
          callSignals.delete(inMem.id);
          callSignals.delete(inMem.bookingId);
        }
        setTimeout(() => {
          activeCallsMap.delete(callId);
          if (inMem) {
            activeCallsMap.delete(inMem.id);
            activeCallsMap.delete(inMem.bookingId);
          }
        }, 15000);
      }
    } catch (redisErr) {
      console.warn('Redis status update error:', redisErr);
    }

    // 3. Sync to Database (Try by id, then by bookingId)
    try {
      let dbCall = await prisma.callLog.findUnique({ where: { id: callId } }).catch(() => null);
      if (!dbCall) {
        dbCall = await prisma.callLog.findFirst({
          where: { bookingId: callId },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
      }

      if (dbCall) {
        const updated = await prisma.callLog.update({
          where: { id: dbCall.id },
          data: {
            status: status as any,
            duration: duration > 0 ? duration : inMem?.duration || dbCall.duration,
          },
        });
        return updated;
      }
    } catch (err) {
      console.warn('DB updateCallStatus sync error:', err);
    }

    return inMem || { id: callId, status, duration };
  },

  // 3. Get Call Log by ID (In-memory -> Redis -> DB)
  async getCallById(callId: string) {
    // 1. Check L1 Memory
    const inMem = activeCallsMap.get(callId);
    if (inMem) return inMem;
    for (const call of activeCallsMap.values()) {
      if (call.id === callId || call.bookingId === callId) {
        return call;
      }
    }

    // 2. Check L2 Redis
    try {
      const fromRedis = await redis.get<any>(redisCallKey(callId));
      if (fromRedis) {
        const parsed = typeof fromRedis === 'string' ? JSON.parse(fromRedis) : fromRedis;
        activeCallsMap.set(callId, parsed);
        return parsed;
      }
      const fromBookingRedis = await redis.get<any>(redisBookingKey(callId));
      if (fromBookingRedis) {
        const parsed = typeof fromBookingRedis === 'string' ? JSON.parse(fromBookingRedis) : fromBookingRedis;
        activeCallsMap.set(callId, parsed);
        return parsed;
      }
    } catch (redisErr) {}

    // 3. Check L3 Database
    try {
      const byId = await prisma.callLog.findUnique({
        where: { id: callId },
        include: {
          booking: {
            select: {
              id: true,
              vehicleDetails: true,
              customer: { select: { id: true, email: true, phoneNumber: true } },
              shop: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });
      if (byId) return byId;

      const byBooking = await prisma.callLog.findFirst({
        where: { bookingId: callId },
        include: {
          booking: {
            select: {
              id: true,
              vehicleDetails: true,
              customer: { select: { id: true, email: true, phoneNumber: true } },
              shop: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (byBooking) return byBooking;
    } catch (e) {}

    return null;
  },

  // 4. Get Call History for a Booking
  async getCallLogsByBooking(bookingId: string) {
    return prisma.callLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);
  },

  // 5. Check for active incoming ringing call (Sub-millisecond L1 Memory + L2 Redis + L3 DB)
  async getIncomingCall(user: { userId: string; role: string; shopId?: string | null }) {
    const now = Date.now();

    // 1. Scan L1 Memory Cache (<0.01ms)
    for (const call of activeCallsMap.values()) {
      if (call.status === 'RINGING' && now - call.createdAtMs < 45000) {
        if (call.callerId !== user.userId) {
          if (user.role === 'CUSTOMER') {
            if (call.receiverId === user.userId || call.booking?.customer?.id === user.userId) {
              return call;
            }
          } else {
            // Staff / Service Advisor / Owner
            if (
              call.receiverId === user.userId ||
              (user.shopId && call.shopId === user.shopId) ||
              (user.role === 'OWNER' || user.role === 'SERVICE_ADVISOR')
            ) {
              return call;
            }
          }
        }
      }
    }

    // 2. Scan L2 Redis (<1ms)
    try {
      let callId: string | null = null;

      // Direct user match
      callId = await redis.get<string>(redisUserIncomingKey(user.userId));

      // Shop staff match
      if (!callId && user.shopId) {
        callId = await redis.get<string>(redisShopIncomingKey(user.shopId));
      }

      // Role-based global fallback for demo (if not caller)
      if (!callId) {
        const globalCallId = await redis.get<string>(redisGlobalIncomingKey());
        if (globalCallId) {
          const callData = await this.getCallById(globalCallId);
          if (callData && callData.callerId !== user.userId && callData.status === 'RINGING') {
            // If caller was customer, staff can receive; if caller was staff, customer can receive
            if (
              (callData.caller?.role === 'CUSTOMER' && user.role !== 'CUSTOMER') ||
              (callData.caller?.role !== 'CUSTOMER' && user.role === 'CUSTOMER')
            ) {
              return callData;
            }
          }
        }
      }

      if (callId) {
        const callData = await this.getCallById(callId);
        if (callData && callData.status === 'RINGING' && callData.callerId !== user.userId) {
          return callData;
        }
      }
    } catch (redisErr) {}

    // 3. L3 DB fallback (with wide tolerance)
    const activeCutoff = new Date(Date.now() - 40000);
    const whereClause: any =
      user.role === 'CUSTOMER'
        ? {
            receiverId: user.userId,
            callerId: { not: user.userId },
            status: 'RINGING',
            createdAt: { gte: activeCutoff },
          }
        : {
            status: 'RINGING',
            createdAt: { gte: activeCutoff },
            callerId: { not: user.userId },
            OR: [
              { receiverId: user.userId },
              ...(user.shopId ? [{ booking: { shopId: user.shopId } }] : []),
            ],
          };

    try {
      const call = await prisma.callLog.findFirst({
        where: whereClause,
        include: {
          booking: {
            select: {
              id: true,
              vehicleDetails: true,
              customer: { select: { id: true, email: true, phoneNumber: true } },
              shop: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!call) return null;

      const callerUser = await prisma.user.findUnique({
        where: { id: call.callerId },
        select: { id: true, email: true, role: true, phoneNumber: true },
      }).catch(() => null);

      return {
        ...call,
        caller: callerUser,
      };
    } catch (err) {
      return null;
    }
  },

  // 6. WebRTC Signaling: Add Signal (offer, answer, ice-candidate)
  getSignalKey(callId: string): string {
    const inMem = activeCallsMap.get(callId);
    if (inMem && inMem.bookingId) return `call_room:${inMem.bookingId}`;
    return `call_room:${callId}`;
  },

  addSignal(callId: string, sender: 'caller' | 'receiver', type: string, payload: any) {
    const key = this.getSignalKey(callId);
    let list = callSignals.get(key);
    if (!list) {
      list = [];
      callSignals.set(key, list);
    }

    const newSignal: CallSignal = {
      id: Math.random().toString(36).slice(2),
      sender,
      type,
      payload,
      timestamp: Date.now(),
    };

    list.push(newSignal);
    if (list.length > 100) list.shift();

    callSignals.set(callId, list);
    const inMem = activeCallsMap.get(callId);
    if (inMem) {
      if (inMem.id) callSignals.set(inMem.id, list);
      if (inMem.bookingId) callSignals.set(inMem.bookingId, list);
    }

    return newSignal;
  },

  // 7. WebRTC Signaling: Get Signals from opposing party
  getSignals(callId: string, sender: 'caller' | 'receiver', afterTimestamp = 0) {
    const key = this.getSignalKey(callId);
    const list = callSignals.get(key) || callSignals.get(callId) || [];
    return list.filter((s) => s.sender !== sender && s.timestamp > afterTimestamp);
  },
};
