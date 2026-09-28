'use client'

import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
    const router = useRouter();

    const [user, setUser] = useState({})
    const [groups, setGroups] = useState([]);
    const [summary, setSummary] = useState({ toPay: 0, toReceive: 0 });
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rate, setRate] = useState(null);
    const [loadingRate, setLoadingRate] = useState(false);
    const [rateError, setRateError] = useState('');
    const [moneyType, setMoneyType] = useState('THB');
    const [loadingGroups, setLoadingGroups] = useState(true)
    useEffect(() => {
        if (moneyType === 'THB') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRate(null); //ถ้าไม่มีก็กลับแสดงค่าเดิม
            return;
        }
        async function fetchRate() {
            setLoadingRate(true);
            setRateError('');
            try {
                const res = await fetch(`https://api.frankfurter.dev/v1/latest?from=THB&to=${moneyType}`);
                const data = await res.json();
                setRate(data.rates[moneyType]);
            } catch (err) {
                setRateError('ดึงอัตราแลกเปลี่ยนไม่สำเร็จ');
            } finally {
                setLoadingRate(false);
            }
        }
        fetchRate();
    }, [moneyType]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'))

        const loadData = async () => {
            try {
                if (user) {
                    setUser(user)
                }
                const [groupReply, summaryReply] = await Promise.all([
                    fetch('/api/groups/'),
                    fetch('/api/summary/'),
                ])
                const groupData = await groupReply.json()
                const summaryData = await summaryReply.json()
                if (groupReply.ok) {
                    setGroups(groupData.groups);
                }
                if (summaryReply.ok) {
                    setSummary(summaryData.summary);
                    setActions(summaryData.actions);
                }
            } catch (error) {
                console.error('โหลดข้อมูลไม่สำเร็จ:', error);
            } finally {
                setLoading(false);
                setLoadingGroups(false)
            }
        }

        loadData();
    }, [])
    async function handleLogout() {
        await fetch('/api/auth/logout', {method: 'POST'})
        localStorage.removeItem('user');
        router.push('/login');
    }

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex mb-4">
                    <div className="flex-1">
                        <p className="text-zinc-400">สวัสดี</p>
                        <p className="text-zinc-50 font-semibold text-xl">{user.name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                    >
                        <p className="text-zinc-50">ออกจากระบบ</p>
                    </button>
                </div>

                <div className="mb-3 flex items-center gap-2 text-sm mt-2">
                    <span className="text-zinc-400">แสดงเป็น:</span>
                    <select
                        value={moneyType}
                        onChange={(e) => setMoneyType(e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-50"
                    >
                        <option value="THB">THB</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="JPY">JPY</option>
                        <option value="GBP">GBP</option>
                    </select>
                    {loadingRate && <span className="text-zinc-500">กำลังโหลดอัตรา...</span>}
                    {rateError && <span className="text-red-400">{rateError}</span>}
                </div>

                {/* สรุปยอด */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-lg bg-zinc-900  border-zinc-800 p-4">
                        <p className="text-xs text-zinc-400 mb-1">คุณต้องจ่าย</p>
                        <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                            {formatMoney(summary.toPay ?? 0, rate, moneyType)}
                        </p>
                    </div>
                    <div className="rounded-lg bg-zinc-900  border-zinc-800 p-4">
                        <p className="text-xs text-zinc-400 mb-1">คุณจะได้รับ</p>
                        <p className="text-2xl font-semibold text-green-400">
                            {formatMoney(summary.toReceive ?? 0, rate, moneyType)}
                        </p>
                    </div>
                </div>
                {/* รายการรอดำเนินการ */}
                {!loading && actions.length > 0 && (
                    <div>
                        <h2 className="mb-2 text-sm font-medium text-zinc-300">รายการรอดำเนินการ</h2>

                        {actions.map((a) => {
                            const isPay = a.type === 'pay';
                            return (
                                <Link
                                    key={`${a.group_id}-${a.type}-${a.user_id}`}
                                    href={`/groups/${a.group_id}`}
                                    className={`flex items-center gap-3 mb-2 rounded-lg border bg-zinc-900 p-4 ${isPay ? 'border-red-400/40' : 'border-zinc-800'}`}
                                >
                                    <div className="flex-1">
                                        <p className="text-zinc-400 text-xs">{a.group_name}</p>
                                        <p className="text-zinc-50">{isPay ? `คุณต้องโอนให้ ${a.user_name}` : `${a.user_name} ต้องโอนให้คุณ`}</p>
                                    </div>
                                    <p className={`${isPay ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(a.amount ?? 0, rate, moneyType)}</p>
                                </Link>
                            )
                        })}
                    </div>
                )}
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
                                    <div className="flex-1">
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
        </div >
    )
}
