'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// แบ่งเงินเป็นสตางค์เพื่อให้ผลรวมตรงกับยอดรายจ่าย
function calculateEqualSplits(amount, memberIds) {
    const totalSatang = Math.round(Number(amount) * 100);
    const n = memberIds.length;
    if (n === 0) return [];

    const baseSatang = Math.floor(totalSatang / n);
    const remainder = totalSatang % n;

    return memberIds.map((userId, index) => ({
        userId,
        shareAmount: (baseSatang + (index < remainder ? 1 : 0)) / 100,
    }));
}

const inputClass =
    'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400';

const labelClass = 'mb-1 block text-sm font-medium text-zinc-300';

export default function NewExpensePage() {
    const router = useRouter();
    const { id: groupId } = useParams();

    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [loadingGroup, setLoadingGroup] = useState(true);
    const [loadError, setLoadError] = useState('');

    // รวมข้อมูลที่กรอกในform
    const [form, setForm] = useState(() => ({
        title: '',
        category: '',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paidBy: '',
        selectedMemberIds: [],
    }));

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        async function fetchGroup() {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/groups/${groupId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                if (!res.ok) {
                    setLoadError(data.message || 'โหลดข้อมูลกลุ่มไม่สำเร็จ');
                    return;
                }

                setGroupName(data.group.name);
                setMembers(data.members);

                const storedUser = JSON.parse(
                    localStorage.getItem('user') || 'null'
                );

                // อัปเดตเฉพาะผู้จ่ายและสมาชิก โดยเก็บช่องอื่นไว้
                setForm((prev) => ({
                    ...prev,
                    paidBy: storedUser?.id ?? data.members[0]?.user_id ?? '',
                    selectedMemberIds: data.members.map((m) => m.user_id),
                }));
            } catch (err) {
                setLoadError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
            } finally {
                setLoadingGroup(false);
            }
        }

        if (groupId) fetchGroup();
    }, [groupId]);

    // ใช้ร่วมกันกับ input และ select
    function handleChange(e) {
        const { name, value } = e.target;

        setForm((prev) => ({...prev,
            [name]: value,
        }));
    }

    // Checkbox อัปเดต array ภายใน form
    function toggleMember(memberId) {
        setForm((prev) => ({...prev,
            selectedMemberIds: prev.selectedMemberIds.includes(memberId)
                ? prev.selectedMemberIds.filter((id) => id !== memberId)
                : [...prev.selectedMemberIds, memberId],
        }));
    }

    const previewSplits =form.amount && form.selectedMemberIds.length > 0 ? 
    calculateEqualSplits(form.amount, form.selectedMemberIds) : [];

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');

        const {
            title,
            category,
            amount,
            expenseDate,
            paidBy,
            selectedMemberIds,
        } = form;

        if (title.trim() === '') {
            setSubmitError('กรุณาระบุชื่อรายจ่าย');
            return;
        }

        const amountNum = Number(amount);

        if (amountNum <= 0) {
            setSubmitError('จำนวนเงินต้องมากกว่า 0');
            return;
        }

        if (selectedMemberIds.length === 0) {
            setSubmitError('ต้องเลือกอย่างน้อย 1 คนที่ร่วมจ่าย');
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    groupId: Number(groupId),
                    paidBy: Number(paidBy),
                    title: title.trim(),
                    category: category.trim() || 'other',
                    amount: amountNum,
                    expenseDate,
                    splits: calculateEqualSplits(amountNum, selectedMemberIds),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setSubmitError(data.message || 'บันทึกรายจ่ายไม่สำเร็จ');
                return;
            }

            router.push(`/groups/${groupId}`);
        } catch (err) {
            setSubmitError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingGroup) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-zinc-400">กำลังโหลด...</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-red-400">{loadError}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black px-4 py-8">
            <div className="mx-auto max-w-lg">
                <Link
                    href={`/groups/${groupId}`}
                    className="mb-4 inline-block text-sm text-zinc-400 hover:text-zinc-200"
                >
                    ← กลับไปหน้ากลุ่ม
                </Link>

                <h1 className="mb-1 text-xl font-semibold text-zinc-50">
                    เพิ่มรายจ่าย
                </h1>
                <p className="mb-6 text-sm text-zinc-400">กลุ่ม: {groupName}</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className={labelClass}>ชื่อรายจ่าย</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="เช่น ค่าข้าวเย็น"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>หมวดหมู่ (ไม่บังคับ)</label>
                        <input
                            type="text"
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            placeholder="เช่น อาหาร, เดินทาง"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>จำนวนเงิน (บาท)</label>
                        <input
                            type="number"
                            name="amount"
                            min="0.01"
                            step="0.01"
                            value={form.amount}
                            onChange={handleChange}
                            placeholder="0.00"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>วันที่</label>
                        <input
                            type="date"
                            name="expenseDate"
                            value={form.expenseDate}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>ใครจ่ายเงินไปก่อน</label>
                        <select
                            name="paidBy"
                            value={form.paidBy}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            {members.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>ใครร่วมจ่ายรายการนี้บ้าง</label>
                        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                            {members.map((m) => (
                                <label
                                    key={m.user_id}
                                    className="flex items-center gap-2 text-sm text-zinc-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.selectedMemberIds.includes(m.user_id)}
                                        onChange={() => toggleMember(m.user_id)}
                                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                                    />
                                    {m.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    {previewSplits.length > 0 && (
                        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm">
                            <p className="mb-2 text-zinc-400">แต่ละคนต้องจ่าย:</p>

                            {previewSplits.map((split) => {
                                const member = members.find(
                                    (m) => m.user_id === split.userId
                                );

                                return (
                                    <div
                                        key={split.userId}
                                        className="flex justify-between text-zinc-200"
                                    >
                                        <span>{member?.name}</span>
                                        <span>{split.shareAmount.toFixed(2)} บาท</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {submitError && (
                        <p className="text-sm text-red-400">{submitError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-md bg-white py-2 font-medium text-black disabled:opacity-50"
                    >
                        {submitting ? 'กำลังบันทึก...' : 'บันทึกรายจ่าย'}
                    </button>
                </form>
            </div>
        </div>
    );
}