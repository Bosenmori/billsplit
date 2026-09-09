
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from 'bcrypt'

export async function POST(request) {
    try {
        const body = await request.json();
        const { email:rawEmail, name, password} = body
        const email = rawEmail?.trim().toLowerCase();
        if (!name || !rawEmail || !password) {
            return NextResponse.json({message: 'กรอกชื่อ อีเมล และรหัสผ่าน'},{status: 400})
        }
    
        const exist = await pool.query(`
            SELECT id
            FROM users
            WHERE email = $1
            `,[email])

        if (exist.rowCount > 0){
            return NextResponse.json({message: 'มีอีเมลนี้อยู่แล้ว'},{status: 401})
        }
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email
            `,[name, email, passwordHash])

            return NextResponse.json({message: 'สมัครสมาชิกสำเร็จ', user: result.rows[0]},{status:201})   
    } catch (error) {
        return NextResponse.json({message: error.message},{status: 405})
    }
    
}