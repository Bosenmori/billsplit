import { verifyAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";


export async function POST(request, {params}) {
    const auth = verifyAuth(request)
        if (!auth.success) {
            return NextResponse.json({message: auth.message},{status: 401})
        }
    
    try {
        const { id } = await params;
        const groupId = parseInt(id);
        if (Number.isNaN(groupId)) {
            return NextResponse.json({message: 'รหัสกลุ่มไม่ถูกต้อง'},{status: 400})
        }
        const body = await request.json();
        const {email:rawEmail} = body; //Emailที่จะเชิญเข้า
        const email = rawEmail?.trim().toLowerCase(); 
        if (!email) {
            return NextResponse.json({message: 'กรุณาระบุอีเมล'},{status: 400});
        }
        if (!email.includes('@')) {
            return NextResponse.json({message: 'รูปแบบอีเมลไม่ถูกต้อง'},{status: 400});
        }

        //กลุ่มนี้มีอยู่จริงมั้ย
        const groupResult = await pool.query(`
            SELECT id
            FROM groups
            WHERE id = $1
            `,[groupId]);
        if (groupResult.rowCount === 0) {
            return NextResponse.json({message: 'ไม่พบกลุ่มนี้'}, {status: 404});
        }

        //หาผู้ใช้จากemail
        const targetUserResult =  await pool.query(`
            SELECT id, name, email
            FROM users
            WHERE email = $1
            `,[email]);
            
        if (targetUserResult.rowCount === 0) {
            return NextResponse.json({message: 'ไม่พบผู้ใช้ที่มีอีเมลนี้'},{status: 404})
        }
        const targetUser = targetUserResult.rows[0];
        //เช็คซ้ำ
        const duplicateResult = await pool.query(`
            SELECT id
            FROM group_members
            WHERE group_id = $1 AND user_id = $2
            `,[groupId, targetUser.id])

        if (duplicateResult.rowCount > 0) {
            return NextResponse.json({ message: 'ผู้ใช้นี้อยู่ในกลุ่มแล้ว' },{ status: 409 });
        }
        // เพิ่มสมาชิกเข้ากลุ่ม
        const insertResult = await pool.query(`
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, $3)
            RETURNING role, joined_at
       `,[groupId, targetUser.id, 'member']
    )

    const inserted = insertResult.rows[0];

    return NextResponse.json(
      {
        message: 'เพิ่มสมาชิกสำเร็จ',
        member: {
          user_id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: inserted.role,
          joined_at: inserted.joined_at,
        },},{status: 201}
    );
    } catch (error) {
        return NextResponse.json({message: "เกิดข้อผิดพลาด",error: error.message},{status:500})
    }
}