"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Upload, User, Mail, MapPin, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

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
const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const registrationSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  // profilePhoto: z
  //   .any()
  //   .optional()
  //   .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
  //   .refine(
  //     (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
  //     ".jpg, .jpeg, .png and .webp files are accepted."
  //   ),
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
    formState: { errors },
  } = useForm<RegistrationSchema>({
    resolver: zodResolver(registrationSchema),
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
      const formData = new FormData()
      formData.append("firstName", data.firstName)
      formData.append("lastName", data.lastName)
      formData.append("email", data.email)
      formData.append("address", data.address)
      // if (data.profilePhoto?.[0]) {
      //   formData.append("profilePhoto", data.profilePhoto[0])
      // }

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()

      if (result.success) {
        setToast({ message: "Account created! Check your email for credentials.", type: 'success' })
        setTimeout(() => {
            if (onSuccess) onSuccess()
            else router.push("/auth/login")
        }, 2000)
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

            <div className="relative group">
                <label htmlFor="address" className={labelClasses}>Employee Address</label>
                <MapPin className={iconClasses} />
                <textarea 
                    {...formRegister("address")} 
                    id="address" 
                    className={`${inputClasses} min-h-[80px] pt-3 resize-none`} 
                    placeholder="123 Corporate Blvd, Tech City, CA" 
                />
            </div>

            {/* <div className="relative group">
                <label htmlFor="profilePhoto" className={labelClasses}>Profile Photo</label>
                <div className="mt-1 flex justify-center px-6 py-6 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50/50 transition bg-white/40 backdrop-blur-sm group-hover:border-blue-400 cursor-pointer relative overflow-hidden">
                    <div className="space-y-2 text-center relative z-10">
                        <Upload className="mx-auto h-10 w-10 text-blue-500 group-hover:scale-110 transition-transform" />
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label
                                htmlFor="profilePhoto"
                                className="relative cursor-pointer rounded-md font-bold text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                                <span>Upload Photo</span>
                                <input {...formRegister("profilePhoto")} id="profilePhoto" type="file" className="sr-only" accept="image/*" />
                            </label>
                        </div>
                        <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                    </div>
                </div>
            </div> */}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 mt-4"
            >
                {loading ? (
                    <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Creating Employee Record...
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
    </>
  )
}
