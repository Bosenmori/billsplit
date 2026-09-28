import { NextResponse } from 'next/server'

export function proxy(request) {

  const token = request.cookies.get('token')?.value;
  if (!token) {
    //console.log('ยังไม่ได้login')
    return NextResponse.redirect(new URL('/login', request.url))
  } else {
    //console.log('loginแล้ววววววววว')
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/home', '/groups/:path*']
}