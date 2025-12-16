"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import LoginForm from "./login-form"
import RegistrationForm from "./registration-form"
import { Sparkles } from "lucide-react"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4 relative overflow-hidden">
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-blue-900/90 backdrop-blur-xs"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* Left Side (Branding) */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-600/80 to-indigo-700/80 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            
            <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-sm p-2">
                     <img src="/mv_logo.png" alt="MV Portal Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-3xl font-bold mb-2">MV Portal</h1>
                <p className="text-blue-100 text-sm">Next Generation HR Management</p>
            </div>

            <div className="relative z-10 mt-12 md:mt-0">
                <h2 className="text-xl font-semibold mb-4 text-white/90">
                    {isLogin ? "Welcome Back!" : "Join Us Today"}
                </h2>
                <p className="text-blue-100 text-sm mb-8 leading-relaxed">
                    {isLogin 
                        ? "Streamline your workforce management with our advanced HR solutions. Sign in to access your dashboard." 
                        : "Create an account to start managing your employee data, payroll, and more with ease."}
                </p>
                
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="group flex items-center text-sm font-semibold text-white bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg transition-all border border-white/30"
                >
                    {isLogin ? "Create an Account" : "Sign In instead"}
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>
        </div>

        {/* Right Side (Form) */}
        <div className="md:w-7/12 bg-white/95 p-8 md:p-12 relative">
           <div className="max-w-md mx-auto h-full flex flex-col justify-center">
             <div className="mb-8">
                 <h2 className="text-2xl font-bold text-gray-800">{isLogin ? "Sign In" : "New Registration"}</h2>
                 <p className="text-gray-500 text-sm mt-1">
                     {isLogin ? "Access your account using your email." : "Enter your details to register."}
                 </p>
             </div>

             <AnimatePresence mode="wait">
                {isLogin ? (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <LoginForm />
                    </motion.div>
                ) : (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <RegistrationForm onSuccess={() => setIsLogin(true)} />
                    </motion.div>
                )}
             </AnimatePresence>
           </div>
        </div>

      </motion.div>
    </div>
  )
}
