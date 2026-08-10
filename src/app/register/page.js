"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult({ ok: res.ok, data });
    } catch (err) {
      setResult({ ok: false, data: { message: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-1">สมัครสมาชิก</h1>
        <p className="text-sm text-zinc-500 mb-6">Bill Splitting App</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">ชื่อ</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ชื่อ"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">อีเมล</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="อย่างน้อย 6 ตัว"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black dark:bg-white text-white dark:text-black py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>

        </form>
        <div>
           <p className="text-sm text-zinc-500 text-center mt-6">
          มีบันชีอยู่แล้ว?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 underline">
            เข้าสู่ระบบเลย
          </a>
        </p>
        </div>
        {result && result.ok && (
          <div className="mt-4 rounded-md border border-green-300 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">✅ สมัครสมาชิกสำเร็จ</p>
            <p className="text-zinc-500 mt-1">User ID: {result.data.user?.id} — {result.data.user?.email}</p>
            
    
          </div>
        )}

        {result && !result.ok && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">❌ {result.data.message || 'เกิดข้อผิดพลาด'}</p>
          </div>
        )}
      </div>
    </div>
  );
}