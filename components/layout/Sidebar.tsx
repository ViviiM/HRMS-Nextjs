"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  Briefcase, 
  BookOpen, 
  Shield, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Employees", href: "/employees" },
  { icon: Calendar, label: "Leaves", href: "/leaves" },
  { icon: CreditCard, label: "Payroll", href: "/payroll" },
  { icon: Briefcase, label: "Assets", href: "/assets" },
  // { icon: FileText, label: "Documents", href: "/documents" }, // Removed as per request
  { icon: BookOpen, label: "Training", href: "/training" },
  { icon: Shield, label: "NDA & Policies", href: "/nda" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Overlay */}
      <div 
          className={cn(
            "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
            "fixed top-0 left-0 z-50 h-screen w-72 bg-white text-slate-900 border-r border-slate-200 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
            {/* Logo Area */}
            <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-200 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
                    <Image src="/mv_logo.png" alt="Logo" width={24} height={24} className="object-contain brightness-0 invert" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    MV Portal
                </span>
                <button 
                    onClick={() => setIsOpen(false)} 
                    className="ml-auto lg:hidden text-slate-500 hover:text-slate-900"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation */}
            <div className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-3 mt-2">Main Menu</div>
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    const itemId = `tour-${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`
                    return (
                        <Link 
                            key={item.href} 
                            href={item.href}
                            onClick={() => setIsOpen(false)} // Close on mobile navigation
                        >
                            <div 
                                id={itemId}
                                className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                                isActive 
                                    ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-semibold" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}>
                                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600")} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-600 rounded-l-full" />
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                 <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                     <LogOut className="w-5 h-5" />
                     <span>Sign Out</span>
                 </button>
            </div>
        </div>
      </aside>
    </>
  )
}
