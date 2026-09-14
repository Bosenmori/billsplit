import { verifyAuth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
    const auth = verifyAuth(request)
    if (!auth.success) {
        return NextResponse.json({message: auth.message},{status: 401})
    }
    try {
        const body = await request.json()
        const groupResult = await pool.query(`
            INSERT INTO groups (name, created_by)
            VALUES ($1, $2)
            RETURNING *
            `,[body.name, auth.userId])
        
        const newGroup = groupResult.rows[0];
        
        await pool.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, $3)
            `,[newGroup.id, newGroup.created_by, 'admin'])

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
   
    // // const groupResult = await pool.query(`
    // //     SELECT
    // //     FROM groups g
        
    // //     `)


    // return NextResponse.json({email: auth.email, userId: auth.userId}, {status: 201})
}