import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';


// POST /api/expenses — เพิ่มรายจ่าย + แบ่งหนี้
export async function POST(request) {
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({ message: auth.message }, { status: 401 });
  }

  let client;              // connection ที่จองไว้สำหรับ transaction
  let inTransaction = false; 

  try {
    const body = await request.json();
    const { groupId, title, category, amount, expenseDate, splits } = body;

    // ถ้าไม่ส่ง paidBy มา = คนที่ล็อกอินอยู่คือคนจ่าย
    const paidBy = body.paidBy ?? auth.userId;

    // 1. VALIDATE
    const groupIdNum = Number(groupId);
    if (!Number.isInteger(groupIdNum) || groupIdNum <= 0) {
      return NextResponse.json({ message: 'groupId ไม่ถูกต้อง' }, { status: 400 });
    }

    const paidByNum = Number(paidBy);
    if (!Number.isInteger(paidByNum) || paidByNum <= 0) {
      return NextResponse.json({ message: 'paidBy ไม่ถูกต้อง' }, { status: 400 });
    }

    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ message: 'กรุณาระบุชื่อรายจ่าย' }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { message: 'จำนวนเงินต้องเป็นตัวเลขและมากกว่า 0' },
        { status: 400 }
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { message: 'ต้องระบุรายการแบ่งจ่ายอย่างน้อย 1 คน' },
        { status: 400 }
      );
    }

    // แปลง splits ให้เป็นตัวเลขล้วน + เช็คทีละแถว
    const cleanSplits = [];
    for (const split of splits) {
      const userIdNum = Number(split?.userId);
      const shareNum = Number(split?.shareAmount);

      if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
        return NextResponse.json(
          { message: 'userId ใน splits ไม่ถูกต้อง' },
          { status: 400 }
        );
      }
      if (!Number.isFinite(shareNum) || shareNum <= 0) {
        return NextResponse.json(
          { message: 'shareAmount ใน splits ต้องมากกว่า 0' },
          { status: 400 }
        );
      }

      cleanSplits.push({ userId: userIdNum, shareAmount: shareNum });
    }

    // กัน userId ซ้ำ
    const splitUserIds = cleanSplits.map((s) => s.userId);
    if (new Set(splitUserIds).size !== splitUserIds.length) {
      return NextResponse.json(
        { message: 'มี userId ซ้ำใน splits' },
        { status: 400 }
      );
    }

    // เทียบยอดรวม — แปลงเป็น "สตางค์" (จำนวนเต็ม) ก่อน
    // เพราะ float ใน JS เทียบตรงๆ ไม่ได้ (0.1 + 0.2 !== 0.3)
    const amountSatang = Math.round(amountNum * 100);
    const totalSatang = cleanSplits.reduce(
      (sum, s) => sum + Math.round(s.shareAmount * 100),
      0
    );
    if (amountSatang !== totalSatang) {
      return NextResponse.json(
        {
          message: 'ผลรวมยอดแบ่งจ่ายไม่เท่ากับจำนวนเงินทั้งหมด',
          amount: amountNum,
          splitsTotal: totalSatang / 100,
        },
        { status: 400 }
      );
    }

    // ฟิลด์ที่ไม่บังคับ
    const categoryValue =
      typeof category === 'string' && category.trim() !== ''
        ? category.trim()
        : null;

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

    //  2. จอง connection (ต้องใช้เส้นเดียวตลอด transaction)
    client = await pool.connect();

    // 3. เช็คกลุ่มก่อน แล้วค่อยเช็คสิทธิ์ (กันข้อมูลรั่ว)
    const groupResult = await client.query(
      'SELECT id FROM groups WHERE id = $1',
      [groupIdNum]
    );
    if (groupResult.rows.length === 0) {
      return NextResponse.json({ message: 'ไม่พบกลุ่มนี้' }, { status: 404 });
    }

    const callerResult = await client.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, auth.userId]
    );
    if (callerResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' },
        { status: 403 }
      );
    }

    // ทุกคนที่เกี่ยวข้อง (คนจ่าย + คนติดหนี้) ต้องอยู่ในกลุ่มจริง
    const participantIds = [...new Set([...splitUserIds, paidByNum])];
    const memberResult = await client.query(
      `SELECT user_id FROM group_members
       WHERE group_id = $1 AND user_id = ANY($2::int[])`,
      [groupIdNum, participantIds]
    );
    if (memberResult.rows.length !== participantIds.length) {
      return NextResponse.json(
        { message: 'มีผู้ใช้บางคนไม่ได้เป็นสมาชิกของกลุ่มนี้' },
        { status: 400 }
      );
    }

    //  4 TRANSACTION: เขียน 2 ตาราง ต้องสำเร็จทั้งคู่ 
    await client.query('BEGIN');
    inTransaction = true;

    // fix เป็น THB ไปก่อน amount_thb = original_amount (เดี๋ยวมาดึงค่าเงินทีหลัง)
    const expenseResult = await client.query(
      `INSERT INTO expenses
         (group_id, paid_by, title, category, currency,
          original_amount, amount_thb, exchange_rate, expense_date)
       VALUES ($1, $2, $3, $4, 'THB', $5, $5, NULL, COALESCE($6::date, CURRENT_DATE))
       RETURNING id, group_id, paid_by, title, category, currency,
                 original_amount, amount_thb, expense_date, created_at`,
      [groupIdNum, paidByNum, title.trim(), categoryValue, amountNum, expenseDateValue]
    );

    const expense = expenseResult.rows[0];

    // ต้องใช้ for...of ไม่ใช่ forEach — forEach ไม่รอ await
    const insertedSplits = [];
    for (const split of cleanSplits) {
      const splitResult = await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share_amount)
         VALUES ($1, $2, $3)
         RETURNING id, expense_id, user_id, share_amount`,
        [expense.id, split.userId, split.shareAmount]
      );
      insertedSplits.push(splitResult.rows[0]);
    }

    await client.query('COMMIT');
    inTransaction = false;

    return NextResponse.json(
      {
        message: 'บันทึกรายจ่ายสำเร็จ',
        expense: { ...expense, splits: insertedSplits },
      },
      { status: 201 }
    );
  } catch (error) {
    // ถ้าพังกลางคัน ย้อนทุกอย่างกลับ เหมือนไม่เคยเขียนอะไรเลย
    if (inTransaction && client) {
      await client.query('ROLLBACK');
    }
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการบันทึกรายจ่าย', error: error.message },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

// GET /api/expenses?groupId=1 — ดูรายจ่ายทั้งหมดในกลุ่ม
export async function GET(request) {
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({ message: auth.message }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupIdNum = Number(searchParams.get('groupId'));

    if (!Number.isInteger(groupIdNum) || groupIdNum <= 0) {
      return NextResponse.json(
        { message: 'กรุณาระบุ groupId ให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const groupResult = await pool.query(
      'SELECT id FROM groups WHERE id = $1',
      [groupIdNum]
    );
    if (groupResult.rows.length === 0) {
      return NextResponse.json({ message: 'ไม่พบกลุ่มนี้' }, { status: 404 });
    }

    const memberResult = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdNum, auth.userId]
    );
    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT
         e.id, e.title, e.category, e.currency,
         e.original_amount, e.amount_thb, e.exchange_rate,
         e.expense_date, e.created_at,
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
      [groupIdNum]
    );

    return NextResponse.json({ expenses: result.rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงรายจ่าย', error: error.message },
      { status: 500 }
    );
  }
}