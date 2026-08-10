'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(stored));
    }
    setChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!checked) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm text-center">
        {user ? (
          <div>
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 mb-2">
              Welcome, {user.name} 
            </h1>
            <p className="text-sm text-zinc-500 mb-6">{user.email}</p>
            <button
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
              Bill Splitting App
            </h1>
            <p className="text-sm text-zinc-500 mb-6">กรุณาเข้าสู่ระบบ</p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}