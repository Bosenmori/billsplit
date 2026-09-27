import { verifyAuth } from "@/lib/auth";
import { calculateGroupBalances } from "@/lib/balances";
import pool from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: 401 });
    }

    try {
        const groupId = new URL(request.url).searchParams.get('groupId');
        if (!groupId) {
            return NextResponse.json({ message: 'กรุณาระบุ groupId ให้ถูกต้อง' }, { status: 400 });
        }
        const groupResult = await pool.query(`
        SELECT id
        FROM groups
        WHERE id = $1
        `, [groupId]);

        if (groupResult.rowCount === 0) {
            return NextResponse.json({ message: 'ไม่มีกลุ่มนี้อยู่' }, { status: 400 })
        }

        const { balances, transactions } = await calculateGroupBalances(groupId)
        return NextResponse.json({ balances, transactions }, {status: 200 });

    } catch (error) {
        return NextResponse.json({ message: 'เกิดข้อผิดพลาด', error: error.message }, { status: 500 }
        );
    }

}

