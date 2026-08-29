'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// mock up 
const MOCK_SUMMARY = {
  totalOwe: 1250,
  totalReceive: 840,
};

const MOCK_ACTIONS = [
  { id: 1, personName: 'Weerachit', amount: 250, groupName: 'ทริปชะอำ' },
  { id: 2, personName: 'Yanawut', amount: 1000, groupName: 'ค่าหอพัก' },
];

const MOCK_GROUPS = [
  { id: 1, name: 'ทริปชะอำ', memberCount: 4, myBalance: -250 },
  { id: 2, name: 'ค่าหอพัก', memberCount: 2, myBalance: 840 },
  { id: 3, name: 'ปาร์ตี้ปีใหม่', memberCount: 6, myBalance: 0 },
];
// ──────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setUser(JSON.parse(stored));
    setChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  if (!checked) return null;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            Bill Splitting App
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            กรุณาเข้าสู่ระบบก่อนใช้งาน
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-lg px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">สวัสดี</p>
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              {user.name}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* สรุปยอด */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">คุณต้องจ่าย</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              ฿{MOCK_SUMMARY.totalOwe.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">คุณจะได้รับ</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              ฿{MOCK_SUMMARY.totalReceive.toLocaleString()}
            </p>
          </div>
        </div>

        {/* รอดำเนินการ */}
        {MOCK_ACTIONS.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              รอดำเนินการ
            </h2>
            <div className="space-y-2">
              {MOCK_ACTIONS.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div>
                    <p className="text-sm text-black dark:text-zinc-100">
                      ติดเงิน <span className="font-medium">{action.personName}</span> ฿
                      {action.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {action.groupName}
                    </p>
                  </div>
                  <button className="rounded-md bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-medium">
                    จ่ายเงิน
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* กลุ่มของฉัน */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            กลุ่มของฉัน
          </h2>
          <Link href="/groups/new" className="text-sm text-blue-600 dark:text-blue-400">
            + สร้างกลุ่ม
          </Link>
        </div>

        <div className="space-y-2">
          {MOCK_GROUPS.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center justify-between rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div>
                <p className="font-medium text-black dark:text-zinc-100">{group.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {group.memberCount} คน
                </p>
              </div>
              <BalanceLabel amount={group.myBalance} />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}

function BalanceLabel({ amount }) {
  if (amount === 0) {
    return <span className="text-sm text-zinc-400 dark:text-zinc-500">เคลียร์แล้ว</span>;
  }
  const isOwe = amount < 0;
  return (
    <div className="text-right">
      <p
        className={`text-sm font-semibold ${
          isOwe ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}
      >
        {isOwe ? '-' : '+'}฿{Math.abs(amount).toLocaleString()}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {isOwe ? 'ต้องจ่าย' : 'จะได้รับ'}
      </p>
    </div>
  );
}