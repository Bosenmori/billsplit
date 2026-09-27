import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: 'ok', message: 'ออกจากระบบสำเร็จ' },{ status: 200 });
  response.cookies.delete('token');
  return response;
}