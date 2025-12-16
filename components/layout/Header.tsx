"use client"

import { useState } from "react"
import { Bell, Search, Menu, ChevronDown, User } from "lucide-react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 h-20 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
       <div className="flex items-center gap-4">
           <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
           >
               <Menu className="w-6 h-6" />
           </button>
           
           {/* Search Bar - Hidden on small screens */}
           <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500 transition-all shadow-sm w-96">
               <Search className="w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Search for employees, documents..." 
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-700"
               />
               <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50">
                   ⌘ K
               </div>
           </div>
       </div>

       <div className="flex items-center gap-4 sm:gap-6">
           {/* Notifications */}
           <button className="relative p-2 rounded-full text-slate-500 hover:bg-white hover:text-cyan-600 hover:shadow-md transition-all">
               <Bell className="w-5 h-5" />
               <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50"></span>
           </button>

           {/* Divider */}
           <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

           {/* User Profile */}
           <div className="relative">
               <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-1 pl-2 pr-4 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all"
               >
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                       {session?.user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4"/>}
                   </div>
                   <div className="hidden sm:block text-left">
                       <p className="text-sm font-bold text-slate-700 leading-none">{session?.user?.name || "User"}</p>
                       <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{session?.user?.role || "Employee"}</p>
                   </div>
                   <ChevronDown className="w-4 h-4 text-slate-400" />
               </button>

               {/* Dropdown Menu */}
               {profileOpen && (
                   <>
                       <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                       <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                           <div className="px-4 py-3 border-b border-slate-50 mb-2">
                               <p className="text-sm font-bold text-slate-800">{session?.user?.name}</p>
                               <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                           </div>
                           <a href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition">
                               <User className="w-4 h-4" /> My Profile
                           </a>
                           <button 
                                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                                className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                           >
                               <span className="scale-x-[-1]">➜</span> Sign Out
                           </button>
                       </div>
                   </>
               )}
           </div>
       </div>
    </header>
  )
}
