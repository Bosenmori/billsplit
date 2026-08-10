import { NextResponse } from 'next/server';

export async function GET() {
  const base_cur = "USD"
  const quote = "THB"
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base='+ base_cur + '&symbols='+quote);
  // const res = await fetch('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=THB');
  const data = await res.json();
  
  return NextResponse.json(data);

}
