import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuth } from '@/lib/auth'; 

export async function POST(request) {
    const { name } = await request.json();
    const auth = verifyAuth(request)
    if (!auth.success) {
        return NextResponse.json({message: auth.message},{status: 401})
    }
    try {
        const groupResult = await pool.query(`INSERT INTO groups (name, created_by) 
        VALUES ($1, $2) 
        RETURNING *`,[name, auth.userId]);
    
        const newGroup = groupResult.rows[0];
        
        await pool.query(`INSERT INTO group_members (group_id, user_id, role) 
        VALUES ($1, $2, 'admin')`,[newGroup.id, auth.userId]);


        return NextResponse.json({message: 'สร้างกลุ่มสำเร็จ' },{status: 201})
    } catch (error) {
        return NextResponse.json({message: 'สร้างกลุ่มไม่สำเร็จ'}, { status: 500 });
    }
}

export async function GET(request) {
    const auth = verifyAuth(request)
    if (!auth.success) {
        return NextResponse.json({message: auth.message},{status: 401})
    }
    try {
        const groupResult = await pool.query(`
        SELECT 
        g.id, 
        g.name, 
        g.created_at,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id)::int AS member_count
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
            `,[auth.userId]);
        return NextResponse.json({groups: groupResult.rows}, { status: 200});
    } catch (error) {
        return NextResponse.json({message: "ดึงข้อมูลไม่สำเร็จ", error: error.message},{ status: 500}
);
    }
}