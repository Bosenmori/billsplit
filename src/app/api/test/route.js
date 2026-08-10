import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT name FROM users WHERE id = 1'
    );
    return NextResponse.json({ message: result.rows });
  } catch (error) {
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาด', error: error.message }
    );
  }
}