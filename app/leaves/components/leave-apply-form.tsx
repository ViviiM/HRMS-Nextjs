"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveApplyFormProps {
  onSuccess?: () => void;
}

export default function LeaveApplyForm({ onSuccess }: LeaveApplyFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm();
  
  const isHalfDay = watch("halfDay");
  const leaveType = watch("leaveType");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  // Auto-set End Date if Half Day
  useEffect(() => {
    if (isHalfDay && startDate) {
        setValue("endDate", startDate);
    }
  }, [isHalfDay, startDate, setValue]);

  // Calculate Days for display
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays > 0 ? diffDays : 0;
  };
  
  const totalDays = calculateDays();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Re-enforce logic before submit
      const finalEndDate = data.halfDay ? data.startDate : data.endDate;
      const finalTotalDays = data.halfDay ? 0.5 : totalDays;

      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...data,
            endDate: finalEndDate,
            totalDays: finalTotalDays
        })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setShowSuccess(true);
        // Reset form after delay
        setTimeout(() => {
            setShowSuccess(false);
            reset();
            if (onSuccess) onSuccess();
        }, 3000);
      } else {
        toast.error(result.error || "Failed to submit leave", {
            style: { background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }
        });
      }
    } catch (e) {
      toast.error("An error occurred while submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 p-3 transition-all duration-200 outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2";

  if (showSuccess) {
      return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-[500px] p-8 text-center bg-white/80 backdrop-blur-md rounded-2xl border border-green-100 shadow-xl"
          >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
              >
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Leave Applied Successfully!</h3>
              <p className="text-gray-600 max-w-sm">
                  Your leave request has been sent to HR for approval. You will be notified via email once processed.
              </p>
          </motion.div>
      )
  }

  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      
      <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Apply for Leave
            </h3>
            <p className="text-gray-500 text-sm mt-1">Submit your leave request for approval</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Calendar className="w-5 h-5" />
          </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Leave Type */}
        <div className="space-y-1">
          <label className={labelClass}>
              <FileText className="w-4 h-4 text-blue-500" />
              Leave Type
          </label>
          <div className="relative">
            <select 
                {...register("leaveType", { required: true })}
                className={inputClass}
            >
                <option value="">Select Type</option>
                <option value="Casual">Casual Leave 🌴</option>
                <option value="Sick">Sick Leave 🤒</option>
                <option value="Earned">Earned Leave 📅</option>
                <option value="Unpaid">Unpaid Leave 🚫</option>
            </select>
          </div>
          {errors.leaveType && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Type is required</p>}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1">
              <label className={labelClass}>From</label>
              <input 
                type="date" 
                {...register("startDate", { required: true })}
                className={inputClass}
                min={new Date().toISOString().split('T')[0]}
              />
               {errors.startDate && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Required</p>}
           </div>

           <div className="space-y-1">
              <label className={labelClass}>To</label>
              <input 
                type="date" 
                {...register("endDate", { required: true })}
                className={`${inputClass} ${isHalfDay ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                min={startDate || new Date().toISOString().split('T')[0]}
                disabled={isHalfDay}
              />
              {errors.endDate && !isHalfDay && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Required</p>}
           </div>
        </div>
        
        {/* Total Days Display */}
        {totalDays > 0 && (
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center gap-2 text-sm text-blue-700 font-medium">
                <Clock className="w-4 h-4" />
                Duration: {totalDays} Day{totalDays !== 1 ? 's' : ''}
            </div>
        )}

        {/* Half Day & Session */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isHalfDay ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                        <input 
                        type="checkbox" 
                        id="halfDay" 
                        {...register("halfDay")}
                        className="opacity-0 absolute w-5 h-5 cursor-pointer"
                        />
                        {isHalfDay && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <label htmlFor="halfDay" className="text-sm font-medium text-gray-700 cursor-pointer select-none">Half Day Request</label>
                </div>
                {isHalfDay && <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-100 rounded-lg">Half Day Selected</span>}
            </div>

            <AnimatePresence>
                {isHalfDay && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-2 border-t border-blue-100">
                            <label className={labelClass}>Select Session</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="cursor-pointer">
                                    <input type="radio" value="Session 1" {...register("session")} className="peer sr-only" />
                                    <div className="p-3 rounded-lg border border-gray-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all text-center">
                                        <div className="font-medium text-sm">Session 1</div>
                                        <div className="text-xs text-gray-500">First Half</div>
                                    </div>
                                </label>
                                <label className="cursor-pointer">
                                    <input type="radio" value="Session 2" {...register("session")} className="peer sr-only" />
                                    <div className="p-3 rounded-lg border border-gray-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all text-center">
                                        <div className="font-medium text-sm">Session 2</div>
                                        <div className="text-xs text-gray-500">Second Half</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Reason */}
        <div className="space-y-1">
           <label className={labelClass}>Reason for Leave</label>
           <textarea 
             {...register("reason", { required: true, minLength: 10 })}
             className={`${inputClass} min-h-[120px] resize-none`}
             placeholder="Please describe why you need this leave..."
           />
           {errors.reason && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Reason is required (min 10 chars)</p>}
        </div>

        <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Request...
                </>
            ) : (
                <>
                    Submit Application
                    <CheckCircle2 className="w-5 h-5" />
                </>
            )}
        </button>

      </form>
    </motion.div>
  );
}
