import { verifyAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET (request, { params }){

    const auth = verifyAuth(request)
    if (!auth.success) {
        return NextResponse.json({message: auth.message},{status: 401})
    }
    try {
        const { id } = await params;
        const groupId = parseInt(id);
        if (Number.isNaN(groupId)) return NextResponse.json({message: 'รหัสกลุ่มไม่ถูกต้อง'},{status: 400}) 
        const groupResult = await pool.query(
            `SELECT
                groups.id,
                groups.name,
                groups.created_at,
                groups.created_by,
                users.name AS created_by_name
            FROM groups
            JOIN users ON groups.created_by = users.id
            WHERE groups.id = $1`,[groupId]);

        if (groupResult.rowCount === 0) {
            return NextResponse.json({message: 'ไม่พบกลุ่มนี้'}, {status: 404});
        }
        const group = groupResult.rows[0];

        const memberResult = await pool.query(
            `SELECT
                users.id AS user_id,
                users.name,
                users.email,
                group_members.role,
                group_members.joined_at
            FROM group_members
            JOIN users ON group_members.user_id = users.id
            WHERE group_members.group_id = $1
            ORDER BY group_members.joined_at`,[groupId]);

        const members = memberResult.rows;

        // ต้องเป็นสมาชิกถึงจะดูได้
        const me = members.find((m) => m.user_id === auth.userId);
        if (!me) {
            return NextResponse.json({ message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' }, { status: 403 });
        }
        return NextResponse.json({ group, members, myRole: me.role }, { status: 200 });

    } catch (error) {
        return NextResponse.json({message: "เกิดข้อผิดพลาด",error: error.message},{status:500})
    }

}