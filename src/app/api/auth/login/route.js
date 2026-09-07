import { NextResponse } from "next/server";
import bcrypt from 'bcrypt';
import pool from "@/lib/db";
import jwt from 'jsonwebtoken';

export async function POST(request){
    try {
        const body = await request.json();
        const {email:rawEmail, password} = body;
        
        if (!rawEmail || !password) {
            return NextResponse.json({message: 'ใส่อีเมลและรหัสผ่าน'}, {status: 400})
        }
        const email = rawEmail.trim().toLowerCase();
        
        const exist = await pool.query(`
            SELECT password_hash, id, email, name
            FROM users
            WHERE email = $1
            `,[email])
        
        if (exist.rowCount === 0) {
            return NextResponse.json({message: 'ไม่มีอีเมลนี้'}, {status: 402})
         } 
         
        const passwordHash = exist.rows[0].password_hash;

        const matchPassword = await bcrypt.compare(password, passwordHash);
         if (!matchPassword) {
            return NextResponse.json({message: 'รหัสผ่านไม่ถูกต้อง'},{status: 401})
         }

        const result = {id: exist.rows[0].id, email: exist.rows[0].email, name: exist.rows[0].name}

        const token = jwt.sign(
            {userId: result.id, email: result.email, name: result.name},
            process.env.JWT_SECRET,
            {expiresIn: '7d'}
        )

         return NextResponse.json({message: 'ถูกต้อง', user: result, token},{status: 201})
    } catch (error) {
        
    }
} 