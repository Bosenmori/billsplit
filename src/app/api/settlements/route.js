import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { transferFund } from '@/lib/kbank';

export async function POST(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: 401 })
    }
    const myId = Number(auth.userId)

    let settlementId = null;

    try {
        const body = await request.json();
        const { groupId, toUserId, amount } = body

        const gId = Number(groupId);
        const toId = Number(toUserId);

        if (!Number.isInteger(gId) || !Number.isInteger(toId) || !Number.isInteger(amount) || amount <= 0) {
            return NextResponse.json({message: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง' }, {status: 400});
        }
        if (toId === myId) {
            return NextResponse.json({message: 'โอนให้ตัวเองไม่ได้' }, {status: 400});
        }


        const insertRes = await pool.query(`
        INSERT INTO settlements (group_id, from_user_id, to_user_id, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING id`
        ,[gId, myId, toId, amount.toFixed(2)]);

        settlementId = insertRes.rows[0].id;


        let result;
        try {
            result = await transferFund({amount, settlementId})
        } catch (err) {
            result = { success: false, ref: null, raw: {error: err.message}}
        }

        if (!result.success) {
            await pool.query(
                `UPDATE settlements SET status = 'failed', bank_response_raw = $1 WHERE id = $2`,
                [JSON.stringify(result.raw), settlementId]);
            
            return NextResponse.json({ message: 'ธนาคารปฏิเสธการโอน กรุณาลองใหม่' }, {status: 502});
        }

        const updateRes = await pool.query(`
        UPDATE settlements
        SET status = 'confirmed',
        bank_transaction_ref = $1,
        bank_response_raw = $2,
        confirmed_at = NOW()
        WHERE id = $3
        RETURNING id, group_id, from_user_id, to_user_id, amount, status, bank_transaction_ref, confirmed_at`,
        [result.ref, JSON.stringify(result.raw), settlementId]);

        return NextResponse.json({status: 'ok', message: 'โอนเงินสำเร็จ', settlement: updateRes.rows[0] },{status: 201});
    } catch (error) {
        if (settlementId) {
        await pool.query(
        `UPDATE settlements 
        SET status = 'failed', bank_response_raw = $1
        WHERE id = $2 AND status = 'pending'`
        ,[JSON.stringify({ error: error.message }), settlementId])}

        return NextResponse.json({ message: 'โอนเงินไม่สำเร็จ', error: error.message }, { status: 500 });
    }
}