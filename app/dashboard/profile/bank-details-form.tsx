"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
import { Save, Loader2, Landmark, CreditCard, Hash, FileText } from "lucide-react"

const bankDetailsSchema = z.object({
  bankName: z.string().min(3, "Bank Name must be at least 3 characters"),
  accountNumber: z.string().min(8, "Account Number must be at least 8 digits").regex(/^\d+$/, "Account Number must be numeric"),
  ifscRouting: z.string().min(4, "IFSC / Routing Number is required"),
  upiAchId: z.string().optional(),
  panSsn: z.string().min(5, "PAN / SSN is required"),
  isPrimary: z.boolean().default(false),
})

type BankDetailsSchema = z.infer<typeof bankDetailsSchema>

export default function BankDetailsForm() {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: "", text: "" })

    // Mock initial data - in a real app this would come from props or API
    const initialData: BankDetailsSchema = {
        bankName: "HDFC Bank",
        accountNumber: "123456789012",
        ifscRouting: "HDFC0001234",
        upiAchId: "john@hdfc",
        panSsn: "ABCDE1234F",
        isPrimary: true
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<BankDetailsSchema>({
        resolver: zodResolver(bankDetailsSchema),
        defaultValues: initialData
    })

    const onSubmit = async (data: BankDetailsSchema) => {
        setLoading(true)
        setMessage({ type: "", text: "" })
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        console.log("Saving bank details:", data)
        setLoading(false)
        setIsEditing(false)
        setMessage({ type: "success", text: "Bank details updated successfully!" })
    }

    const inputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:text-gray-500"
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1"

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Bank Details</h2>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Edit Details
                    </button>
                )}
            </div>

            <div className="p-6">
                {message.text && (
                    <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>Bank Name</label>
                            <div className="relative">
                                <Landmark className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    {...register("bankName")} 
                                    disabled={!isEditing} 
                                    className={`${inputClasses} pl-10`} 
                                    placeholder="Enter Bank Name"
                                />
                            </div>
                            {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName.message}</p>}
                        </div>

                        <div>
                            <label className={labelClasses}>Account Number</label>
                             <div className="relative">
                                <CreditCard className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    {...register("accountNumber")} 
                                    disabled={!isEditing} 
                                    className={`${inputClasses} pl-10`} 
                                    placeholder="Enter Account Number"
                                />
                            </div>
                            {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber.message}</p>}
                        </div>

                        <div>
                            <label className={labelClasses}>IFSC / Routing Number</label>
                             <div className="relative">
                                <Hash className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    {...register("ifscRouting")} 
                                    disabled={!isEditing} 
                                    className={`${inputClasses} pl-10`} 
                                    placeholder="Enter IFSC / Routing"
                                />
                            </div>
                            {errors.ifscRouting && <p className="text-red-500 text-xs mt-1">{errors.ifscRouting.message}</p>}
                        </div>

                         <div>
                            <label className={labelClasses}>UPI / ACH ID</label>
                             <div className="relative">
                                <CreditCard className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    {...register("upiAchId")} 
                                    disabled={!isEditing} 
                                    className={`${inputClasses} pl-10`} 
                                    placeholder="user@bank"
                                />
                            </div>
                            {errors.upiAchId && <p className="text-red-500 text-xs mt-1">{errors.upiAchId.message}</p>}
                        </div>

                        <div>
                            <label className={labelClasses}>PAN / SSN</label>
                             <div className="relative">
                                <FileText className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input 
                                    {...register("panSsn")} 
                                    disabled={!isEditing} 
                                    className={`${inputClasses} pl-10`} 
                                    placeholder="Enter PAN / SSN"
                                />
                            </div>
                            {errors.panSsn && <p className="text-red-500 text-xs mt-1">{errors.panSsn.message}</p>}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="isPrimary" 
                            {...register("isPrimary")} 
                            disabled={!isEditing}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <label htmlFor="isPrimary" className="text-sm text-gray-700">Set as Primary Salary Account</label>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                             <button
                                type="button"
                                onClick={() => {
                                    reset(initialData)
                                    setIsEditing(false)
                                    setMessage({ type: "", text: "" })
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
