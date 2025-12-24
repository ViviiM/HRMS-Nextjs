"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/auth"
import { motion } from "framer-motion"
import { Loader2, Mail, Lock, LogIn } from "lucide-react"

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await login({ employeeId, password })
      console.log('result ,', result)
      if (result.success) {
        router.push("/dashboard")
      } else {
        setError(result.error || "Login failed")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputClasses = "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white/50 backdrop-blur-sm"
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1"
  const iconClasses = "absolute left-3 top-10 text-gray-400 w-5 h-5 z-10 pointer-events-none"

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
             <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <div className="relative group">
          <label htmlFor="employeeId" className={labelClasses}>
            Employee ID
          </label>
          <Mail className={iconClasses} />
          <input
            id="employeeId"
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="EMP-1001"
            className={inputClasses}
            required
          />
        </div>

        <div className="relative group">
          <label htmlFor="password" className={labelClasses}>
            Password
          </label>
          <Lock className={iconClasses} />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClasses}
            required
          />
        </div>

        <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Remember me
            </label>
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Forgot password?</a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {loading ? (
             <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <>
                <LogIn className="mr-2 h-5 w-5" /> Sign In
            </>
          )}
        </button>
      </form>

      {/* <div className="mt-8 text-center text-sm text-gray-500">
        <p>Demo credentials: any@email.com / password</p>
      </div> */}
    </motion.div>
  )
}
