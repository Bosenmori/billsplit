'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({ toPay: 0, toReceive: 0 });
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = JSON.parse(localStorage.getItem('user'));

    if (!token || !stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(stored);
    setChecked(true);

    const loadData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // ยิง 2 API พร้อมกัน
        const [groupsRes, summaryRes] = await Promise.all([
          fetch('/api/groups', { headers }),
          fetch('/api/summary', { headers }),
        ]);

        const [groupsData, summaryData] = await Promise.all([
          groupsRes.json(),
          summaryRes.json(),
        ]);

        if (groupsRes.ok) setGroups(groupsData.groups);
        if (summaryRes.ok) {
          setSummary(summaryData.summary);
          setActions(summaryData.actions);
        }
      } catch (err) {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  // ---------- ยังไม่ได้ login ----------
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-y-2">
          <h1 className="text-3xl text-zinc-50">Bill Splitting App</h1>
          <p className="text-base text-zinc-400">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
          <Link className="text-sm text-zinc-300 underline hover:text-zinc-50" href="/login">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  // ---------- login แล้ว ----------
  return (
    <div className="flex min-h-screen justify-center bg-black px-4">
      <div className="w-full max-w-lg">
        {/* header */}
        <div className="mt-6 mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">สวัสดี</p>
            <h1 className="text-xl font-medium text-zinc-50">{user?.name}</h1>
          </div>
          <button className="text-sm text-zinc-400 hover:text-zinc-50" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>

        {/* สรุปยอด */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-1 text-xs text-zinc-400">คุณต้องจ่าย</p>
            <p className="text-2xl font-semibold text-red-400">
              ฿{loading ? '–' : summary.toPay}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-1 text-xs text-zinc-400">คุณจะได้รับ</p>
            <p className="text-2xl font-semibold text-green-400">
              ฿{loading ? '–' : summary.toReceive}
            </p>
          </div>
        </div>

        {/* รายการรอดำเนินการ (แสดงเฉพาะตอนมีรายการ) */}
        {!loading && actions.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-zinc-300">รายการรอดำเนินการ</h2>
            <div className="space-y-2">
              {actions.map((a) => {
                const isPay = a.type === 'pay';
                return (
                  <Link
                    key={`${a.group_id}-${a.type}-${a.user_id}`}
                    href={`/groups/${a.group_id}`}
                    className={`flex items-center gap-3 rounded-lg border bg-zinc-900 p-4 ${
                      isPay ? 'border-red-400/40' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400">{a.group_name}</p>
                      <p className="text-zinc-50">
                        {isPay ? `คุณต้องโอนให้ ${a.user_name}` : `${a.user_name} ต้องโอนให้คุณ`}
                      </p>
                    </div>
                    <p className={`font-semibold ${isPay ? 'text-red-400' : 'text-green-400'}`}>
                      ฿{a.amount.toFixed(2)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* กลุ่ม */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">กลุ่มของฉัน</h2>
          <Link href="/groups/new" className="text-sm text-blue-400">
            + สร้างกลุ่ม
          </Link>
        </div>

        <div className="mb-6">
          {loading ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
              <p className="text-sm text-zinc-400">กำลังโหลด...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
              <p className="mb-3 text-sm text-zinc-400">ยังไม่มีกลุ่ม</p>
              <Link
                href="/groups/new"
                className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
              >
                สร้างกลุ่มแรกของคุณ
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-100">{group.name}</p>
                    <p className="text-xs text-zinc-400">{group.member_count} คน</p>
                  </div>
                  <span className="text-zinc-500">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}