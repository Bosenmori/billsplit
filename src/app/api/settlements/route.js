import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { transferFund } from '@/lib/kbank';
import { Resend } from 'resend';

export async function POST(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { stsatus: 401 })
    }
    const myId = Number(auth.userId)

    let settlementId = null;

    try {
        const body = await request.json();
        const { groupId, toUserId, amount } = body

        const gId = Number(groupId);
        const toId = Number(toUserId);

        if (!Number.isInteger(gId) || !Number.isInteger(toId) || !Number.isInteger(amount) || amount <= 0) {
            return NextResponse.json({ message: 'ข้อมูลไม่ครบหรือไม่ถูกต้อง' }, { status: 400 });
        }
        if (toId === myId) {
            return NextResponse.json({ message: 'โอนให้ตัวเองไม่ได้' }, { status: 400 });
        }


        const insertRes = await pool.query(`
        INSERT INTO settlements (group_id, from_user_id, to_user_id, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING id`
            , [gId, myId, toId, amount.toFixed(2)]);

        settlementId = insertRes.rows[0].id;


        let result;
        try {
            result = await transferFund({ amount, settlementId })
        } catch (err) {
            result = { success: false, ref: null, raw: { error: err.message } }
        }

        if (!result.success) {
            await pool.query(
                `UPDATE settlements SET status = 'failed', bank_response_raw = $1 WHERE id = $2`,
                [JSON.stringify(result.raw), settlementId]);

            return NextResponse.json({ message: 'ธนาคารปฏิเสธการโอน กรุณาลองใหม่' }, { status: 502 });
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

        const receiverRes = await pool.query(`
            SELECT email
            FROM users
            WHERE id = $1
            `, [updateRes.rows[0].to_user_id])

        //console.log(receiverRes.rows[0].email)
        const receiver = receiverRes.rows[0].email;
        //console.log(receiver)
        const payerRes = await pool.query(`
            SELECT email
            FROM users
            WHERE id = $1
            `, [updateRes.rows[0].from_user_id])

        const payer = payerRes.rows[0].email;
        //console.log(payer)
        const groupRes = await pool.query(`
            SELECT name
            FROM groups
            WHERE id = $1
            `, [updateRes.rows[0].group_id])

        const groupName = groupRes.rows[0].name;
        //console.log(groupName)
        const resend = new Resend(process.env.RESEND_API_KEY);
        (async function () {
            const { data, error } = await resend.emails.send({
                from: 'Billsplit <Billsplit@resend.dev>',
                to: [receiver],
                subject: `คุณได้รับเงินคืนแล้ว ${groupName} บน Billsplit`,
                html: `
                <div style="font-family: Arial, sans-serif; background-color: #000000; padding: 32px 16px;">
                <div style="max-width: 520px; margin: auto; background-color: #18181b; border-radius: 16px; padding: 32px;">
                    <h1 style="color: #fafafa; margin: 0 0 24px;">
                        Billsplit
                    </h1>
                    <h2 style="color: #fafafa; font-size: 22px;">
                         คุณได้รับเงินคืนแล้ว
                    </h2>
                    <p style="color: #fafafa; line-height: 1.8;">
                        คุณได้รับเงินคืนจาก 
                        <strong style="color: #16a34a;"> ${payer} </strong>
                         จำนวน
                        <strong style="color: #16a34a;"> 500 บาท </strong>
                          สำหรับค่าใช้จ่ายในกลุ่ม <strong style="color: #16a34a;"> ${groupName} </strong> 
                          บน Billsplit แล้ว
                    </p>
        
                    <hr style="border: 0; border-top: 1px solid #71717a; margin: 24px 0;" />
        
                    <p style="color: #fafafa; font-size: 14px; line-height: 1.8; margin: 0;">
                        ขอบคุณที่ใช้ Billsplit <br />
                    </p>
                </div>
            </div>
            `,
            });

            if (error) {
                return console.error({ error });
            }
            console.log({ data });
        })();



        return NextResponse.json({ status: 'ok', message: 'โอนเงินสำเร็จ', settlement: updateRes.rows[0] }, { status: 201 });
    } catch (error) {
        if (settlementId) {
            await pool.query(
                `UPDATE settlements 
        SET status = 'failed', bank_response_raw = $1
        WHERE id = $2 AND status = 'pending'`
                , [JSON.stringify({ error: error.message }), settlementId])
        }

        return NextResponse.json({ message: 'โอนเงินไม่สำเร็จ', error: error.message }, { status: 500 });
    }
}