import { verifyAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: 401 });
    }

    let client;
    let inTransaction = false;

    try {
        const body = await request.json();
        const { groupId, title, category, amount, expenseDate, splits } = body;

        // ถ้าไม่ส่ง paidBy มา = คนที่ล็อกอินอยู่คือคนจ่าย
        const paidBy = body.paidBy ?? auth.userId

        //เช็คค่า
        const groupIdNum = Number(groupId);
        if (groupId <= 0) {
            return NextResponse.json({ message: 'groupId ไม่ถูกต้อง' }, { status: 400 })
        }
        const paidByNum = Number(paidBy);
        if (paidByNum <= 0) {
            return NextResponse.json({ message: 'paidBy ไม่ถูกต้อง' }, { status: 400 })
        }
        if (title.trim() === '') {
            return NextResponse.json({ message: 'ระบุชื่อรายจ่าย' }, { status: 400 })
        }
        const amountNum = Number(amount);
        if (amountNum <= 0) {
            return NextResponse.json({ message: 'amount ไม่ถูกต้อง' }, { status: 400 })
        }
        if (splits.length === 0) {
            return NextResponse.json({ message: 'ต้องระบุรายการแบ่งจ่ายอย่างน้อย 1 คน' }, { status: 400 })
        }

        const cleanSplits = [];
        for (const split of splits) {
            const userIdNum = Number(split?.userId);
            const shareNum = Number(split?.shareAmount);

            if (userIdNum <= 0) {
                return NextResponse.json({ message: 'userId ใน splits ไม่ถูกต้อง' }, { status: 400 });
            }
            if (shareNum <= 0) {
                return NextResponse.json(
                    { message: 'shareAmount ใน splits ต้องมากกว่า 0' },
                    { status: 400 });
            }

            cleanSplits.push({ userId: userIdNum, shareAmount: shareNum });
        }

        // ค่าที่ไม่บังคับ
        let categoryValue;
        if (category.trim() !== '') {
            categoryValue = category.trim()
        } else {
            categoryValue = null;
        }

        let expenseDateValue = null; // null = ให้ DB ใช้ CURRENT_DATE
        if (expenseDate) {
            if (Number.isNaN(new Date(expenseDate).getTime())) {
                return NextResponse.json({message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' },{status: 400 }
                );
            }
            expenseDateValue = expenseDate;
        }

        client = await pool.connect(); //จอง connection

        await client.query('BEGIN');
        inTransaction = true;


        const expenseResult = await client.query(
            `INSERT INTO expenses
            (group_id, paid_by, title, category, amount, expense_date)
            VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
            RETURNING id, group_id, paid_by, title, category, amount, expense_date, created_at`,
            [groupIdNum, paidByNum, title.trim(), categoryValue ?? 'other', amountNum, expenseDateValue]
        );

        const expense = expenseResult.rows[0];


        const insertedSplits = [];
        for (const split of cleanSplits) {
            const splitResult = await client.query(
                `INSERT INTO expense_splits (expense_id, user_id, share_amount)
                VALUES ($1, $2, $3)
                RETURNING id, expense_id, user_id, share_amount`,
                [expense.id, split.userId, split.shareAmount]);

            insertedSplits.push(splitResult.rows[0]);
        }

        await client.query('COMMIT');
        inTransaction = false;

        return NextResponse.json(
            { message: 'บันทึกรายจ่ายสำเร็จ', expense: { ...expense, splits: insertedSplits }, }, { status: 201 });
    } catch (error) {
        // ถ้าพังกลางคัน ย้อนทุกอย่างกลับ เหมือนไม่เคยเขียนอะไรเลย
        if (inTransaction && client) {
            await client.query('ROLLBACK');
        }
        return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการบันทึกรายจ่าย', error: error.message }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}

export async function GET(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: 401 });
    }
    try {
        const {searchParams} = new URL(request.url);
        //console.log(searchParams.get('groupId'))
        const groupIdNum = Number(searchParams.get('groupId'));

        if (groupIdNum <= 0 || !Number.isInteger(groupIdNum)) {
            return NextResponse.json({ message: 'กรุณาระบุ groupId ให้ถูกต้อง' }, { status: 400 });
        }

        const result = await pool.query(
            `SELECT
            e.id, e.title, e.category, e.amount, e.expense_date, e.created_at,
            e.paid_by, u.name AS paid_by_name,
            COALESCE(
            json_agg(
                json_build_object(
                'user_id', s.user_id,
                'name', su.name,
                'share_amount', s.share_amount
                ) ORDER BY s.user_id
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
            ) AS splits
        FROM expenses e
        JOIN users u ON u.id = e.paid_by
        LEFT JOIN expense_splits s ON s.expense_id = e.id
        LEFT JOIN users su ON su.id = s.user_id
        WHERE e.group_id = $1
        GROUP BY e.id, u.name
        ORDER BY e.expense_date DESC, e.id DESC`,
            [groupIdNum]);

        return NextResponse.json({expenses: result.rows }, {status: 200});

    } catch (error) {
        return NextResponse.json({message: 'เกิดข้อผิดพลาดในการดึงรายจ่าย', error: error.message }, {status: 500 });
    }
}
