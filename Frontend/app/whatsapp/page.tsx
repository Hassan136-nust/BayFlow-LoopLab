'use client';

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function WhatsAppLinkPage() {
  const [qrStatus, setQrStatus] = useState<string>('INITIALIZING');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Connecting to WhatsApp Engine...');

  const fetchQr = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/whatsapp/qr`);
      const data = await res.json();
      if (data.status) setQrStatus(data.status);
      if (data.message) setMessage(data.message);
      if (data.qrCode) setQrCode(data.qrCode);
    } catch (error) {
      console.error(error);
      setMessage('Failed to connect to the backend server.');
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchQr, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-2">Link WhatsApp</h1>
        <p className="text-zinc-400 mb-8 text-sm">
          Connect your business number to automatically send booking updates to customers.
        </p>
        
        <div className="bg-white rounded-xl p-4 flex items-center justify-center min-h-[300px] mb-6">
          {qrStatus === 'CONNECTED' ? (
            <div className="text-emerald-500 font-bold text-xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                ✅
              </div>
              Connected!
            </div>
          ) : qrCode ? (
            <Image 
              src={qrCode} 
              alt="WhatsApp QR Code" 
              width={250} 
              height={250} 
              className="rounded-lg"
            />
          ) : (
            <div className="text-zinc-500 animate-pulse font-medium">
              {message}
            </div>
          )}
        </div>
        
        {qrStatus === 'QR_READY' && (
          <p className="text-zinc-400 text-sm">
            Open WhatsApp on your phone &gt; Linked Devices &gt; Link a Device, and scan this code.
          </p>
        )}
      </div>
    </div>
  );
}
