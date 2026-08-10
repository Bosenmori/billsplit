'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok && data.status === 'ok') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setResult({ ok: true, data });
        setTimeout(() => router.push('/'), 800);
      } else {
        setResult({ ok: false, data });
      }
    } catch (err) {
      setResult({ ok: false, data: { message: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-1">เข้าสู่ระบบ</h1>
        <p className="text-sm text-zinc-500 mb-6">Bill Splitting App</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="รหัสผ่าน"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black dark:bg-white text-white dark:text-black py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {result && result.ok && (
          <div className="mt-4 rounded-md border border-green-300 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              ✅ เข้าสู่ระบบสำเร็จ
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">
              ❌ {result.data.message || 'เกิดข้อผิดพลาด'}
            </p>
          </div>
        )}

        <p className="text-sm text-zinc-500 text-center mt-6">
          ยังไม่มีบัญชี?{' '}
          <a href="/register" className="text-blue-600 dark:text-blue-400 underline">
            สมัครสมาชิก
          </a>
        </p>
      </div>
    </div>
  );
}