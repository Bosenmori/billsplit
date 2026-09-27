'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const inputClass = 'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400';
const labelClass = 'mb-1 block text-sm font-medium text-zinc-300';

export default function NewExpensePage() {
    const router = useRouter();
    const { id: groupId } = useParams();
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [loading, setloading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(() => ({
        title: '',
        category: '',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paidBy: '',
    }));
    const [selectedIds, setselectedIds] = useState([]);
    const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'percent'
    const [percentages, setPercentages] = useState({});
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
                    setError(data.message || 'โหลดข้อมูลกลุ่มไม่สำเร็จ');
                    return;
                }
                setGroupName(data.group.name);
                setMembers(data.members);
                setselectedIds(data.members.map((m) => m.user_id)); // default เลือกทุกคน
                const storedUser = JSON.parse(
                    localStorage.getItem('user') || 'null'
                );
                setForm((prev) => ({
                    ...prev,
                    paidBy: storedUser?.id ?? data.members[0]?.user_id ?? '',
                }));
            } catch (err) {
                setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
            } finally {
                setloading(false);
            }
        }

        if (groupId) fetchGroup();
    },[groupId]);

    function handleChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function toggleMember(memberId) {
        const nextId = selectedIds.includes(memberId)
            ? selectedIds.filter((id) => id !== memberId)
            : [...selectedIds, memberId];

        setselectedIds(nextId);

        // ใส่ % ให้เท่ากันเวลากดเปลี่ยน
        if (splitMode === 'percent') {
            setPercentages(equalPercentages(nextId));
        }
    }
    function changeSplitMode(mode) {
        setSplitMode(mode);
        if (mode === 'percent') {
            setPercentages(equalPercentages(selectedIds));
        }
    }

    function handlePercentChange(userId, value) {
        setPercentages((prev) => ({ ...prev, [userId]: value }));
    }

    const totalBasisPoints = selectedIds.reduce((sum, id) => sum + toBasisPoints(percentages[id]), 0);
    const percentOk = totalBasisPoints === 10000;
    function buildSplits(amount) {
        if (splitMode === 'percent') {
            return calculatePercentSplits(amount, selectedIds, percentages);
        }
        return calculateEqualSplits(amount, selectedIds);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');
        const { title, category, amount, expenseDate, paidBy } = form;
        if (title.trim() === '') {
            setSubmitError('กรุณาระบุชื่อรายจ่าย');
            return;
        }
        const amountNum = Number(amount);
        if (amountNum <= 0) {
            setSubmitError('จำนวนเงินต้องมากกว่า 0');
            return;
        }
        if (selectedIds.length === 0) {
            setSubmitError('ต้องเลือกอย่างน้อย 1 คนที่ร่วมจ่าย');
            return;
        }
        if (splitMode === 'percent') {
            const hasZero = selectedIds.some(
                (id) => toBasisPoints(percentages[id]) <= 0
            );
            if (hasZero) {
                setSubmitError('ทุกคนที่เลือกต้องมี % มากกว่า 0 (ถ้าไม่ร่วมจ่ายให้เอาเครื่องหมายถูกออก)');
                return;
            }
            if (!percentOk) {
                setSubmitError(`% รวมต้องได้ 100 (ตอนนี้ ${totalBasisPoints / 100}%)`);
                return;
            }
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
                    splits: buildSplits(amountNum),
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
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-zinc-400">กำลังโหลด...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-red-400">{error}</p>
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
                <h1 className="mb-1 text-xl font-semibold text-zinc-50"> เพิ่มรายจ่าย</h1>
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
                    {/* เลือกวิธีหาร */}
                    <div>
                        <label className={labelClass}>วิธีหาร</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[{value: 'equal', label: 'หารเท่ากัน'},{ value: 'percent', label: 'หารตาม %'},
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => changeSplitMode(option.value)}
                                    className={`rounded-md border py-2 text-sm ${splitMode === option.value
                                        ? 'border-white bg-white text-black'
                                        : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>ใครร่วมจ่ายรายการนี้บ้าง</label>
                        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                            {members.map((m) => {
                                const isSelected = selectedIds.includes(m.user_id);
                                return (
                                    <div
                                        key={m.user_id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <label className="flex items-center gap-2 text-sm text-zinc-200">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleMember(m.user_id)}
                                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                                            />
                                            {m.name}
                                        </label>

                                        {splitMode === 'percent' && isSelected && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    max="100"
                                                    step="0.01"
                                                    value={percentages[m.user_id] ?? ''}
                                                    onChange={(e) => handlePercentChange(m.user_id, e.target.value)}
                                                    className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-right text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                                />
                                                <span className="text-sm text-zinc-400">%</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {splitMode === 'percent' && selectedIds.length > 0 && (
                            <p className={`mt-2 text-sm ${percentOk ? 'text-green-400' : 'text-red-400'}`}>
                                รวม {totalBasisPoints / 100}% {percentOk ? '(ครบแล้ว)' : '(ต้องได้ 100%)'}
                            </p>
                        )}
                    </div>
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

// แบ่งเงินเท่ากัน
function calculateEqualSplits(amount, memberIds) {
    const moneySatang = Math.round(Number(amount) * 100);
    const count = memberIds.length;
    if (count === 0) return [];

    const eachSatang = Math.floor(moneySatang / count);
    const remain = moneySatang % count;

    return memberIds.map((userId, index) => ({
        userId,
        shareAmount: (eachSatang + (index < remain ? 1 : 0)) / 100,
    }));
}

// แปลง % "33.33"  = 3333
function toBasisPoints(percent) {
    return Math.round(Number(percent || 0) * 100);
}

// แบ่งเงินตาม % 
function calculatePercentSplits(amount, memberIds, percentList) {
    const moneySatang = Math.round(Number(amount) * 100);
    const percentNumbers = memberIds.map((id) => toBasisPoints(percentList[id]));

    const moneyList = percentNumbers.map((percentNumber) => Math.floor((moneySatang * percentNumber) / 10000));

    let remain = moneySatang - moneyList.reduce((sum, s) => sum + s, 0);
    for (let i = 0; i < moneyList.length && remain > 0; i++) {
        if (percentNumbers[i] > 0) {
            moneyList[i] += 1;
            remain -= 1;
        }
    }

    return memberIds.map((userId, index) => ({
        userId,
        shareAmount: moneyList[index] / 100,
    }));
}

// เติม % เท่ากันให้ทุกคน
function equalPercentages(memberIds) {
    const count = memberIds.length;
    if (count === 0) return {};

    const base = Math.floor(10000 / count);
    const remain = 10000 % count;

    const result = {};
    memberIds.forEach((id, index) => {
        result[id] = String((base + (index < remain ? 1 : 0)) / 100);
    });
    return result;
}
