'use client'
import Link from "next/link"
import { useRouter } from "next/navigation";
import { useEffect } from "react";




export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const user = (JSON.parse(localStorage.getItem('user')) ?? undefined)
      if (user) {
        router.push('/home')
      }
    } catch (error) {
      console.error(error)
    }
  }, [router])

    return (
      <div className="flex bg-black min-h-screen justify-center items-center">
        <div className="flex flex-col gap-y-2 items-center">
          <h1 className="text-zinc-50 text-3xl">Bill Splitting App</h1>
          <p className="text-zinc-400 text-base">กรุณาเข้าสู่ระบบก่อนใช้งาน</p>
          <Link
            className="text-zinc-300 text-sm underline hover:text-zinc-50"
            href='/login'>เข้าสู่ระบบ</Link>
        </div>
      </div>
    )
  
}