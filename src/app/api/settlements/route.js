import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { calculateGroupBalances } from '@/lib/balances';
import { transferFund } from '@/lib/kbank';

export async function POST(request) {
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({ message: auth.message }, { status: 401 });
  }
  const myId = Number(auth.userId);

  let settlementId = null; 

  try {
    const { groupId, toUserId, amount } = await request.json();

    
    const gId = Number(groupId);
    const toId = Number(toUserId);
    const amountSatang = Math.round(Number(amount) * 100);

    if (!Number.isInteger(gId) || !Number.isInteger(toId) ||
        !Number.isInteger(amountSatang) || amountSatang <= 0) {
      return NextResponse.json({ message: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง' }, { status: 400 });
    }
    if (toId === myId) {
      return NextResponse.json({ message: 'โอนให้ตัวเองไม่ได้' }, { status: 400 });
    }

    // ---------- 2) กลุ่มมีจริงไหม (404) → เป็นสมาชิกไหม (403) ----------
    const [groupRes, memberRes] = await Promise.all([
      pool.query('SELECT id FROM groups WHERE id = $1', [gId]),
      pool.query(
        'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = ANY($2::int[])',
        [gId, [myId, toId]]
      ),
    ]);

    if (groupRes.rowCount === 0) {
      return NextResponse.json({ message: 'ไม่พบกลุ่มนี้' }, { status: 404 });
    }
    const memberIds = memberRes.rows.map((row) => row.user_id);
    if (!memberIds.includes(myId)) {
      return NextResponse.json({ message: 'คุณไม่ได้เป็นสมาชิกกลุ่มนี้' }, { status: 403 });
    }
    if (!memberIds.includes(toId)) {
      return NextResponse.json({ message: 'ผู้รับไม่ได้อยู่ในกลุ่มนี้' }, { status: 400 });
    }

    // ---------- 3) ยอดต้องตรงกับที่ระบบคำนวณ (ไม่เชื่อตัวเลขจาก client) ----------
    const { transactions } = await calculateGroupBalances(gId);
    const owed = transactions.find(
      (t) => Number(t.from_user_id) === myId && Number(t.to_user_id) === toId
    );
    if (!owed) {
      return NextResponse.json({ message: 'ไม่มียอดที่ต้องโอนให้คนนี้' }, { status: 400 });
    }
    if (Math.round(Number(owed.amount) * 100) !== amountSatang) {
      return NextResponse.json({ message: 'ยอดเปลี่ยนไปแล้ว กรุณารีเฟรชหน้า' }, { status: 409 });
    }

    // ---------- 4) INSERT pending (หลักฐานว่า "กำลังจะโอน") ----------
    const insertRes = await pool.query(
      `INSERT INTO settlements (group_id, from_user_id, to_user_id, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [gId, myId, toId, (amountSatang / 100).toFixed(2)]
    );
    settlementId = insertRes.rows[0].id;

    // ---------- 5) เรียก KBank ----------
    let result;
    try {
      result = await transferFund({ amountSatang, settlementId });
    } catch (err) {
      // network error / token error → ถือว่าโอนไม่สำเร็จ
      result = { success: false, ref: null, raw: { error: err.message } };
    }

    // ---------- 6) เขียน response ของ KBank ลง settlement ----------
    if (!result.success) {
      await pool.query(
        `UPDATE settlements SET status = 'failed', bank_response_raw = $1 WHERE id = $2`,
        [JSON.stringify(result.raw), settlementId]
      );
      return NextResponse.json({ message: 'ธนาคารปฏิเสธการโอน กรุณาลองใหม่' }, { status: 502 });
    }

    const updateRes = await pool.query(
      `UPDATE settlements
       SET status = 'confirmed',
           bank_transaction_ref = $1,
           bank_response_raw = $2,
           confirmed_at = NOW()
       WHERE id = $3
       RETURNING id, group_id, from_user_id, to_user_id, amount, status,
                 bank_transaction_ref, confirmed_at`,
      [result.ref, JSON.stringify(result.raw), settlementId]
    );

    return NextResponse.json(
      { status: 'ok', message: 'โอนเงินสำเร็จ', settlement: updateRes.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    // กดจ่ายซ้ำระหว่างที่รายการแรกยัง pending → ชน partial unique index
    if (error.code === '23505' && error.constraint === 'settlements_one_pending_idx') {
      return NextResponse.json({ message: 'รายการนี้กำลังดำเนินการอยู่' }, { status: 409 });
    }

    // พังหลัง INSERT แล้ว → อย่าปล่อยค้าง pending (ไม่งั้นจะโอนคู่นี้ไม่ได้อีกเลย)
    if (settlementId) {
      await pool
        .query(
          `UPDATE settlements SET status = 'failed', bank_response_raw = $1
           WHERE id = $2 AND status = 'pending'`,
          [JSON.stringify({ error: error.message }), settlementId]
        )
        .catch(() => {}); // ถ้า UPDATE นี้พังอีก ก็ไม่ให้บัง error ตัวจริง
    }

    return NextResponse.json({ message: 'โอนเงินไม่สำเร็จ', error: error.message }, { status: 500 });
  }
}