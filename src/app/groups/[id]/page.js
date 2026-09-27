'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatMoney } from '@/lib/format';

export default function GroupDetailPage() {
    const params = useParams();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [myRole, setMyRole] = useState('');
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expenseError, setExpenseError] = useState('');
    const [moneyType, setMoneyType] = useState('THB');
    const [rate, setRate] = useState(null);
    const [loadingRate, setLoadingRate] = useState(false);
    const [rateError, setRateError] = useState('');
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);
    const [balances, setBalances] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [me, setMe] = useState(null);

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
    },[moneyType]);

    useEffect(() => {
        async function loadData() {
            try {
                setMe(JSON.parse(localStorage.getItem('user')));

                const [groupReply, expenseReply, balancesReply] = await Promise.all([
                    fetch(`/api/groups/${params.id}`,),
                    fetch(`/api/expenses?groupId=${params.id}`,),
                    fetch(`/api/balances?groupId=${params.id}`,)
                ]);

                const groupData = await groupReply.json();
                if (!groupReply.ok) {
                    setError(groupData.message || 'เกิดข้อผิดพลาด');
                    return;
                }
                setGroup(groupData.group);
                setMembers(groupData.members);
                setMyRole(groupData.myRole);
                const expenseData = await expenseReply.json();
                if (expenseReply.ok) {
                    setExpenses(expenseData.expenses);
                } else {
                    setExpenseError(expenseData.message || 'โหลดรายจ่ายไม่สำเร็จ');
                }
                const balancesData = await balancesReply.json();
                if (balancesReply.ok) {
                    setBalances(balancesData.balances)
                    setTransactions(balancesData.transactions)
                }
            } catch (err) {
                setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setInviteResult(null);

        try {
            const res = await fetch(`/api/groups/${params.id}/members`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({ email }),
            });
            const result = await res.json();
            if (!res.ok) {
                setInviteResult({ ok: false, message: result.message || 'เชิญไม่สำเร็จ' });
                return;
            }
            setMembers([...members, result.member]);
            setEmail('');
            setInviteResult({ ok: true, message: result.message });
        } catch (err) {
            setInviteResult({ ok: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' });
        } finally {
            setSending(false);
        }
    };
    if (loading) {
        return (
            <div className="min-h-screen bg-black p-6">
                <p className="text-zinc-400">กำลังโหลด...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black p-6">
                <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                    <p className="text-red-400">{error}</p>
                    <Link
                        href="/home"
                        className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                    >
                        กลับหน้าแรก
                    </Link>
                </div>
            </div>
        );
    }

    //หน้าปดติ
    return (
        <div className="min-h-screen bg-black p-6">
            <div className="mx-auto max-w-2xl">
                <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-50">
                    ← กลับ
                </Link>

                {/* หัวข้อกลุ่ม */}
                <div className="mt-4">
                    <h1 className="text-2xl font-bold text-zinc-50">{group.name}</h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        สร้างโดย {group.created_by_name} · {formatDate(group.created_at)}
                    </p>
                </div>

                {/* รายชื่อสมาชิก */}
                <div className="mt-6">
                    <h2 className="mb-3 text-sm font-medium text-zinc-400">
                        สมาชิก ({members.length})
                    </h2>

                    <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
                        {members.map((member) => (
                            <div key={member.user_id} className="flex items-center justify-between p-4">
                                <div>
                                    <p className="font-medium text-zinc-50">{member.name}</p>
                                    <p className="text-sm text-zinc-400">{member.email}</p>
                                </div>
                                {member.role === 'admin' && (
                                    <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                                        admin
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* รายจ่ายทั้งหมด */}
                <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-zinc-400">
                            รายจ่ายทั้งหมด ({expenses.length})
                        </h2>
                        <Link
                            href={`/groups/${params.id}/expenses/new`}
                            className="text-sm text-zinc-300 hover:text-zinc-50"
                        >
                            + เพิ่มรายจ่าย
                        </Link>
                    </div>

                    {expenseError && (
                        <p className="mb-3 text-sm text-red-400">{expenseError}</p>
                    )}
                    {expenses.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                            <p className="text-sm text-zinc-400">ยังไม่มีรายจ่ายในกลุ่มนี้</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map((expense) => (
                                <div
                                    key={expense.id}
                                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-zinc-50">{expense.title}</p>
                                            <p className="mt-0.5 text-sm text-zinc-400">
                                                {expense.category && <>{expense.category} · </>}
                                                จ่ายโดย {expense.paid_by_name} · {formatDate(expense.expense_date)}
                                            </p>
                                        </div>
                                        <p className="whitespace-nowrap font-semibold text-zinc-50">
                                            {formatMoney(expense.amount, rate, moneyType)}
                                        </p>
                                    </div>
                                    <div className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
                                        {expense.splits.map((split) => (
                                            <div
                                                key={split.user_id}
                                                className="flex justify-between text-sm text-zinc-400"
                                            >
                                                <span>{split.name}</span>
                                                <span>{formatMoney(split.share_amount, rate, moneyType)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* สรุปรายจ่าย */}
                <div className='mt-4'>
                    <h2 className='mb-3 text-sm font-medium text-zinc-400'>สรุปยอด</h2>

                    <div className='rounded-xl border border-zinc-800 bg-zinc-900 p-6'>
                        <p className='text-zinc-50 font-medium'>ยอดคงเหลือ</p>
                        <p className='mt-0.5 text-sm text-zinc-400 mb-4'>บวก = จะได้รับ · ลบ = ต้องจ่าย</p>
                        <div className=''>
                            {balances.map((b) => (
                                <div
                                    key={b.user_id}
                                    className='flex items-center gap-3 border-t border-zinc-800 py-3'
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-50">
                                        {b.name.charAt(0).toUpperCase()}
                                    </div>

                                    <div className='flex-1'>
                                        <p className="text-zinc-50"> {b.name} </p>
                                        <p className="text-xs text-zinc-400">
                                            {b.net > 0 ? 'จะได้รับ' : b.net < 0 ? 'ต้องจ่าย' : 'เคลียร์แล้ว'}
                                        </p>
                                    </div>
                                    <p className={`font-semibold ${netColor(b.net)}`}>
                                        {b.net > 0 ? '+' : ''}{formatMoney(b.net, rate, moneyType)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className='mt-4'>
                    <h2 className='mb-3 text-sm font-medium text-zinc-400'>สรุปรายจ่าย</h2>
                    <div className='rounded-xl bg-zinc-900 border border-zinc-800 p-6'>
                        <p className='text-zinc-50 font-medium mb-3'>ต้องโอน</p>
                        {transactions.length === 0 ? (
                            <div>
                                <p className="mt-2 text-sm text-zinc-400">ไม่มีหนี้ค้าง</p>
                            </div>
                        ) : (
                            <div>
                                {transactions.map((t) => {
                                    const isME = t.from_user_id === me?.id;
                                    return (
                                        <div
                                            key={`${t.from_user_id}-${t.to_user_id}`}
                                            className={`mb-2 flex items-center gap-2 rounded-lg border p-3 
                                                ${isME ? 'border-red-400/40':'border-zinc-800'}`}
                                        >
                                            <div className='flex-1'>
                                                <p className='text-zinc-50'>{t.from_name} → {t.to_name}</p>
                                            </div>
                                            <p className={`font-semibold t
                                            ${isME ? 'text-red-400':'text-zinc-50'}`   
                                            } >
                                                {formatMoney(t.amount, rate, moneyType)}</p>
                                        </div>
                                    )})}
                            </div>)}
                    </div>
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

                {/* เชิญสมาชิก */}
                {myRole === 'admin' && (
                    <div className="mt-6">
                        <h2 className="mb-3 text-sm font-medium text-zinc-400">เชิญสมาชิก</h2>

                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="email@example.com"
                                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            />
                            <button
                                type="submit"
                                disabled={sending}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                            >
                                {sending ? 'กำลังเชิญ...' : 'เชิญ'}
                            </button>
                        </form>

                        {inviteResult && (
                            <p className={`mt-2 text-sm ${inviteResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                                {inviteResult.ok ? '✅' : '❌'} {inviteResult.message}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const netColor = (value) => {
    return value === 0 ? 'text-zinc-400' : value < 0 ? 'text-red-400' : 'text-green-400'
}

