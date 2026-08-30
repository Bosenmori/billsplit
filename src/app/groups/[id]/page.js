'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GroupDetailPage() {
  const params = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadGroup() {
      try {
        const token = localStorage.getItem('token');

        const res = await fetch(`/api/groups/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await res.json();

        if (!res.ok) {
          setError(result.message || 'เกิดข้อผิดพลาด');
          return;
        }

        setData(result);
      } catch (err) {
        setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    }

    loadGroup();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
        <p className="text-zinc-500 dark:text-zinc-400">กำลังโหลด...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
        <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  const { group, members } = data;

  return (
    <main className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← กลับ
        </Link>

        {/* หัวข้อกลุ่ม */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            สร้างโดย {group.created_by_name} ·{' '}
            {new Date(group.created_at).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* รายชื่อสมาชิก */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            สมาชิก ({members.length})
          </h2>

          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-black dark:text-zinc-50">
                    {member.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {member.email}
                  </p>
                </div>

                {member.role === 'admin' && (
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}