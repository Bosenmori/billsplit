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



        // แปลง splits ให้เป็นตัวเลขล้วน loop เช็คทีละแถว
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


        // กัน userId ซ้ำ
        const splitUserIds = cleanSplits.map((s) => s.userId);
        if (new Set(splitUserIds).size !== splitUserIds.length) {
            return NextResponse.json({ message: 'มี userId ซ้ำใน splits' }, { status: 400 });
        }

        // เทียบยอดรวม 
        const amountSatang = Math.round(amountNum * 100);
        const totalSatang = cleanSplits.reduce((sum, s) => sum + Math.round(s.shareAmount * 100), 0);
        if (amountSatang !== totalSatang) {
            return NextResponse.json(
                {
                    message: 'ผลรวมยอดแบ่งจ่ายไม่เท่ากับจำนวนเงินทั้งหมด',
                    amount: amountNum,
                    splitsTotal: totalSatang / 100,
                }, { status: 400 });
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
                return NextResponse.json(
                    { message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' },
                    { status: 400 }
                );
            }
            expenseDateValue = expenseDate;
        }

        client = await pool.connect(); //จอง connection
        //เช็คกลุ่ม
        const groupResult = await client.query(
            'SELECT id FROM groups WHERE id = $1'
            , [groupIdNum]);
        if (groupResult.rows.length === 0) {
            return NextResponse.json({ message: 'ไม่พบกลุ่มนี้' }, { status: 404 });
        }

        //เช็คสิทธิ
        const callerResult = await client.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2'
            , [groupIdNum, auth.userId]);
        if (callerResult.rowCount === 0) {
            return NextResponse.json({ message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' }, { status: 403 });
        }
        // ทุกคนที่เกี่ยวข้อง (คนจ่าย + คนติดหนี้) ต้องอยู่ในกลุ่มจริง
        const participantIds = [...new Set([...splitUserIds, paidByNum])];
        const memberResult = await client.query(
            `SELECT user_id FROM group_members
            WHERE group_id = $1 AND user_id = ANY($2::int[])`
            , [groupIdNum, participantIds]);

        if (memberResult.rows.length !== participantIds.length) {
            return NextResponse.json(
                { message: 'มีผู้ใช้บางคนไม่ได้เป็นสมาชิกของกลุ่มนี้' },
                { status: 400 }
            );
        }


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

        const memberResult = await pool.query(
            `SELECT 1
            FROM group_members 
            WHERE group_id = $1 AND user_id = $2`,
            [groupIdNum, auth.userId]);


        if (memberResult.rows.length === 0) {
            return NextResponse.json({ message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' }, { status: 403 });
        }

        // const result = await pool.query(
        // `SELECT
        //     e.id, e.title, e.category, e.currency,
        //     e.original_amount, e.amount_thb, e.exchange_rate,
        //     e.expense_date, e.created_at,
        //     e.paid_by, u.name AS paid_by_name,
        //     s.user_id, su.name AS split_user_name, s.share_amount
        // FROM expenses e
        // JOIN users u ON u.id = e.paid_by
        // LEFT JOIN expense_splits s ON s.expense_id = e.id
        // LEFT JOIN users su ON su.id = s.user_id
        // WHERE e.group_id = $1
        // ORDER BY e.expense_date DESC, e.id DESC, s.user_id`,
        // [groupIdNum]
        // );

        // const expensesMap = new Map();

        // for (const row of result.rows) {

        // if (!expensesMap.has(row.id)) {
        //     expensesMap.set(row.id, {
        //     id: row.id,
        //     title: row.title,
        //     category: row.category,
        //     currency: row.currency,
        //     original_amount: row.original_amount,
        //     amount_thb: row.amount_thb,
        //     exchange_rate: row.exchange_rate,
        //     expense_date: row.expense_date,
        //     created_at: row.created_at,
        //     paid_by: row.paid_by,
        //     paid_by_name: row.paid_by_name,
        //     splits: [],
        //     });
        // }

        // if(row.user_id !== null) {
        //     expensesMap.get(row.id).splits.push({
        //     user_id: row.user_id,
        //     name: row.split_user_name,
        //     share_amount: row.share_amount,
        //     });
        // }
        // }

        // const expenses = [...expensesMap.values()];

        // return NextResponse.json({expenses},{status: 200});


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

export async function DELETE(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json( {message: auth.message},{status: 401});
    }

    try {
        const body = await request.json();
        if (!body) {
            return NextResponse({ message: 'กรุณาส่ง body เป็น JSON ที่ถูกต้อง' }, { status: 400 })
        }

        const expenseId = Number(body?.expenseId);
        if (!Number.isSafeInteger(expenseId) || expenseId <= 0) {
            return NextResponse.json({ message: 'กรุณาระบุ expenseId ให้ถูกต้อง' }, { status: 400 });
        }
        const result = await pool.query(
            `DELETE FROM expenses
             WHERE id = $1
               AND group_id IN (
                   SELECT group_id
                   FROM group_members
                   WHERE user_id = $2
                     AND role = 'admin'
               )
             RETURNING id`,
            [expenseId, auth.userId]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({message: 'ไม่พบรายจ่าย หรือคุณไม่ได้เป็น admin ของกลุ่มนี้',},
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: 'ลบรายจ่ายสำเร็จ',expenseId: result.rows[0].id,},{ status: 200 }
        );
    } catch (error) {
        console.error('Delete expense error:', error);

        return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบรายจ่าย' },{ status: 500 }
        );
    }
}