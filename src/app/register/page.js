'use client'

import Link from "next/link";
import { useState } from "react"

export default function Register(){
    const [form, setForm] = useState({name: '', email: '', password: ''})
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    function handleChange(e){
        setForm((prev) => ({...prev, [e.target.name]: e.target.value}))
    }
    async function handleSubmit(e){
        e.preventDefault();
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch('http://localhost:3000/api/auth/register',
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(form),
                }
            );
            const data = await res.json();
            setResult({ok: res.ok, data});
        } catch (error) {
            setResult({ok: false, message: error})
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex bg-black justify-center items-center min-h-screen">
            <div className="w-full max-w-sm">
                {/* <h2 className="text-zinc-50 text-1xl font-semibold">Bill Splitting App</h2> */}
                <Link 
                className="text-zinc-50 text-1xl font-semibold"
                href='/'
                >Bill Splitting App</Link>
                <h1 className="text-3xl text-zinc-50 mb-5 font-semibold">สมัครสมาชิก</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="text-zinc-400 block mb-2">ชื่อ</label>
                        <input
                        className="border-zinc-100 rounded-md bg-zinc-700 w-full h-7.5 text-white text-sm px-2" 
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="ชื่อ"
                    />
                    </div>
                    <div className="mb-4">
                        <label className="text-zinc-400 block mb-2">อีเมล</label>
                        <input
                        className="border-zinc-100 rounded-md bg-zinc-700 w-full h-7.5 text-white text-sm px-2"
                        name="email"
                        type="text"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                    />
                    </div>
                    <div className="mb-7">
                        <label className="text-zinc-400 block mb-2">รหัสผ่าน</label>
                        <input
                        className="border-zinc-100 rounded-md bg-zinc-700 w-full h-7.5 text-white text-sm px-2"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        placeholder="อย่างน้อย 6 ตัว"
                        minLength={6}
                    />
                    </div>
                    <div className="mb-4 flex justify-center">
                        <button 
                        className="w-full h-7 rounded-md bg-white disabled:opacity-50"
                        type="submit"
                        disabled={loading}
                        >
                            {loading ? 'กำลังโหลด. . .':'สมัครสมาชิก'}
                            </button>
                        </div>
                </form>
                 {result && result.ok &&(
                        <div className="bg-green-950 w-full p-2 rounded-sm">
                            <p className=" text-green-500 ">✅ สมัครสมาชิกสำเร็จ</p>
                            <p className=" text-white">userId:{' '}{result.data.user?.id} email:{' '}{result.data.user?.email}</p>
                        </div>
                    ) }
                    {result && !result.ok &&(
                        <div className="bg-red-950 w-full p-2 rounded-sm ">
                            <p className="text-red-500">❌ เกิดข้อผิดพลาด</p>
                            <p className="text-white">{result.data.message ?? 'เกิดข้อผิดพลาด'}</p>
                        </div>
                    ) }
                <div>
                        <p className="text-sm text-zinc-500 text-center mt-6">
                            มีบัญชีอยู่แล้ว?{' '}
                            <a href="/login" className=" dark:text-blue-400 underline">
                            เข้าสู่ระบบเลย
                            </a>
                        </p>
                    </div>
               
            </div>
        </div>
    )
}