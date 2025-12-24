"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, User, Mail, Calendar, Briefcase, Building, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Select, DatePicker } from "antd"
import dayjs from "dayjs"

// ==========================================
// Custom Toast Component
// ==========================================
interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

function CustomToast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-xl shadow-2xl backdrop-blur-md border ${
        type === 'success' 
          ? 'bg-green-500/90 border-green-400 text-white' 
          : 'bg-red-500/90 border-red-400 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <XCircle className="w-5 h-5 mr-3" />}
      <span className="font-medium text-sm">{message}</span>
    </motion.div>
  )
}

// ==========================================
// Form Schema & Component
// ==========================================
const registrationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  joiningDate: z.any().refine((val) => val, "Joining Date is required"),
})

type RegistrationSchema = z.infer<typeof registrationSchema>

interface RegistrationFormProps {
  onSuccess?: () => void
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  const router = useRouter()

  const {
    register: formRegister,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegistrationSchema>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
         // Default values if needed
    }
  })

  // Show validation errors as toasts
  useEffect(() => {
    const errorKeys = Object.keys(errors) as (keyof RegistrationSchema)[];
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0]]?.message;
      if (firstError) {
        setToast({ message: firstError as string, type: 'error' })
      }
    }
  }, [errors])

  const onSubmit = async (data: RegistrationSchema) => {
    setLoading(true)
    setToast(null)

    try {
      const payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
          department: data.department,
          joiningDate: dayjs(data.joiningDate).format('YYYY-MM-DD')
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (result.success) {
        setToast({ message: "Registration successful! Check your email for credentials.", type: 'success' })
        setTimeout(() => {
            if (onSuccess) onSuccess()
            else router.push("/auth/login")
        }, 3000)
      } else {
        setToast({ message: result.error || "Registration failed", type: 'error' })
      }
    } catch (err) {
      console.error(err)
      setToast({ message: "An error occurred. Please try again.", type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const inputClasses = "w-full pl-10 pr-4 py-3 border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white/60 backdrop-blur-sm shadow-sm text-gray-800 placeholder-gray-400 group-hover:border-blue-300"
  const labelClasses = "block text-xs font-bold text-gray-600 mb-1.5 ml-1 uppercase tracking-wider"
  const iconClasses = "absolute left-3 top-9 text-blue-500 w-5 h-5 z-10 pointer-events-none transition-transform group-focus-within:scale-110"

  return (
    <>
      <div className="w-full max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar p-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative group">
                    <label htmlFor="firstName" className={labelClasses}>First Name</label>
                    <User className={iconClasses} />
                    <input {...formRegister("firstName")} id="firstName" className={inputClasses} placeholder="John" />
                </div>

                <div className="relative group">
                    <label htmlFor="lastName" className={labelClasses}>Last Name</label>
                    <User className={iconClasses} />
                    <input {...formRegister("lastName")} id="lastName" className={inputClasses} placeholder="Doe" />
                </div>
            </div>

            <div className="relative group">
                <label htmlFor="email" className={labelClasses}>Email Address</label>
                <Mail className={iconClasses} />
                <input {...formRegister("email")} id="email" type="email" className={inputClasses} placeholder="john.doe@company.com" />
                <p className="text-[10px] text-gray-500 mt-1 ml-1 text-right">Credentials will be sent here</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative group">
                    <label className={labelClasses}>Role</label>
                    <Briefcase className="absolute left-3 top-9 text-blue-500 w-5 h-5 z-10 pointer-events-none" />
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                showSearch
                                placeholder="Select Role"
                                className="w-full h-[50px] custom-select-auth"
                                optionFilterProp="children"
                                filterOption={(input, option) => (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                            >
                                <Select.Option value="Intern">Intern</Select.Option>
                                <Select.Option value="Employee">Employee</Select.Option>
                                <Select.Option value="TL">Team Lead</Select.Option>
                                <Select.Option value="Manager">Manager</Select.Option>
                                <Select.Option value="HR">HR</Select.Option>
                                <Select.Option value="Admin">Admin</Select.Option>
                            </Select>
                        )}
                    />
                </div>

                <div className="relative group">
                    <label className={labelClasses}>Department</label>
                    <Building className="absolute left-3 top-9 text-blue-500 w-5 h-5 z-10 pointer-events-none" />
                    <Controller
                        name="department"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                showSearch
                                placeholder="Select Dept"
                                className="w-full h-[50px] custom-select-auth"
                                optionFilterProp="children"
                                filterOption={(input, option) => (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                            >
                                <Select.Option value="Engineering">Engineering</Select.Option>
                                <Select.Option value="Sales">Sales</Select.Option>
                                <Select.Option value="HR">HR</Select.Option>
                                <Select.Option value="Marketing">Marketing</Select.Option>
                                <Select.Option value="Finance">Finance</Select.Option>
                                <Select.Option value="Operations">Operations</Select.Option>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div className="relative group">
                <label className={labelClasses}>Joining Date</label>
                <Calendar className="absolute left-3 top-9 text-blue-500 w-5 h-5 z-10 pointer-events-none" />
                <Controller
                    name="joiningDate"
                    control={control}
                    render={({ field }) => (
                        <DatePicker 
                            {...field} 
                            className="w-full h-[50px] pl-10 rounded-xl border-gray-200/60 shadow-sm"
                            format="YYYY-MM-DD"
                        />
                    )}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 mt-4"
            >
                {loading ? (
                    <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Registering...
                    </>
                ) : (
                    "Register Employee"
                )}
            </button>
        </form>
      </div>

      <AnimatePresence>
        {toast && (
          <CustomToast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-select-auth .ant-select-selector {
            border-radius: 0.75rem !important; /* rounded-xl */
            height: 50px !important;
            padding-left: 3rem !important; /* Increased space for icon */
            display: flex !important;
            align-items: center !important;
            border-color: rgba(229, 231, 235, 0.6) !important;
            background-color: rgba(255, 255, 255, 0.6) !important;
            backdrop-filter: blur(4px);
        }
        .custom-select-auth .ant-select-selection-search {
            padding-left: 3rem !important;
        }
        .custom-select-auth .ant-select-selection-item,
        .custom-select-auth .ant-select-placeholder {
            padding-left: 2rem !important; /* Offset from the selector padding */
        }
        /* DatePicker Fixes */
        .ant-picker {
             background-color: rgba(255, 255, 255, 0.6) !important;
             backdrop-filter: blur(4px);
             border-radius: 0.75rem !important;
             height: 50px !important;
             padding-left: 3rem !important; /* Space for icon */
        }
        .ant-picker-input > input {
            font-size: 1rem !important; 
        }
      `}</style>
    </>
  )
}
