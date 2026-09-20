'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';


const formatBaht = (value) => Number(value).toFixed(2);

const formatDate = (value) =>
    new Date(value).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

export default function GroupDetailPage() {
    const params = useParams();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [myRole, setMyRole] = useState('');
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expensesError, setExpensesError] = useState('');

    // ฟอร์มเชิญสมาชิก
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formResult, setFormResult] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };


                const [groupRes, expensesRes] = await Promise.all([
                    fetch(`/api/groups/${params.id}`, { headers }),
                    fetch(`/api/expenses?groupId=${params.id}`, { headers }),
                ]);

                const groupData = await groupRes.json();
                if (!groupRes.ok) {
                    setError(groupData.message || 'เกิดข้อผิดพลาด');
                    return;
                }
                setGroup(groupData.group);
                setMembers(groupData.members);
                setMyRole(groupData.myRole);


                const expensesData = await expensesRes.json();
                if (expensesRes.ok) {
                    setExpenses(expensesData.expenses);
                } else {
                    setExpensesError(expensesData.message || 'โหลดรายจ่ายไม่สำเร็จ');
                }
            } catch (err) {
                setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
            } finally {
                setLoading(false);
            }
        }

        loadData();
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

    if (loading) {
        return (
            <main className="min-h-screen bg-black p-6">
                <p className="text-zinc-400">กำลังโหลด...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-black p-6">
                <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                    <p className="text-red-400">{error}</p>
                    <Link
                        href="/"
                        className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                    >
                        กลับหน้าแรก
                    </Link>
                </div>
            </main>
        );
    }
    
    //หน้าปดติ
    return (
        <main className="min-h-screen bg-black p-6">
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
                <section className="mt-6">
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
                </section>

                {/* รายจ่ายทั้งหมด */}
                <section className="mt-6">
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

                    {expensesError && (
                        <p className="mb-3 text-sm text-red-400">{expensesError}</p>
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
                                            {formatBaht(expense.amount_thb)} บาท
                                        </p>
                                    </div>

                                    <div className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
                                        {expense.splits.map((split) => (
                                            <div
                                                key={split.user_id}
                                                className="flex justify-between text-sm text-zinc-400"
                                            >
                                                <span>{split.name}</span>
                                                <span>{formatBaht(split.share_amount)} บาท</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* เชิญสมาชิก */}
                {myRole === 'admin' && (
                    <section className="mt-6">
                        <h2 className="mb-3 text-sm font-medium text-zinc-400">เชิญสมาชิก</h2>

                        <form onSubmit={handleInvite} className="flex gap-2">
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
                                disabled={submitting}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                            >
                                {submitting ? 'กำลังเชิญ...' : 'เชิญ'}
                            </button>
                        </form>

                        {formResult && (
                            <p
                                className={`mt-2 text-sm ${formResult.ok ? 'text-green-400' : 'text-red-400'
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