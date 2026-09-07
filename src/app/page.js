'use client'

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";



export default function Home(){
    const router = useRouter();
    const [user, setUser] = useState({});
    const [checked, setChecked] = useState(false);
    useEffect(()=> {
      const token = localStorage?.getItem('token');
      const stored = JSON.parse(localStorage.getItem('user'));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser((prev) => ({...prev,
        stored,token
      }))
      if (token && stored) {
        setChecked(true);
      }
    },[])


    function handleLogout(){
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
    if(!checked){return(
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
  //   if(checked){return(
  //     <div className="flex bg-black min-h-screen justify-center items-center">
  //       <div className="flex flex-col gap-y-2 items-center">
  //         <h1 className="text-zinc-50 text-3xl">Bill Splitting App</h1>
  //         <h2 className="text-zinc-400"> สวัสดี {user.stored.email}</h2>
  //         <div>
  //           <button
  //           className="p-1 text-sm text-zinc-500"
  //           onClick={handleLogout}
            
  //           >Logout</button>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }
  if (checked) { return(
    <div className="flex min-h-screen bg-black justify-center">
      <div className="w-full max-w-lg">
            <div className="flex justify-between  mt-6">
              <div>
              <p className="text-zinc-50 ">สวัสดี</p>
              <h1 className="text-zinc-50">{' '}{user.stored.name}</h1>
              </div>
              
              <button
                className="text-zinc-50"
                onClick={handleLogout}
              >
                ออกจากระบบ
              </button>
            </div>


          
      </div>
    </div>


  )
    
  }

}