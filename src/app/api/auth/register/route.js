import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const {name, email: rawEmail, password} = await request.json();
    const email = rawEmail?.trim().toLowerCase();
    //เช็คว่ากรอกครบไหม
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          status: 'error', message: 'กรอกชื่อ อีเมล และรหัสผ่าน'
        },{status: 400}
      );
    }

    //เช็คว่าอีเมลนี้เคยสมัครไปแล้วหรือยัง 
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        {status: 'error', message: 'อีเมลนี้ถูกใช้สมัครไปแล้ว'
        },{status: 409}
      );
    }

    //เข้ารหัสรหัสผ่านก่อนเก็บ
    const passwordHash = await bcrypt.hash(password, 10);

    // บันทึกลง database
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`, [name, email, passwordHash]
    );

    return NextResponse.json(
      {
        status: 'ok', message: 'สมัครสมาชิกสำเร็จ', user: result.rows[0]
      },
      {status: 201}
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error', message: 'สมัครสมาชิกไม่สำเร็จ', error: err.message},
      {status: 500}
    );
  }
}