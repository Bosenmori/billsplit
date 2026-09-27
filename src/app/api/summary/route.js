import { verifyAuth } from "@/lib/auth"
import { calculateGroupBalances } from "@/lib/balances"
import pool from "@/lib/db"
import { NextResponse } from "next/server"


export async function GET(request) {
    const auth = verifyAuth(request)
    if (!auth.success) {
        return NextResponse.json({ message: auth.message }, { status: 401 })
    }

    try {
        const userId = auth.userId
        //console.log(userId);
        const groupResult = await pool.query(`
            SELECT g.id, g.name
            FROM groups g
            JOIN group_members gm ON gm.group_id = g.id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
            `, [userId]
        )
        const groups = groupResult.rows;
        //console.log(groups)
        let totalPay = 0
        let totalRecive = 0
        const actions = [];
      
        for(const g of groups){
            const gBalance = await calculateGroupBalances(g.id)
            const transactions = gBalance.transactions;
            
            for (const t of transactions) {
                const payerId = Number(t.from_user_id)
                const receiverId = Number(t.to_user_id)
                const money = Math.round(t.amount * 100)

                if (payerId === userId) {
                    totalPay += money
                    actions.push({
                        group_id: g.id,
                        group_name: g.name,
                        type: 'pay',
                        user_id: t.to_user_id,
                        user_name: t.to_name,
                        amount: t.amount
                    })
                } else {
                    if (receiverId === userId) {
                        totalRecive += money
                        actions.push({
                            group_id: g.id,
                            group_name: g.name,
                            type: 'receive',
                            user_id: t.from_user_id,
                            user_name: t.from_name,
                            amount: t.amount
                    })
                    }
                }
            }
    
        }
        const summary = {
                toPay: totalPay / 100,
                toRecive: totalRecive / 100,
            }
             return NextResponse.json({summary: summary, actions: actions},{status: 200});

    } catch (error) {
        console.error(error)
        return NextResponse.json({message: 'โหลดยอดโอนไม่สำเร็จ'},{status: 500})
    }
}