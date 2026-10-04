'use client';

import { useState } from 'react';

export default function PayButton({ groupId, toUserId, toName, amount, onPaid }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    const ok = window.confirm(`โอน ${Number(amount).toFixed(2)} บาท ให้ ${toName}?`);
    if (!ok) return;

    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, toUserId, amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }
      onPaid?.();
    } catch {
      setError('เชื่อมต่อ server ไม่ได้');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className={`rounded-lg px-3 py-1 text-sm font-medium ${
          paying ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-white text-black'
        }`}
      >
        {paying ? 'กำลังโอน...' : 'จ่ายเงิน'}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}