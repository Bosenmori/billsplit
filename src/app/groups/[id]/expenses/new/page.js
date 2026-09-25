'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// แบ่งเงินเท่ากันเป็นสตางค์เพื่อให้ผลรวมตรงกับยอดรายจ่าย
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

// แปลง % (string จาก input) เป็นหน่วยย่อย เช่น "33.33" → 3333 (100% = 10000)
function toBasisPoints(percent) {
    return Math.round(Number(percent || 0) * 100);
}

// แบ่งเงินตาม % — ใช้ได้เมื่อ % รวมกันได้ 100 พอดีเท่านั้น (เช็คก่อนเรียก)
function calculatePercentSplits(amount, memberIds, percentages) {
    const totalSatang = Math.round(Number(amount) * 100);
    const bps = memberIds.map((id) => toBasisPoints(percentages[id]));

    // ปัดลงก่อนทุกคน
    const shares = bps.map((bp) => Math.floor((totalSatang * bp) / 10000));

    // สตางค์ที่หายไปจากการปัดลง แจกให้คนแรกๆ ที่มี % มากกว่า 0 คนละ 1 สตางค์
    let remainder = totalSatang - shares.reduce((sum, s) => sum + s, 0);
    for (let i = 0; i < shares.length && remainder > 0; i++) {
        if (bps[i] > 0) {
            shares[i] += 1;
            remainder -= 1;
        }
    }

    return memberIds.map((userId, index) => ({
        userId,
        shareAmount: shares[index] / 100,
    }));
}

// เติม % เท่ากันให้ทุกคน เช่น 3 คน → { 1: "33.34", 2: "33.33", 3: "33.33" }
function equalPercentages(memberIds) {
    const n = memberIds.length;
    if (n === 0) return {};

    const base = Math.floor(10000 / n);
    const remainder = 10000 % n;

    const result = {};
    memberIds.forEach((id, index) => {
        result[id] = String((base + (index < remainder ? 1 : 0)) / 100);
    });
    return result;
}

const inputClass = 'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400';

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
        splitMode: 'equal',   // 'equal' | 'percent'
        percentages: {},      // { [userId]: "33.33" }
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

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    // Checkbox อัปเดต array ภายใน form
    // ถ้าอยู่โหมด % จะเติม % เท่ากันใหม่ให้คนที่ถูกเลือก (คนเข้า-ออก % เดิมใช้ไม่ได้แล้ว)
    function toggleMember(memberId) {
        setForm((prev) => {
            const selectedMemberIds = prev.selectedMemberIds.includes(memberId)
                ? prev.selectedMemberIds.filter((id) => id !== memberId)
                : [...prev.selectedMemberIds, memberId];

            return {
                ...prev,
                selectedMemberIds,
                percentages:
                    prev.splitMode === 'percent'
                        ? equalPercentages(selectedMemberIds)
                        : prev.percentages,
            };
        });
    }

    // สลับวิธีหาร — เข้าโหมด % ครั้งแรกให้เริ่มจาก % เท่ากัน
    function changeSplitMode(mode) {
        setForm((prev) => ({
            ...prev,
            splitMode: mode,
            percentages:
                mode === 'percent'
                    ? equalPercentages(prev.selectedMemberIds)
                    : prev.percentages,
        }));
    }

    // แก้ % ของคนเดียว โดยเก็บของคนอื่นไว้
    function handlePercentChange(userId, value) {
        setForm((prev) => ({
            ...prev,
            percentages: { ...prev.percentages, [userId]: value },
        }));
    }

    // % รวมของคนที่เลือก (หน่วยย่อย) ใช้ทั้งตอนแสดงผลและตอนเช็คก่อน submit
    const totalBasisPoints = form.selectedMemberIds.reduce(
        (sum, id) => sum + toBasisPoints(form.percentages[id]),
        0
    );
    const percentIsValid = totalBasisPoints === 10000;

    // คำนวณ splits ตามโหมดที่เลือก
    function buildSplits(amount) {
        if (form.splitMode === 'percent') {
            return calculatePercentSplits(
                amount,
                form.selectedMemberIds,
                form.percentages
            );
        }
        return calculateEqualSplits(amount, form.selectedMemberIds);
    }

    const canPreview =
        form.amount &&
        form.selectedMemberIds.length > 0 &&
        (form.splitMode === 'equal' || percentIsValid);

    const previewSplits = canPreview ? buildSplits(form.amount) : [];

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
            splitMode,
            percentages,
        } = form;

        if (title.trim() === '') {
            setSubmitError('กรุณาระบุชื่อรายจ่าย');
            return;
        }

        const amountNum = Number(amount);

        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            setSubmitError('จำนวนเงินต้องมากกว่า 0');
            return;
        }

        if (selectedMemberIds.length === 0) {
            setSubmitError('ต้องเลือกอย่างน้อย 1 คนที่ร่วมจ่าย');
            return;
        }

        if (splitMode === 'percent') {
            // backend ไม่รับ shareAmount = 0 เลยต้องให้ทุกคนที่เลือกมี % มากกว่า 0
            const hasZero = selectedMemberIds.some(
                (id) => toBasisPoints(percentages[id]) <= 0
            );
            if (hasZero) {
                setSubmitError('ทุกคนที่เลือกต้องมี % มากกว่า 0 (ถ้าไม่ร่วมจ่ายให้เอาเครื่องหมายถูกออก)');
                return;
            }
            if (!percentIsValid) {
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

                    {/* เลือกวิธีหาร */}
                    <div>
                        <label className={labelClass}>วิธีหาร</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'equal', label: 'หารเท่ากัน' },
                                { value: 'percent', label: 'หารตาม %' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => changeSplitMode(option.value)}
                                    className={`rounded-md border py-2 text-sm ${form.splitMode === option.value
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
                                const isSelected = form.selectedMemberIds.includes(m.user_id);

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

                                        {form.splitMode === 'percent' && isSelected && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    max="100"
                                                    step="0.01"
                                                    value={form.percentages[m.user_id] ?? ''}
                                                    onChange={(e) =>
                                                        handlePercentChange(m.user_id, e.target.value)
                                                    }
                                                    className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-right text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                                />
                                                <span className="text-sm text-zinc-400">%</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {form.splitMode === 'percent' && form.selectedMemberIds.length > 0 && (
                            <p
                                className={`mt-2 text-sm ${percentIsValid ? 'text-green-400' : 'text-red-400'
                                    }`}
                            >
                                รวม {totalBasisPoints / 100}% {percentIsValid ? '✓' : '(ต้องได้ 100%)'}
                            </p>
                        )}
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