'use client'

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";



export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState({});
  const [checked, setChecked] = useState(false);
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true);
  useEffect(() => {
    const token = localStorage?.getItem('token');
    const stored = JSON.parse(localStorage.getItem('user'));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser((prev) => ({
      ...prev,
      stored, token
    }))


    if (!token) {
      setLoadingGroups(false);
      return;
    }
    const loadGroups = async () => {
      try {
        const res = await fetch('/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setGroups(data.groups);
      } catch (err) {
        console.error('โหลดกลุ่มไม่สำเร็จ:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
    if (token && stored) {
      setChecked(true);
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }
  if (!checked) {
    return (
      <div className="flex bg-black min-h-screen justify-center items-center">
        <div className="flex flex-col gap-y-2 items-center">
          <h1 className="text-zinc-50 text-3xl">Bill Splitting App</h1>
          <p className="text-zinc-400 text-base">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
          <Link
            className="text-zinc-300 text-sm underline hover:text-zinc-50"
            href='/login'>เข้าสู่ระบบ</Link>
        </div>
      </div>
    )
  }

  if (checked) {
    return (
      <div className="flex min-h-screen bg-black justify-center">
        <div className="w-full max-w-lg">
          {/* headers */}
          <div className="flex justify-between  mt-6.5 mb-5">
            <div>
              <p className="text-zinc-50 ">สวัสดี</p>
              <h1 className="text-zinc-50">{' '}{user.stored.name}</h1>
            </div>
            <button
              className="text-zinc-50"
              onClick={handleLogout}
            >
              ออกจากระบบ
            </button>
          </div>

          {/* สรุปยอด */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-lg bg-zinc-900  border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-1">คุณต้องจ่าย</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                ฿{0}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900  border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-1">คุณจะได้รับ</p>
              <p className="text-2xl font-semibold text-green-400">
                ฿{0}
              </p>
            </div>
          </div>

          {/* กลุ่ม */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              กลุ่มของฉัน
            </h2>
            <Link href="/groups/new" className="text-sm text-blue-600 dark:text-blue-400">
              + สร้างกลุ่ม
            </Link>
          </div>
          
          <div className="item-center mb-6">
            {loadingGroups ? (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6 text-center">
                <p className="text-sm text-zinc-400">กำลังโหลด...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6 text-center">
                <p className="text-sm text-zinc-400 mb-3">
                  ยังไม่มีกลุ่ม
                </p>
                <Link
                  href="/groups/new"
                  className="inline-block rounded-md bg-white text-black px-4 py-2 text-sm font-medium"
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
                    className="flex items-center justify-between rounded-lg bg-zinc-900 borderdark:border-zinc-800 p-4"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{group.name}</p>
                      <p className="text-xs text-zinc-400">
                        {group.member_count} คน
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }
}