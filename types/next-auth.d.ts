import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      employeeId: string
      role: string
      department: string
      sfId: string
      isTemporaryPassword?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    department: string
    sfId: string
    isTemporaryPassword?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    department: string
    employeeId: string
    sfId: string
    isTemporaryPassword?: boolean
  }
}
