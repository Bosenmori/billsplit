'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push('/');
      } else {
        setError(data.message || 'สร้างกลุ่มไม่สำเร็จ');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-lg px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 mb-2 inline-block"
          > ← กลับ
          </Link>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            สร้างกลุ่มใหม่
          </h1>
        </div>

        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                ชื่อกลุ่ม
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoFocus
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น ทริปเชียงใหม่, ค่าหอพัก"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-md bg-black dark:bg-white text-white dark:text-black py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}
            </button>

            {error && (
              <div className="rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2">
                <p className="text-sm text-red-700 dark:text-red-400">❌ {error}</p>
              </div>
            )}
          </form>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-4">
          คุณจะเป็นผู้ดูแลกลุ่มนี้โดยอัตโนมัติ
        </p>

      </div>
    </div>
  );
}