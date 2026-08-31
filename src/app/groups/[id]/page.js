'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GroupDetailPage() {
  const params = useParams();

  // ข้อมูลหลัก 
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ฟอร์มเชิญสมาชิก
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formResult, setFormResult] = useState(null);

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

        setGroup(result.group);
        setMembers(result.members);
        setMyRole(result.myRole);
      } catch (err) {
        setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    }

    loadGroup();
  }, [params.id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormResult(null);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/groups/${params.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setFormResult({ ok: false, message: result.message || 'เชิญไม่สำเร็จ' });
        return;
      }

      setMembers([...members, result.member]);
      setEmail('');
      setFormResult({ ok: true, message: result.message });
    } catch (err) {
      setFormResult({ ok: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' });
    } finally {
      setSubmitting(false);
    }
  };

  // สถานะกำลังโหลด 
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
        <p className="text-zinc-500 dark:text-zinc-400">กำลังโหลด...</p>
      </main>
    );
  }

  // สถานะ error
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

  // หน้าปกติ 
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

        {/* ฟอร์มเชิญสมาชิก (เฉพาะ admin) */}
        {myRole === 'admin' && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              เชิญสมาชิก
            </h2>

            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {submitting ? 'กำลังเชิญ...' : 'เชิญ'}
              </button>
            </form>

            {formResult && (
              <p
                className={`mt-2 text-sm ${
                  formResult.ok
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formResult.ok ? '✅' : '❌'} {formResult.message}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}