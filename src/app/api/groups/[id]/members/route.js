import { verifyAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({message: auth.message }, {status: 401});
  }

  try {
    // ตรวจ groupId จาก URL
    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (Number.isNaN(groupId)) {
      return NextResponse.json(
        {message: 'รหัสกลุ่มไม่ถูกต้อง'},
        {status: 400 });
    }

    // ตรวจ email จาก body
    const { email: rawEmail } = await request.json();
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        {message: 'กรุณาระบุอีเมล'},
        {status: 400});
    }

    const email = rawEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json(
        {message: 'รูปแบบอีเมลไม่ถูกต้อง'},
        {status: 400});
    }

    // กลุ่มนี้มีอยู่จริงไหม
    const groupResult = await pool.query(
      `SELECT id
       FROM groups
       WHERE id = $1`,
      [groupId]
    );

    if (groupResult.rowCount === 0) {
      return NextResponse.json({message: 'ไม่พบกลุ่มนี้'}, {status: 404});
    }

    // คนที่ขอเชิญ มีสิทธิ์ไหม
    const requesterResult = await pool.query(
      `SELECT role
       FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, auth.userId]
    );

    if (requesterResult.rowCount === 0) {
      return NextResponse.json(
        {message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้'},
        {status: 403}
      );
    }

    if (requesterResult.rows[0].role !== 'admin') {
      return NextResponse.json(
        {message: 'เฉพาะแอดมินเท่านั้นที่เชิญสมาชิกได้'},
        {status: 403 }
      );
    }

    // หาผู้ใช้จากอีเมล
    const targetUserResult = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(email) = $1`,
      [email]
    );

    if (targetUserResult.rowCount === 0) {
      return NextResponse.json(
        {message: 'ไม่พบผู้ใช้ที่มีอีเมลนี้'},
        {status: 404}
        );
    }

    const targetUser = targetUserResult.rows[0];

    // อยู่ในกลุ่มอยู่แล้วหรือยัง 
    const duplicateResult = await pool.query(
      `SELECT 1
       FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, targetUser.id]
    );

    if (duplicateResult.rowCount > 0) {
      return NextResponse.json(
        { message: 'ผู้ใช้นี้อยู่ในกลุ่มแล้ว' },
        { status: 409 }
      );
    }

    // เพิ่มสมาชิกเข้ากลุ่ม
    const insertResult = await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING role, joined_at`,
      [groupId, targetUser.id, 'member']
    );

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
        },
      },{status: 201}
    );
    
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        {message: 'ผู้ใช้นี้อยู่ในกลุ่มแล้ว'},
        {status: 409}
      );
    }

    return NextResponse.json(
      {message: 'เกิดข้อผิดพลาด', error: error.message},
      {status: 500}
    );
  }
}