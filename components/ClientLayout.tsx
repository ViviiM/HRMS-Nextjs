"use client"

import { usePathname } from "next/navigation"
import { AppShell } from "./layout/AppShell"
import { SessionProvider } from "next-auth/react"

const PUBLIC_ROUTES = [
  "/", 
  "/auth/login", 
  "/auth/signup", 
  "/auth/forgot-password",
  "/auth/change-password", // Maybe public or separate layout?
  "/new-contact"
]

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if current route is public
  const isPublic = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith("/auth/")
  )

  return (
        isPublic ? (
            children
        ) : (
            <AppShell>{children}</AppShell>
        )
  )
}
